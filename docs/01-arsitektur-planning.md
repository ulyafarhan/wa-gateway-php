# Bagian 1: Arsitektur & Planning

## 1. Arsitektur Sistem Optimasi

### Diagram Arsitektur Overall

```
┌────────────────────────────────────────────────────────────────────┐
│                          VPS — 414MB RAM                           │
│                                                                     │
│  ┌────────────────┐    ┌─────────────────────────────────────────┐ │
│  │   WARP Tunnel   │    │         Node.js Process (128MB heap)   │ │
│  │   (~65MB RSS)   │    │                                         │ │
│  └───────┬─────────┘    │  ┌──────────┐  ┌────────────────────┐  │ │
│          │              │  │          │  │   Baileys Socket    │  │ │
│          │              │  │ Express5 ├──┤   Pool (N sessions) │  │ │
│          │              │  │ (2-3MB)  │  │   (~8-15MB/conn)   │  │ │
│          │ HTTPS        │  │          │  └────────────────────┘  │ │
│          ├──────────────┤  └────┬─────┘                           │ │
│          │              │       │                                  │ │
│          │              │  ┌────▼───────────────────────────┐     │ │
│          │              │  │   SQLite (WAL, better-sqlite3) │     │ │
│          │              │  │   22 tables, 70+ stmts cached  │     │ │
│          │              │  └────────────┬────────────────────┘     │ │
│          │              │               │                           │ │
│  ┌───────┴─────────┐    │  ┌────────────▼────────────────────┐     │ │
│  │  Client Apps     │    │  │   Background Workers            │     │ │
│  │  (Vue 3 FE, API) ◄────┼──►   webhook.js (retry+deadletter) │     │ │
│  └─────────────────┘    │  │   broadcast.js (scheduler)      │     │ │
│                         │  │   sync.js (→Supabase + D1)      │     │ │
│                         │  │   behavior/ (AI+timing+persona) │     │ │
│                         │  └────────────────────────────────┘     │ │
│                         └────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ 2GB Swap (358MB used)                                      │    │
│  └────────────────────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────────────────┘
```

### Layer Arsitektur

| Layer | Komponen | Bahasa/Runtime | Alokasi RAM |
|-------|----------|----------------|-------------|
| **Tunnel** | Cloudflare WARP | Sistem | ~65MB |
| **Web Server** | Express 5 + EJS views | Node.js v24 | ~2-3MB |
| **WhatsApp Engine** | Baileys socket pool | Node.js | ~8-15MB/session |
| **Database** | SQLite (better-sqlite3) | Native addon | ~5-10MB (cache) |
| **Replica** | Supabase REST + D1 API | Remote | 0MB (network) |
| **Background** | Webhook retry, broadcast, sync, behavior | Node.js | ~10MB |
| **Frontend** | Vue 3 SPA (served statis) | Browser | 0MB (server) |

### Alur Request End-to-End

```
Client (Vue 3 / API Client)
  │
  ▼
Cloudflare WARP (TLS termination, DDoS protection)
  │
  ▼
Express 5 (cookie-parser → helmet → cors → authMiddleware)
  │
  ├── SSR Routes (/dashboard, /sessions, etc.) → EJS render → HTML
  │     └── requireAuth (JWT cookie) → getStats → render
  │
  └── REST API Routes (/api/*)
        └── authMiddleware (API key / JWT Bearer)
              ├── GET    → db.prepare().all()/.get()
              ├── POST   → validasi → db write → enqueue/track
              ├── PUT    → db write
              └── DELETE → db write + cleanup
                    │
                    ▼
              Background sync (fire-and-forget):
              ├── webhook.js → HTTP POST ke client webhook
              ├── broadcast.js → queue → Baileys sendMessage
              └── sync.js → Supabase REST + D1 REST
```

### Diagram State Machine Session

```
         ┌──────────────┐
         │ disconnected │ ←── initial state
         └──────┬───────┘
                │ connectSession()
                ▼
         ┌──────────────┐
    ┌───►│  connecting   │
    │    └──────┬───────┘
    │           │
    │     ┌─────┴──────┐
    │     │            │
    │     ▼            ▼
    │ ┌────────┐  ┌──────────┐
    │ │connected│  │waiting_qr│ ←── QR display
    │ └───┬────┘  └─────┬────┘
    │     │              │ (scan success)
    │     │              ▼
    │     │         ┌──────────┐
    │     │         │connecting│ (restartRequired)
    │     │         └────┬─────┘
    │     │              │
    │     │              ▼
    │     │          ┌──────────┐
    │     └─────────►│ connected│
    │                 └───┬─────┘
    │                     │
    │     disconnect/     │
    │     error/timeout   │
    │     │               │
    │     ▼               │
    │ ┌──────────┐        │
    │ │reconnecting│◄─────┘
    │ └─────┬────┘
    │       │ exponential backoff
    │       │ 1s → 2s → 4s → ... → 300s
    └───────┘
    
    loggedOut/device_removed:
    ┌────────────┐
    │delete auth │
    │state + stop│
    └────────────┘
```

---

## 2. Optimasi Sistem untuk RAM 414MB

### 2.1 Memory Budget Saat Ini

| Komponen | Estimasi RAM |
|----------|-------------|
| WARP (warp-svc) | ~65MB |
| Node.js (heap 128MB) | ~45-60MB RSS |
| Baileys sockets (N session × 10MB) | ~10-80MB |
| SQLite (WAL + cache) | ~5-10MB |
| OS + swap (2GB, 358MB used) | ~200MB |
| **Total perkiraan** | **~350-400MB** |

### 2.2 Strategi Minimalisasi Memori

**A. Node.js Heap Tuning (SUDAH)**

```bash
# server.mjs atau systemd service
ExecStart=/usr/bin/node --max-old-space-size=128 server.mjs
# atau: --max-old-space-size=96 jika masih overload
```

**B. GC Optimization**

```javascript
// Tambahkan di server.mjs — aktifkan GC setiap 5 menit di luar jam sibuk
// ponytail: periodic GC — 414MB VPS, heap 128MB
setInterval(() => {
  if (global.gc) {
    global.gc();
    logger.debug('Manual GC triggered');
  }
}, 300000); // 5 menit
```

**C. Baileys Connection Pooling**

Baileys adalah pemakan RAM terbesar. Setiap socket menyimpan:
- Auth state (creds + keys serialized) → ~1-3MB
- WebSocket buffer → ~2-5MB
- Message cache → ~2-5MB

```javascript
// Strategi: batasi session aktif berdasarkan RAM tersedia
const MAX_SESSIONS = Math.max(1, Math.floor((os.freemem() - 50 * 1024 * 1024) / (15 * 1024 * 1024)));
// ponytail: ~15MB per session, sisakan 50MB untuk OS+Node
```

**D. SQLite Optimization (SUDAH)**

```javascript
// ✅ Already optimal:
db.pragma('journal_mode = WAL');     // Concurrent read + write
db.pragma('synchronous = NORMAL');   // Balance speed/safety
db.pragma('cache_size = -4000');     // ~4MB page cache
```

**Tambahan:**

```javascript
// ✅ Tambahkan:
db.pragma('wal_autocheckpoint = 500');  // Flush WAL setiap 500 pages (~4MB)
db.pragma('page_size = 4096');           // 4KB pages — optimal untuk RAM kecil
db.pragma('temp_store = MEMORY');        // Temp tables di memory (lebih cepat)
db.pragma('mmap_size = 268435456');      // Memory-map 256MB — akses lebih cepat
db.pragma('busy_timeout = 5000');        // 5 detik timeout sebelum SQLITE_BUSY
```

**E. WAL Journal Size Limit**

```javascript
// PRAGMA wal_checkpoint → periodic manual checkpoint untuk cegah WAL membengkak
// ponytail: periodic WAL checkpoint — cegah WAL file >10MB
setInterval(() => {
  db.pragma('wal_checkpoint(TRUNCATE)');
}, 600000); // 10 menit
// Eksekusi saat idle (low traffic hours: 02:00-04:00)
```

**F. Connection Pooling (better-sqlite3)**

**Keputusan: TIDAK PERLU pooling.** `better-sqlite3` sudah synchronous — hanya 1 koneksi yang dipakai sequential. Pooling `better-sqlite3` malah menambah kompleksitas tanpa benefit. Pooling diperlukan hanya untuk database client-server (PostgreSQL/MySQL).

### 2.3 Swap Tuning

```bash
# Cek current swap usage
swapon --show

# Optimal untuk 414MB RAM + 2GB swap:
# vm.swappiness = 10  (swap hanya jika >90% RAM terpakai)
# vm.vfs_cache_pressure = 50  (cache dipertahankan lebih lama)

# Tambahkan ke /etc/sysctl.conf:
echo "vm.swappiness=10" | sudo tee -a /etc/sysctl.conf
echo "vm.vfs_cache_pressure=50" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### 2.4 Rekomendasi WARP

WARP tidak bisa dimatikan (65MB). Opsi:
1. **Terima** — masih dalam budget (65 + 128 = 193MB, sisa 221MB untuk OS)
2. **Jika kritis:** migrate ke Cloudflare Tunnel standalone (cloudflared, ~20MB) — ganti WARP

### 2.5 Monitoring Memory

```javascript
// server.mjs — health endpoint + memory logging
import os from 'os';

function getMemoryStats() {
  const usage = process.memoryUsage();
  return {
    rss: Math.round(usage.rss / 1024 / 1024) + 'MB',
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024) + 'MB',
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + 'MB',
    external: Math.round(usage.external / 1024 / 1024) + 'MB',
    arrayBuffers: Math.round(usage.arrayBuffers / 1024 / 1024) + 'MB',
    systemFree: Math.round(os.freemem() / 1024 / 1024) + 'MB',
    systemTotal: Math.round(os.totalmem() / 1024 / 1024) + 'MB',
  };
}

// Log memory setiap 60 detik
setInterval(() => {
  const mem = getMemoryStats();
  logger.info(`[mem] RSS=${mem.rss} Heap=${mem.heapUsed}/${mem.heapTotal} Free=${mem.systemFree}`);
}, 60000);
```

### 2.6 Systemd Service (SUDAH — optimize)

```ini
[Service]
Type=simple
WorkingDirectory=/home/ubuntu/wa-gateway
ExecStart=/home/ubuntu/.nvm/versions/node/v24.18.0/bin/node --max-old-space-size=128 server.mjs
Restart=always
RestartSec=5
User=ubuntu
EnvironmentFile=/home/ubuntu/wa-gateway/.env

# ── OOM Score adjust — biarkan kernel kill proses lain dulu
OOMScoreAdjust=-500

# ── CPU limiting — cegah 100% CPU dari 1 session hang
CPUQuota=80%

# ── File descriptor limit — cukup untuk N Baileys sockets
LimitNOFILE=4096
```

---

## 3. Replikasi Data (SQLite → Supabase + Cloudflare D1)

### 3.1 Arsitektur Dual-Write

```
┌──────────────────────────────────────────────────────────────────────┐
│                         WA Gateway (SQLite)                          │
│                                                                       │
│  Write Path                                                          │
│  ├── TrackChange(table, id) — tandai row berubah                    │
│  └── syncImmediately(table, row) — untuk data kritis (fire-forget)  │
│                                                                       │
│  Sync Engine (periodik)                                              │
│  ├── flushToSupabase() — setiap 5 detik, batch per tabel            │
│  │   ├── Baca semua row dari changeLog                              │
│  │   ├── SELECT * FROM table WHERE id IN (changed)                  │
│  │   └── POST /rest/v1/{table} (upsert)                             │
│  │                                                                   │
│  └── flushToD1() — setiap 30 detik                                  │
│       └── INSERT/UPDATE via SQL API                                 │
└──────────────────────────────────────────────────────────────────────┘
```

### 3.2 Masalah Existing & Solusi

| Masalah | Detail | Solusi |
|---------|--------|--------|
| **Fullscan SELECT \*** | `SELECT * FROM ${table}` tanpa WHERE — baca SEMUA row setiap siklus | Ubah ke incremental sync: `SELECT * FROM ${table} WHERE updated_at > ?` |
| **ChangeLog tidak efektif** | `changeLog.clear()` di flush, lalu SELECT * lagi — redundant | Pakai `updated_at` sebagai watermark |
| **No retry** | `flushToSupabase` gagal → data hilang | Queue-based retry dengan dead letter |
| **Fire-and-forget but no callback** | Tidak tahu apakah sync berhasil | Logging + metric counter |

### 3.3 Implementasi Incremental Sync (Ganti Periodic Fullscan)

```javascript
// ── Watermark-based incremental sync ──────────────────────────────
const lastSyncMark = {}; // { table: timestamp }

async function flushToSupabaseIncremental() {
  const now = Date.now();
  if (now - lastSyncSupabase < SYNC_INTERVAL_SUPABASE) return;

  for (const [table, config] of Object.entries(SYNC_CONFIG)) {
    if (!config.supabase) continue;
    const watermark = lastSyncMark[table] || 0;

    // ponytail: incremental — hanya row dengan updated_at > watermark
    const rows = db.prepare(
      `SELECT * FROM ${table} WHERE updated_at > ? ORDER BY updated_at ASC LIMIT ?`
    ).all(watermark, BATCH_SIZE);

    if (rows.length > 0) {
      try {
        const converted = rows.map(r => convertForPostgres(r));
        await supabase.upsertRows(table, converted);
        // Update watermark ke timestamp row terakhir
        lastSyncMark[table] = Math.max(...rows.map(r => r.updated_at || r.created_at || 0));
      } catch (e) {
        console.error(`[sync] ${table} error: ${e.message}`);
        // ponytail: tidak clear watermark — retry di siklus berikutnya
      }
    }
  }

  lastSyncSupabase = now;
}
```

### 3.4 Data Konsistensi

| Strategi | Kapan | Trade-off |
|----------|-------|-----------|
| **Fire-and-forget** | Setiap write (via hook) | Cepat, best-effort, mungkin loss |
| **Periodic batch** | Setiap N detik | Konsisten eventual, latency N detik |
| **Full sync on restart** | Startup | Memastikan konsistensi setelah crash |

**Rekomendasi:** Kombinasi:
1. **Immediate sync** untuk `messages` (via `syncImmediately`) — data paling kritis
2. **Periodic batch** incremental untuk semua tabel lain — setiap 5-15 menit
3. **Full sync** saat startup — compare count, jika mismatch → full scan

### 3.5 Retry Policy

```javascript
// ponytail: exponential backoff untuk sync — 5s → 30s → 5m → 15m
const SYNC_RETRY = [
  { delay: 5000, label: '5s' },
  { delay: 30000, label: '30s' },
  { delay: 300000, label: '5m' },
  { delay: 900000, label: '15m' }, // last attempt
];

let syncRetryCount = 0;

async function flushWithRetry(table, rows, attempt = 0) {
  try {
    await supabase.upsertRows(table, rows);
    syncRetryCount = 0;
  } catch (e) {
    if (attempt >= SYNC_RETRY.length - 1) {
      // ponytail: dead letter — pindahkan ke tabel error log
      logSyncError(table, rows, e.message);
      return;
    }
    setTimeout(() => flushWithRetry(table, rows, attempt + 1), SYNC_RETRY[attempt].delay);
  }
}
```

---

## 4. Fault Tolerance

### 4.1 Graceful Shutdown (BELUM — perlu ditambahkan)

```javascript
// ponytail: graceful shutdown — kirim SIGHUP ke Baileys sockets
async function gracefulShutdown(signal) {
  logger.info(`[shutdown] Received ${signal}`);

  // 1. Stop accepting requests
  server.close(() => {
    logger.info('[shutdown] HTTP server closed');
  });

  // 2. Flush sync queue
  await flushToSupabase();

  // 3. Disconnect Baileys sockets
  for (const [id, session] of sessions.entries()) {
    if (session.sock) {
      try {
        session.sock.end();
        logger.info(`[shutdown] Session ${id} disconnected`);
      } catch (e) {
        logger.error(`[shutdown] Session ${id} error: ${e.message}`);
      }
    }
  }

  // 4. Close SQLite
  db.close();

  // 5. Exit
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // nodemon restart
```

### 4.2 Auto-Restart via Systemd (SUDAH — optimal)

```ini
Restart=always
RestartSec=5
```

Strategi:
- `Restart=always` → restart apapun exit code-nya
- `RestartSec=5` → beri waktu SQLite release lock
- **Monitor restart loops:** jika >5 restart dalam 60 detik, systemd akan throttle

### 4.3 Error Boundary di Express

```javascript
// ponytail: global error handler — jangan sampai server crash
app.use((err, req, res, next) => {
  logger.error(`[unhandled] ${err.message}`, { stack: err.stack?.split('\n')[0], path: req.path });

  // Jangan crash — kirim 500
  res.status(500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// ponytail: uncaughtException — jangan sampai process.exit kecuali fatal
process.on('uncaughtException', (err) => {
  logger.error(`[uncaughtException] ${err.message}`, { stack: err.stack });
  // Jangan exit — biarkan systemd handle jika perlu
});

process.on('unhandledRejection', (reason) => {
  logger.error(`[unhandledRejection] ${reason}`);
});
```

### 4.4 Crash Recovery Baileys Session

Setiap session memiliki state di **SQLite** (auth_state table + sessions table). Saat restart:

```javascript
// server.mjs (SUDAH — reconnect otomatis di startup)
app.listen(PORT, ... , () => {
  const existing = db.prepare('SELECT session_id FROM sessions').all();
  for (const { session_id } of existing) {
    connectSession(session_id).catch(e => logger.error(`[${session_id}] ${e.message}`));
  }
});
```

**Recovery flow:**
1. Server restart
2. Baca `SELECT session_id FROM sessions` 
3. `connectSession()` untuk setiap session
4. Baileys `auth` dari SQLite (creds + keys disimpan)
5. State machine: `disconnected → connecting → connected`
6. Jika QR expired → `waiting_qr` (user scan ulang)
7. Jika device_removed → delete auth, reconnect fresh

### 4.5 Error Handling Pattern

```javascript
// ponytail: pola try-catch konsisten untuk semua route async
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Usage:
router.get('/api/sessions/:id/status', requireTenantOwnership, asyncHandler(async (req, res) => {
  const status = getSessionStatus(req.params.id);
  if (!status) return res.status(404).json({ error: 'Session not found' });
  res.json(status);
}));
```

---

## 5. Database Normalisasi & Relasi

### 5.1 Entity Relationship Diagram (Text-based)

```
users 1──N user_sessions N──1 sessions
users 1──N api_keys
tenants 1──N sessions
tenants 1──1 tenant_packages
sessions 1──1 behavior_config
sessions 1──N messages
sessions 1──N webhook_outbox
sessions 1──N webhook_dead_letter
sessions 1──N user_profiles
sessions 1──N faq_entries
sessions 1──N template_entries
sessions 1──N auth_state
broadcast_jobs 1──N broadcast_assignments
broadcast_assignments N──1 sessions
users 1──N audit_log
roles 1──N users (role_name)
```

### 5.2 Review Skema & Normalisasi

**22 Table saat ini:**
1. `messages` ✅ 1NF
2. `sessions` ✅ 1NF
3. `auth_state` ✅ (key-value store, justified)
4. `webhook_outbox` ✅
5. `user_profiles` ✅
6. `behavior_config` ✅
7. `behavior_outbox` ✅
8. `faq_entries` ✅
9. `template_entries` ✅
10. `tenants` ✅
11. `users` ✅
12. `user_sessions` ✅ (junction table)
13. `api_keys` ✅
14. `audit_log` ✅
15. `broadcast_jobs` ✅
16. `broadcast_assignments` ✅
17. `webhook_dead_letter` ✅
18. `roles` ✅
19. `tenant_packages` ✅

**Catatan Normalisasi:**

| Table | Issue | Fix |
|-------|-------|-----|
| `sessions` | `webhook_url` dan `webhook_secret` di sessions — seharusnya di tenant level | ✅ Tapi di-justify: per-session webhook override tenant — ini desain yang benar. Tambahkan `webhook_url` di tenants sebagai default. |
| `auth_state` | `creds_data` TEXT + `keys_data` TEXT — JSON blob | ✅ Justified: Baileys butuh creds+keys sebagai object. Binary buffer → Base64 → JSON. Tidak perlu dinormalisasi. |
| `behavior_config` | 25 kolom — banyak yang nullable | ✅ Masih 1NF. Alternatif: EAV (entity-attribute-value) tapi query jadi ribet. Stay. |
| `user_profiles` | `features` TEXT (JSON array) | ✅ JSON string — tidak perlu tabel terpisah. |
| `broadcast_assignments` | `targets` TEXT (JSON array of phone numbers) | ⚠️ Normalisasi ke 3NF: tabel `broadcast_targets(id, assignment_id, phone)` untuk query per-target. Tapi untuk VPS kecil, JSON sudah cukup. |

**Rekomendasi:** Stay dengan skema saat ini. Tidak perlu denormalisasi atau normalisasi lebih lanjut.

### 5.3 Indexing Strategy (Status Sekarang)

**Existing indexes (14):**
| Index | Table | Tujuan |
|-------|-------|--------|
| `idx_messages_session` | messages(session_id) | ✅ Filter by session |
| `idx_messages_status` | messages(status) | ✅ Filter pending/sent |
| `idx_webhook_status` | webhook_outbox(status) | ✅ Retry processor |
| `idx_sessions_status` | sessions(status) | ✅ Dashboard count |
| `idx_sessions_tenant` | sessions(tenant_id) | ✅ Tenant isolation |
| `idx_user_profiles_session` | user_profiles(session_id) | ✅ Filter by session |
| `idx_behavior_outbox_user` | behavior_outbox(session_id, user_id) | ✅ Composite — optimal |
| `idx_faq_session` | faq_entries(session_id) | ✅ |
| `idx_template_session` | template_entries(session_id) | ✅ |
| `idx_tenants_api_key` | tenants(api_key) | ✅ Auth lookup |
| `idx_broadcast_jobs_tenant` | broadcast_jobs(tenant_id) | ✅ |
| `idx_broadcast_assignments_broadcast` | broadcast_assignments(broadcast_id) | ✅ |
| `idx_dead_letter_session` | webhook_dead_letter(session_id) | ✅ |
| `idx_roles_name` | roles(name) | ✅ |
| `idx_tenant_packages_tenant` | tenant_packages(tenant_id) | ✅ |

**Missing indexes (tambahkan):**
```sql
-- Untuk query dashboard: aggregate messages per session + date
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);

-- Untuk sync engine: incremental sync by updated_at
-- ⚠️ Hanya untuk tabel yang di-sync ke Supabase
CREATE INDEX IF NOT EXISTS idx_sessions_updated ON sessions(updated_at);
CREATE INDEX IF NOT EXISTS idx_messages_updated ON messages(updated_at);
CREATE INDEX IF NOT EXISTS idx_tenants_updated ON tenants(updated_at);
```

### 5.4 Query Performance Notes

| Query | Performance | Optimasi |
|-------|-------------|----------|
| `SELECT COUNT(*) FROM sessions` | ✅ Instant — internal counter | - |
| `SELECT * FROM messages WHERE session_id = ? ORDER BY created_at DESC LIMIT 50` | ✅ idx_messages_session covers |
| `SELECT COUNT(*) as c FROM messages WHERE tenant_id = ? AND created_at > ?` (cek limit) | ⚠️ Full scan jika banyak data | Tambah index `idx_messages_tenant_date(tenant_id, created_at)` |
| `SELECT * FROM webhook_outbox WHERE status='pending' ORDER BY created_at ASC LIMIT 50` | ✅ idx_webhook_status |

---

## 6. CRUD System Design

### 6.1 Pola CRUD Konsisten

Setiap resource mengikuti pola yang sama:

```javascript
// ── Pola CRUD template ───────────────────────────────────────────
// GET    /api/resources          → List (dengan pagination)
// GET    /api/resources/:id     → Detail
// POST   /api/resources          → Create
// PUT    /api/resources/:id     → Update (full replace)
// PATCH  /api/resources/:id     → Update (partial — via PUT di Express: beda semantic)
// DELETE /api/resources/:id     → Delete
```

Implementasi reusable:

```javascript
function createCRUD(table, primaryKey, options = {}) {
  const {
    listQuery = `SELECT * FROM ${table} ORDER BY created_at DESC`,
    getQuery = `SELECT * FROM ${table} WHERE ${primaryKey} = ?`,
    insertFn = null, // custom insert
    updateFn = null, // custom update
    deleteQuery = `DELETE FROM ${table} WHERE ${primaryKey} = ?`,
    validate = null, // (body) => error | null
    authorize = null, // (req, id) => boolean
    auditAction = null, // audit trail action name
  } = options;

  const router = express.Router();

  router.get('/', (req, res) => {
    const { limit = 50, offset = 0, ...filters } = req.query;
    let sql = listQuery;
    const params = [];
    // Dynamic WHERE clause dari query params
    Object.entries(filters).forEach(([key, val]) => {
      if (val && key !== 'limit' && key !== 'offset') {
        sql += ` AND ${key} = ?`;
        params.push(val);
      }
    });
    sql += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    res.json(db.prepare(sql).all(...params));
  });

  router.get('/:id', (req, res) => {
    const row = db.prepare(getQuery).get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  });

  router.post('/', (req, res) => {
    if (validate) {
      const err = validate(req.body);
      if (err) return res.status(400).json({ error: err });
    }
    if (insertFn) return insertFn(req, res);
    // Default insert from body
    res.status(501).json({ error: 'Not implemented' });
  });

  router.put('/:id', (req, res) => {
    if (updateFn) return updateFn(req, res);
    res.status(501).json({ error: 'Not implemented' });
  });

  router.delete('/:id', (req, res) => {
    if (authorize && !authorize(req, req.params.id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    db.prepare(deleteQuery).run(req.params.id);
    if (auditAction) logAudit(req.user?.id, auditAction, table, { id: req.params.id });
    res.json({ success: true });
  });

  return router;
}
```

### 6.2 Pagination, Search, Sort

**Pagination Pattern:**

```javascript
// Query params: ?limit=50&offset=0&sort=created_at&order=desc&search=keyword
function paginatedQuery(baseSql, req) {
  const limit = Math.min(parseInt(req.query.limit || '50'), 200);
  const offset = parseInt(req.query.offset || '0');
  const sort = req.query.sort || 'created_at';
  const order = req.query.order === 'asc' ? 'ASC' : 'DESC';
  const search = req.query.search;
  const params = [];

  let sql = baseSql;
  let countSql = `SELECT COUNT(*) as total FROM (${baseSql})`;

  if (search) {
    // ponytail: simple LIKE search — ganti dengan FTS5 jika >100k rows
    const searchClause = options.searchColumns
      .map(col => `${col} LIKE ?`)
      .join(' OR ');
    if (searchClause) {
      const searchParam = `%${search}%`;
      sql += ` AND (${searchClause})`;
      countSql += ` AND (${searchClause})`;
      params.push(...options.searchColumns.map(() => searchParam));
    }
  }

  // Validate sort column
  const validSort = options.sortColumns?.includes(sort) ? sort : 'created_at';
  sql += ` ORDER BY ${validSort} ${order} LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const rows = db.prepare(sql).all(...params);
  const total = db.prepare(countSql).get(...params.slice(0, -2))?.total || 0;

  return {
    data: rows,
    pagination: {
      limit,
      offset,
      total,
      hasMore: offset + limit < total,
    },
  };
}
```

### 6.3 Validation Layer

```javascript
// ponytail: centralized validation — satu function per entity
const validators = {
  session: (body) => {
    if (!body.session_id || typeof body.session_id !== 'string') return 'session_id required';
    if (body.session_id.length > 64) return 'session_id too long (max 64)';
    if (body.session_type && !['default', 'notifikasi', 'cs_chat', 'broadcast'].includes(body.session_type)) {
      return 'Invalid session_type';
    }
    return null;
  },
  message: (body) => {
    if (!body.chatId) return 'chatId required';
    if (body.type && !['text', 'image', 'audio', 'document'].includes(body.type)) return 'Invalid type';
    if (body.type === 'text' && !body.text) return 'text required for text messages';
    return null;
  },
  template: (body) => {
    if (!body.intent || !body.templates?.length) return 'intent and templates required';
    return null;
  },
  // etc.
};
```

---

## 7. ORM Strategy

### 7.1 Analisis: ORM vs Raw Prepared Statements

| Aspek | Raw (better-sqlite3) | ORM (Prisma / Drizzle / Knex) |
|-------|---------------------|-------------------------------|
| **Memory** | ✅ ~5MB (better-sqlite3 native) | ❌ Prisma: ~30-50MB tambahan (engine binary + query engine) |
| **Performance** | ✅ 0 overhead, langsung SQLite C API | ❌ ORM query overhead ~2-10ms/query |
| **Bundle size** | ✅ better-sqlite3: ~5MB (native) | ❌ Prisma: ~15MB + engine binary ~10MB |
| **Type safety** | ❌ Manual types | ✅ Auto-generated types |
| **Migration** | ❌ Manual SQL | ✅ Auto migration |
| **Query flexibility** | ✅ Full SQL | ⚠️ Limited by ORM abstraction |
| **Cold start** | ✅ Instant | ❌ Prisma: generate + validate ~2-5s |
| **VPS 414MB impact** | ✅ Aman | ❌ Prisma bisa push RAM ke >200MB sendiri |

### 7.2 Keputusan: STAY RAW

**Justifikasi:**
- VPS 414MB — menambah Prisma/Drizzle berarti ~30-50MB tambahan = 10% dari total RAM
- 70+ prepared statements sudah ditulis, full SQL, optimal
- `better-sqlite3` adalah ORM paling efisien untuk SQLite — synchronous C binding
- Tidak ada benefit signifikan untuk proyek sebesar ini
- Type safety bisa dicapai via JSDoc atau TypeScript (jika migrate ke TS nanti)

**Alternatif Ringan (jika ORM tetap diinginkan):**

```javascript
// ponytail: minimal query builder — 1 file, 0 dep, cukup untuk 80% use case
const qb = {
  select: (table, where = {}, opts = {}) => {
    const keys = Object.keys(where);
    const sql = keys.length
      ? `SELECT * FROM ${table} WHERE ${keys.map(k => `${k} = ?`).join(' AND ')}`
      : `SELECT * FROM ${table}`;
    if (opts.orderBy) sql += ` ORDER BY ${opts.orderBy}`;
    if (opts.limit) sql += ` LIMIT ${opts.limit}`;
    if (opts.offset) sql += ` OFFSET ${opts.offset}`;
    return db.prepare(sql).all(...Object.values(where));
  },
  insert: (table, data) => {
    const keys = Object.keys(data);
    const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`;
    return db.prepare(sql).run(...Object.values(data));
  },
  update: (table, data, where) => {
    const setKeys = Object.keys(data);
    const whereKeys = Object.keys(where);
    const sql = `UPDATE ${table} SET ${setKeys.map(k => `${k} = ?`).join(', ')} WHERE ${whereKeys.map(k => `${k} = ?`).join(' AND ')}`;
    return db.prepare(sql).run(...Object.values(data), ...Object.values(where));
  },
  delete: (table, where) => {
    const keys = Object.keys(where);
    const sql = `DELETE FROM ${table} WHERE ${keys.map(k => `${k} = ?`).join(' AND ')}`;
    return db.prepare(sql).run(...Object.values(where));
  },
};
```

**Rekomendasi:** Lanjutkan raw prepared statements. Jika type safety diperlukan di masa depan, migrasi ke TypeScript (tambah `tsx` runner, tambah tipe, tanpa ganti ORM).

---

## 8. API Design

### 8.1 RESTful API Endpoints — Lengkap

#### **Public / No Auth**

| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| GET | `/api/health` | Health check + uptime + session count | ✅ |
| GET | `/docs` | API documentation page (rendered EJS) | ✅ |

#### **Auth**

| Method | Endpoint | Description | RBAC |
|--------|----------|-------------|------|
| POST | `/api/auth/login` | Login → JWT httpOnly cookie | Public |
| POST | `/api/auth/register` | Register user | superadmin |
| GET | `/api/auth/me` | Current user info | Authenticated |
| GET | `/api/auth/token` | Get JWT token for API calls | Authenticated |
| POST | `/auth/login` | SSR login form handler | Public |
| GET | `/auth/logout` | Clear token cookie | Authenticated |

#### **Sessions**

| Method | Endpoint | Description | RBAC |
|--------|----------|-------------|------|
| GET | `/api/sessions` | List all sessions (filtered by tenant/user) | Authenticated |
| POST | `/api/sessions` | Create new session | Authenticated |
| GET | `/api/sessions/:id/status` | Get session status + metadata | Owner |
| GET | `/api/sessions/:id/qr` | Get QR code (JSON or HTML) | Owner |
| PUT | `/api/sessions/:id` | Update session (tenant, type, webhook) | Owner |
| PUT | `/api/sessions/:id/webhook` | Set webhook URL | Owner |
| DELETE | `/api/sessions/:id` | Delete session + cleanup auth state | Owner |

#### **Messages**

| Method | Endpoint | Description | RBAC |
|--------|----------|-------------|------|
| GET | `/api/sessions/:id/messages` | List messages (pagination: ?limit, ?offset, ?status, ?type) | Owner |
| POST | `/api/sessions/:id/messages` | Send message (text/image/audio/document) | Owner |
| POST | `/api/sessions/:id/messages/send-text` | Quick send text | Owner |
| POST | `/api/sessions/:id/messages/send-image` | Quick send image | Owner |
| GET | `/api/sessions/:id/incoming` | List incoming webhooks | Owner |

#### **Behavior Engine**

| Method | Endpoint | Description | RBAC |
|--------|----------|-------------|------|
| GET | `/api/sessions/:id/behavior` | Get behavior config (safe, no AI key) | Owner |
| POST | `/api/sessions/:id/behavior` | Update behavior config (with presets) | Owner |

#### **User Profiles (Contacts)**

| Method | Endpoint | Description | RBAC |
|--------|----------|-------------|------|
| GET | `/api/sessions/:id/users` | List all contacts for session | Owner |
| GET | `/api/sessions/:id/users/:userId` | Get specific contact detail | Owner |
| PUT | `/api/sessions/:id/users/:userId/persona` | Update persona (quick/normal/relaxed) | Owner |

#### **FAQ**

| Method | Endpoint | Description | RBAC |
|--------|----------|-------------|------|
| GET | `/api/sessions/:id/faq` | List FAQ entries | Owner |
| POST | `/api/sessions/:id/faq` | Create FAQ entry | Owner |
| DELETE | `/api/sessions/:id/faq/:faqId` | Delete FAQ entry | Owner |

#### **Templates**

| Method | Endpoint | Description | RBAC |
|--------|----------|-------------|------|
| GET | `/api/sessions/:id/templates` | List templates | Owner |
| POST | `/api/sessions/:id/templates` | Create template | Owner |
| PUT | `/api/sessions/:id/templates/:templateId` | Update template | Owner |
| DELETE | `/api/sessions/:id/templates/:templateId` | Delete template | Owner |
| POST | `/api/sessions/:id/templates/:intent` | [Legacy] Create template by intent | Owner |

#### **Broadcast**

| Method | Endpoint | Description | RBAC |
|--------|----------|-------------|------|
| POST | `/api/sessions/:id/broadcast` | Start broadcast to numbers | Owner |

#### **Analytics**

| Method | Endpoint | Description | RBAC |
|--------|----------|-------------|------|
| GET | `/api/sessions/:id/analytics/summary` | 30-day summary | Owner |
| GET | `/api/sessions/:id/analytics/personas` | Persona distribution | Owner |
| GET | `/api/sessions/:id/analytics/sources` | Source breakdown | Owner |
| GET | `/api/sessions/:id/analytics/volume` | Hourly volume (?days=N) | Owner |
| GET | `/api/sessions/:id/analytics/export.csv` | CSV export 30 days | Owner |

#### **Admin — Users**

| Method | Endpoint | Description | RBAC |
|--------|----------|-------------|------|
| GET | `/api/admin/users` | List all users | superadmin/admin |
| DELETE | `/api/admin/users/:id` | Delete user | superadmin |

#### **Admin — Tenants**

| Method | Endpoint | Description | RBAC |
|--------|----------|-------------|------|
| GET | `/api/admin/tenants` | List tenants (key masked) | superadmin/admin |
| POST | `/api/admin/tenants` | Create tenant with API key | superadmin |
| PUT | `/api/admin/tenants/:id` | Update tenant | superadmin |
| DELETE | `/api/admin/tenants/:id` | Delete tenant + cascade | superadmin |
| GET | `/api/admin/tenants/:id/limits` | Check usage vs package limits | superadmin/admin |
| GET | `/api/admin/tenants/:id/package` | Get current package | superadmin/admin |
| PUT | `/api/admin/tenants/:id/package` | Update package | superadmin |
| POST | `/api/admin/tenants/:id/package` | Create package | superadmin |

#### **Admin — API Keys**

| Method | Endpoint | Description | RBAC |
|--------|----------|-------------|------|
| GET | `/api/admin/api-keys` | List API keys (no hash) | Authenticated |
| POST | `/api/admin/api-keys` | Create API key (returns raw key once) | Authenticated |
| DELETE | `/api/admin/api-keys/:id` | Delete API key | Authenticated |

#### **Admin — Logs & Monitoring**

| Method | Endpoint | Description | RBAC |
|--------|----------|-------------|------|
| GET | `/api/admin/messages` | All messages (?session_id, ?status, ?type) | superadmin/admin |
| GET | `/api/admin/webhooks` | Webhook logs (?session_id, ?status) | superadmin/admin |
| POST | `/api/admin/webhooks/:id/retry` | Retry webhook delivery | superadmin/admin |
| GET | `/api/admin/dead-letter` | Dead letter queue (?session_id) | superadmin/admin |
| GET | `/api/admin/audit` | Audit log (last 100 entries) | superadmin |
| GET | `/api/admin/stats` | Dashboard stats (aggregate) | Authenticated |
| GET | `/api/admin/stats/messages` | Message timeline (?days=N) | Authenticated |
| GET | `/api/admin/stats/sessions` | All sessions with stats | Authenticated |
| GET | `/api/admin/settings` | Global settings | Authenticated |

#### **Admin — RBAC**

| Method | Endpoint | Description | RBAC |
|--------|----------|-------------|------|
| GET | `/api/admin/roles` | List roles with permissions | superadmin/admin |
| POST | `/api/admin/roles` | Create custom role | superadmin |
| PUT | `/api/admin/roles/:name` | Update role (non-system) | superadmin |
| DELETE | `/api/admin/roles/:name` | Delete role (non-system) | superadmin |

#### **Admin — Sync**

| Method | Endpoint | Description | RBAC |
|--------|----------|-------------|------|
| GET | `/api/admin/sync/status` | Sync health check | superadmin |
| POST | `/api/admin/sync/full` | Trigger full sync | superadmin |

#### **Sync (Laravel integration)**

| Method | Endpoint | Description | RBAC |
|--------|----------|-------------|------|
| POST | `/api/sync/templates` | Fetch templates from Laravel | API Key |

#### **Admin — Contacts**

| Method | Endpoint | Description | RBAC |
|--------|----------|-------------|------|
| GET | `/api/admin/contacts` | All contacts (?session_id) | superadmin/admin |
| GET | `/api/admin/contacts/personas` | Persona distribution | superadmin/admin |

### 8.2 Format Request/Response

**Success Response:**

```json
{
  "success": true,
  "session_id": "mysession123",
  "tenant_id": "tn_abc123"
}
```

**Error Response:**

```json
{
  "error": "Session not found"
}
```

**List Response (dengan pagination):**

```json
{
  "data": [ ... ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 142,
    "hasMore": true
  }
}
```

**Session Status Response:**

```json
{
  "status": "connected",
  "qr": null,
  "reconnect_count": 0,
  "msg_sent": 1284,
  "msg_failed": 3
}
```

**Send Message Request:**

```json
{
  "chatId": "6281234567890",
  "type": "text",
  "text": "Halo, ini pesan dari WA Gateway",
  "priority": "high"
}
```

**Send Image Request:**

```json
{
  "chatId": "6281234567890",
  "type": "image",
  "imageUrl": "https://example.com/image.jpg",
  "caption": "Foto promo"
}
```

**Broadcast Request:**

```json
{
  "numbers": ["6281234567890", "6289876543210"],
  "message": "Pesan broadcast untuk semua",
  "priority": "normal",
  "schedule_at": "2026-07-25T08:00:00Z"
}
```

**Behavior Config Request:**

```json
{
  "session_type": "cs_chat",
  "ai_enabled": true,
  "ai_model": "gpt-4o-mini",
  "faq_enabled": true,
  "volume_per_minute": 5,
  "quiet_hours": {
    "start": 22,
    "end": 7,
    "timezone": "Asia/Jakarta"
  }
}
```

### 8.3 Status Codes

| Code | Usage |
|------|-------|
| 200 | GET, PUT success |
| 201 | POST create success |
| 400 | Validation error, missing fields |
| 401 | No auth token / invalid token |
| 403 | Insufficient permissions / cross-tenant access |
| 404 | Resource not found |
| 409 | Conflict (duplicate session, slug, username) |
| 429 | Rate limit (login brute-force) |
| 500 | Internal server error (unhandled) |
| 502 | External service error (sync fetch) |

### 8.4 Auth Headers

| Method | Header | Notes |
|--------|--------|-------|
| API Key | `X-API-Key: sk_live_***` | Primary untuk automation |
| API Key | `?apikey=sk_live_***` | Query param fallback |
| JWT | `Authorization: Bearer <token>` | Admin panel |
| Cookie | `token=<jwt>` | SSR pages (auto-bridged ke Bearer di `/api` middleware) |

---

## Ringkasan Prioritas Implementasi

| # | Task | Kompleksitas | Impact |
|---|------|-------------|--------|
| 1 | **Perbaiki sync engine** — incremental (ganti SELECT fullscan) | Medium | Tinggi — RAM + CPU |
| 2 | **Tambahkan graceful shutdown** | Low | Tinggi — fault tolerance |
| 3 | **Tambahkan WAL checkpoint periodik** | Low | Sedang — cegah disk bloat |
| 4 | **Tambahkan GC periodik** | Low | Sedang — RAM management |
| 5 | **Tambahkan pagination ke endpoints** | Low | Sedang — scalability |
| 6 | **Tambahkan indexes** (`updated_at`, `tenant_id+created_at`) | Low | Sedang — query speed |
| 7 | **Tambahkan error boundary Express** | Low | Tinggi — stability |
| 8 | **Optimasi Baileys session limit** | Low | Tinggi — RAM |
| 9 | **Swap tuning (vm.swappiness=10)** | Low | Sedang — system stability |
| 10 | **Systemd CPUQuota + OOMScore** | Low | Sedang — resource control |
