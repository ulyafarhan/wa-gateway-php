# WA Gateway — Master Plan

> **Proyek:** WhatsApp Gateway (WA Gampong)  
> **Stack:** Node.js v24 + Express 5 + Vue 3 (TailAdmin) + SQLite + Supabase  
> **VPS:** 414MB RAM, 2GB swap, 2 vCPU, Ubuntu 24.04  
> **Budget:** Rp0  
> **Domain:** wa-gampong.my.id

---

## Daftar Isi

1. [Arsitektur & Planning](#1-arsitektur--planning)
2. [Implementasi Backend](#2-implementasi-backend)
3. [Frontend & Testing](#3-frontend--testing)
4. [Quality & Security](#4-quality--security)
5. [DevOps & Delivery](#5-devops--delivery)

---

## 1. Arsitektur & Planning

### 1.1 Diagram Arsitektur

```
                         VPS — 414MB RAM
┌──────────────────────────────────────────────────────────────────────────┐
│  ┌──────────────────┐    ┌────────────────────────────────────────────┐ │
│  │   WARP Tunnel    │    │           Node.js Process (128MB heap)     │ │
│  │   (~65MB RSS)    │    │                                            │ │
│  └───────┬──────────┘    │  ┌──────────┐  ┌────────────────────────┐ │ │
│          │               │  │          │  │   Baileys Socket Pool  │ │ │
│          │               │  │ Express 5├──┤   (N sessions)         │ │ │
│          │  HTTPS        │  │ (2-3MB)  │  │   ~8-15MB/connection   │ │ │
│          ├───────────────┤  └────┬─────┘  └────────────────────────┘ │ │
│          │               │       │                                     │ │
│          │               │  ┌────▼────────────────────────────────┐    │ │
│          │               │  │   SQLite (WAL, better-sqlite3)      │    │ │
│  ┌───────┴──────────┐    │  │   22 tables, 70+ stmts cached       │    │ │
│  │  Vue 3 SPA       │    │  └────────────┬────────────────────────┘    │ │
│  │  (nginx static)  │    │               │                              │ │
│  └──────────────────┘    │  ┌────────────▼────────────────────────┐    │ │
│                          │  │   Background Workers                 │    │ │
│                          │  │   ├─ webhook.js (retry+deadletter)   │    │ │
│                          │  │   ├─ broadcast.js (scheduler)        │    │ │
│                          │  │   └─ behavior/ (AI+timing+persona)   │    │ │
│                          │  └─────────────────────────────────────┘    │ │
│                          └────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  2GB Swap (target: <200MB used setelah optimasi)                │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Layer Arsitektur

| Layer | Komponen | Runtime | RAM |
|-------|----------|---------|-----|
| **Tunnel** | Cloudflare WARP | Sistem | ~65MB |
| **Web Server** | Express 5 | Node.js v24 | ~2-3MB |
| **WhatsApp** | Baileys socket pool | Node.js | ~8-15MB/session |
| **Database** | SQLite (better-sqlite3) | Native addon | ~5-10MB |
| **Backup** | Supabase REST (dual-write) | Remote | 0MB |
| **Background** | Webhook, broadcast, behavior | Node.js | ~10MB |
| **Frontend** | Vue 3 SPA (nginx) | Browser | 0MB server |

### 1.3 Alur Request E2E

```
Client (Vue 3 SPA / API Client)
  │
  ▼
nginx (TLS termination, static files, proxy)
  │
  ▼
Express 5 (helmet → cors → cookieParser → rateLimiter)
  │
  ├── SSR Routes → EJS render → HTML (transisi ke SPA)
  │     └── requireAuth (JWT cookie)
  │
  └── REST API (/api/*)
        └── authMiddleware (API Key / JWT Bearer)
              ├── GET    → db.prepare().all()/.get()
              ├── POST   → validasi → db write → dual-write → response
              ├── PUT    → validasi → db write → dual-write → response
              └── DELETE → db write + cleanup → dual-write
```

### 1.4 State Machine Session

```
          ┌──────────────┐
          │ disconnected │ ← initial
          └──────┬───────┘
                 │ connectSession()
                 ▼
          ┌──────────────┐
     ┌───►│  connecting   │
     │    └──────┬───────┘
     │     ┌─────┴──────┐
     │     │            │
     │     ▼            ▼
     │ ┌────────┐  ┌──────────┐
     │ │connected│  │waiting_qr│ ← QR display
     │ └───┬────┘  └─────┬────┘
     │     │              │ scan success
     │     │              ▼
     │     │          ┌──────────┐
     │     └─────────►│ connected│
     │                 └───┬─────┘
     │                     │ disconnect/error/timeout
     │                     ▼
     │                 ┌──────────┐
     │                 │reconnecting│ ← exponential backoff (1→2→4→...→300s)
     │                 └─────┬────┘
     └───────────────────────┘

     loggedOut/device_removed → delete auth state + stop
```

### 1.5 Optimasi RAM 414MB

#### Budget Memori

| Komponen | Estimasi | Target |
|----------|---------|--------|
| WARP (warp-svc) | ~65MB | ✅ Tidak bisa dikurangi |
| Node.js heap 128MB | ~45-60MB RSS | ✅ Sudah |
| Baileys (N session × 10-15MB) | ~10-80MB | ⚠️ Batasi session |
| SQLite (WAL + cache) | ~5-10MB | ✅ Sudah optimal |
| OS + swap | ~200MB | ⚠️ Turunkan dengan optimasi |
| **Total** | **~350-400MB** | **Target: <350MB** |

#### Tuning

```bash
# Node.js heap
--max-old-space-size=128 --max-semi-space-size=8 --expose-gc

# GC periodik (setiap 5 menit)
setInterval(() => { if (global.gc) global.gc() }, 300000)

# Batasi session aktif berdasarkan RAM
const MAX_SESSIONS = Math.max(1, Math.floor((os.freemem() - 50MB) / 15MB))

# vm.swappiness
sudo sysctl -w vm.swappiness=10
```

#### SQLite PRAGMA Optimal

```javascript
db.pragma('journal_mode = WAL')
db.pragma('synchronous = NORMAL')
db.pragma('cache_size = -4000')       // ~4MB
db.pragma('wal_autocheckpoint = 500')  // Flush tiap 500 pages (~4MB)
db.pragma('page_size = 4096')
db.pragma('temp_store = MEMORY')
db.pragma('mmap_size = 268435456')     // 256MB memory-map
db.pragma('busy_timeout = 5000')
```

### 1.6 Database Normalisasi & Indexing

**Review:** 22 tabel sudah dalam 1NF/2NF. Tidak perlu denormalisasi.

**Indexes yang kurang:**

| Tabel | Index | Alasan |
|-------|-------|--------|
| `messages` | `idx_messages_created` | ORDER BY created_at pada log viewer |
| `messages` | `idx_messages_tenant_date` | Filter by tenant + date range |
| `sessions` | `idx_sessions_updated` | WHERE updated_at > watermark (sync) |

### 1.7 ORM Strategy

**Keputusan: Tetap pakai `better-sqlite3` raw prepared statements.** Bukan ORM.

| ORM | RAM | Alasan Skip |
|-----|-----|-------------|
| Prisma | ~50MB | Engine binary + query engine terlalu berat |
| Drizzle | ~20MB | Light, tapi tetap tidak perlu — prepared statements sudah cukup |
| Knex | ~15MB | Query builder — nilai tambah minimal |
| **better-sqlite3** | **0MB** | ✅ Synchronous, zero-overhead, 70+ stmts sudah siap |

### 1.8 CRUD Design Pattern

```javascript
// Pola reusable untuk semua CRUD
function createCRUD({ table, fields, validate, idField = 'id' }) {
  return {
    list: (filters = {}, pagination = {}) => {
      const { page = 1, limit = 50 } = pagination
      const offset = (page - 1) * limit
      const where = buildWhereClause(filters) // sanitized
      return {
        data: db.prepare(`SELECT * FROM ${table} ${where} LIMIT ? OFFSET ?`).all(limit, offset),
        total: db.prepare(`SELECT COUNT(*) as count FROM ${table} ${where}`).get().count
      }
    },
    get: (id) => db.prepare(`SELECT * FROM ${table} WHERE ${idField} = ?`).get(id),
    create: (data) => {
      const valid = validate(data)
      const stmt = db.prepare(`INSERT INTO ${table} (${fields}) VALUES (${fields.map(() => '?')})`)
      return stmt.run(...fields.map(f => valid[f]))
    },
    update: (id, data) => {
      const valid = validate(data, true) // partial
      const set = Object.keys(valid).map(k => `${k} = ?`).join(', ')
      return db.prepare(`UPDATE ${table} SET ${set} WHERE ${idField} = ?`).run(...Object.values(valid), id)
    },
    delete: (id) => db.prepare(`DELETE FROM ${table} WHERE ${idField} = ?`).run(id)
  }
}
```

### 1.9 API Design (70+ Endpoints)

#### Auth

| Method | Path | Role | Deskripsi |
|--------|------|------|-----------|
| `POST` | `/api/auth/login` | Public | Login, return JWT cookie |
| `POST` | `/api/auth/logout` | Auth | Hapus session + cookie |
| `GET` | `/api/auth/me` | Auth | Current user profile + permissions |

#### Sessions

| Method | Path | Role |
|--------|------|------|
| `GET` | `/api/sessions` | admin, operator, viewer |
| `POST` | `/api/sessions` | admin, operator |
| `GET` | `/api/sessions/:id` | admin, operator |
| `PUT` | `/api/sessions/:id` | admin |
| `DELETE` | `/api/sessions/:id` | admin |
| `POST` | `/api/sessions/:id/connect` | admin, operator |
| `POST` | `/api/sessions/:id/disconnect` | admin, operator |
| `GET` | `/api/sessions/:id/qr` | admin, operator |

#### Broadcast

| Method | Path | Role |
|--------|------|------|
| `GET` | `/api/broadcast` | admin, operator |
| `POST` | `/api/broadcast/send` | admin, operator |
| `GET` | `/api/broadcast/queue` | admin, operator |
| `DELETE` | `/api/broadcast/queue/:id` | admin |

#### Users (Admin)

| Method | Path | Role |
|--------|------|------|
| `GET` | `/api/admin/users` | superadmin, admin |
| `POST` | `/api/admin/users` | superadmin, admin |
| `PUT` | `/api/admin/users/:id` | superadmin, admin |
| `DELETE` | `/api/admin/users/:id` | superadmin |

#### Logs

| Method | Path | Role |
|--------|------|------|
| `GET` | `/api/logs` | admin, manager, operator |
| `GET` | `/api/logs/stats` | admin, manager |

#### Settings

| Method | Path | Role |
|--------|------|------|
| `GET` | `/api/settings` | admin |
| `PUT` | `/api/settings` | admin |
| `POST` | `/api/settings/api-key/regenerate` | superadmin |

#### Health & Monitoring

| Method | Path | Role |
|--------|------|------|
| `GET` | `/api/health` | Public |
| `GET` | `/api/stats` | admin, manager |

#### Response Format

```javascript
// Success
{ "data": {...}, "meta": { "page": 1, "limit": 50, "total": 100 } }

// Error
{ "error": "message", "code": 400, "details": { "field": "email", "reason": "required" } }

// List
{ "data": [...], "meta": { "page": 1, "limit": 50, "total": 100 } }
```

### 1.10 Fault Tolerance

```javascript
// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received — shutting down');
  // 1. Disconnect Baileys sessions
  for (const [id, session] of sessions) {
    session.socket?.logout('Shutting down');
  }
  // 2. Flush WAL
  db.pragma('wal_checkpoint(TRUNCATE)');
  // 3. Close DB
  db.close();
  process.exit(0);
});

// Error boundary Express (Express 5 — async errors auto-caught)
app.use((err, req, res, _next) => {
  const status = err.status || 500;
  console.error(`[${status}] ${req.method} ${req.path}: ${err.message}`);
  if (status >= 500) logger.error({ err, req: { method: req.method, path: req.path } });
  res.status(status).json({ error: status >= 500 ? 'Internal server error' : err.message });
});
```

---

## 2. Implementasi Backend

### 2.1 Struktur Folder Final

```
wa-gateway/
├── server.mjs                    # Entry point (Express 5)
├── package.json
├── .env
├── src/
│   ├── db.js                     # SQLite connection (existing)
│   ├── auth.js                   # JWT + bcrypt + RBAC (existing)
│   ├── session.js                # Baileys pool (existing)
│   ├── broadcast.js              # Scheduler (existing)
│   ├── webhook.js                # Retry + deadletter (existing)
│   ├── dual-write.js             # Fire-and-forget Supabase backup (NEW)
│   ├── middleware/
│   │   ├── auth.js               # requireAuth, requireRole, optionalAuth (NEW)
│   │   └── rate-limit.js         # Login rate limiter (NEW)
│   ├── routes/
│   │   ├── api.js                # REST API routes (from routes.js)
│   │   └── admin.js              # Admin API routes (from routes-admin.js)
│   ├── controllers/              # Handler functions (NEW, opsional)
│   │   ├── sessionController.js
│   │   └── messageController.js
│   └── services/                 # Business logic (NEW, opsional)
│       ├── sessionService.js
│       └── messageService.js
├── views/                        # EJS templates (existing — gradual)
├── public/                       # Static assets
├── frontend/ → vue-tailwind-admin-dashboard-main/
└── auth_info/                    # Baileys session data
```

### 2.2 Migrasi server.mjs ke Express Terstruktur

#### Middleware Auth (`src/middleware/auth.js`)

```javascript
import { verifyToken } from '../auth.js';

export function requireApiAuth(req, res, next) {
  const header = req.headers['authorization'];
  if (header?.startsWith('Bearer ')) {
    const decoded = verifyToken(header.slice(7));
    if (decoded) { req.user = decoded; return next(); }
  }
  const cookieToken = req.cookies?.token;
  if (cookieToken) {
    const decoded = verifyToken(cookieToken);
    if (decoded) { req.user = decoded; return next(); }
  }
  return res.status(401).json({ error: 'No token provided' });
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}
```

#### server.mjs — Entry Point Baru

```javascript
import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './src/db.js';
import { seedAdminUser } from './src/auth.js';
import { connectSession } from './src/session.js';
import { startWebhookProcessor } from './src/webhook.js';
import { startBroadcastProcessor } from './src/broadcast.js';
import apiRouter from './src/routes/api.js';
import adminRouter from './src/routes/admin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = parseInt(process.env.PORT || '2785', 10);

seedAdminUser();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(cookieParser());
app.use(express.json());
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: (process.env.CORS_ORIGINS || '').split(','), credentials: true }));
app.use('/dist', express.static(path.join(__dirname, 'frontend', 'dist')));
app.use('/assets', express.static(path.join(__dirname, 'frontend', 'public')));

// Routes
app.use('/', apiRouter);
app.use('/', adminRouter);

// Health endpoint (no auth)
app.get('/api/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// SPA fallback
app.get('*', (req, res, next) => {
  if (!req.path.startsWith('/api/')) {
    return res.sendFile(path.join(__dirname, 'frontend', 'dist', 'index.html'));
  }
  next();
});

// Error handler
app.use((err, req, res, _next) => {
  console.error(`[${err.status || 500}] ${req.method} ${req.path}: ${err.message}`);
  res.status(err.status || 500).json({
    error: (err.status && err.status < 500) ? err.message : 'Internal server error'
  });
});

// Manual GC
if (global.gc) setInterval(() => global.gc(), 300000);

// Graceful shutdown
process.on('SIGTERM', async () => {
  db.pragma('wal_checkpoint(TRUNCATE)');
  db.close();
  process.exit(0);
});

app.listen(PORT, '127.0.0.1', () => console.log(`WA Gateway running on port ${PORT}`));
```

### 2.3 Dual-Write Supabase Backup (`src/dual-write.js`)

```javascript
// ponytail: fire-and-forget ke Supabase — ganti periodic SELECT * fullscan
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

export function backupToSupabase(table, data) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return;
  fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    },
    body: JSON.stringify(data)
  }).catch(() => {}); // fire-and-forget
}
```

### 2.4 Package Updates

```json
// Root package.json — add:
"devDependencies": { "concurrently": "^9.1.0" }

// frontend/package.json — add:
"dependencies": { "pinia": "^3.0.0", "axios": "^1.7.0" }
```

---

## 3. Frontend & Testing

### 3.1 Stack

- **Vue 3** (Composition API + `<script setup>`)
- **TailAdmin 2.3.0** (Template existing: `vue-tailwind-admin-dashboard-main/`)
- **Tailwind CSS v4**
- **Vue Router 4** (nested routes, meta roles, guards)
- **Pinia** (state management)
- **Axios** (HTTP client + JWT interceptor)
- **vue3-apexcharts** (dashboard charts)

### 3.2 Struktur Frontend

```
frontend/src/
├── api/
│   ├── client.js           # Axios instance + interceptors
│   ├── auth.js             # login, logout, me
│   ├── sessions.js         # CRUD sessions
│   ├── users.js            # CRUD users
│   ├── broadcast.js        # send, queue
│   ├── devices.js          # device list, connect
│   ├── logs.js             # fetch with filter
│   └── settings.js         # API keys, webhook
├── stores/
│   ├── auth.js             # user, token, role
│   ├── sessions.js         # session list
│   ├── broadcast.js        # queue, history
│   └── ui.js               # theme, sidebar
├── components/
│   ├── layout/             # Dari TailAdmin (existing)
│   ├── reusable/
│   │   ├── DataTable.vue
│   │   ├── StatusBadge.vue
│   │   ├── QRModal.vue
│   │   ├── ConfirmDialog.vue
│   │   ├── MetricCard.vue
│   │   └── FilterBar.vue
│   └── widgets/
│       ├── RecentActivity.vue
│       └── MessageChart.vue
├── views/
│   ├── Auth/LoginView.vue
│   ├── Dashboard/DashboardView.vue
│   ├── Sessions/SessionsView.vue
│   ├── Users/UsersView.vue
│   ├── Devices/DevicesView.vue
│   ├── Broadcast/BroadcastView.vue
│   ├── Logs/LogsView.vue
│   ├── Settings/SettingsView.vue
│   └── Errors/{NotFound,Forbidden}.vue
├── router/index.js
├── main.js
└── App.vue
```

### 3.3 Route Design & Guards

```typescript
const routes = [
  { path: '/login', component: LoginView, meta: { layout: 'fullscreen' } },
  {
    path: '/',
    component: AdminLayout,
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'Dashboard', component: DashboardView,
        meta: { roles: ['admin','manager','operator','viewer'] } },
      { path: 'sessions', name: 'Sessions', component: SessionsView,
        meta: { roles: ['admin','operator'] } },
      { path: 'users', name: 'Users', component: UsersView,
        meta: { roles: ['admin'] } },
      { path: 'devices', name: 'Devices', component: DevicesView,
        meta: { roles: ['admin','operator'] } },
      { path: 'broadcast', name: 'Broadcast', component: BroadcastView,
        meta: { roles: ['admin','operator'] } },
      { path: 'logs', name: 'Logs', component: LogsView,
        meta: { roles: ['admin','manager','operator'] } },
      { path: 'settings', name: 'Settings', component: SettingsView,
        meta: { roles: ['admin'] } },
    ]
  }
]
```

**Guard `beforeEach` — 3 hal:**
1. Auth check: redirect `/login` jika tidak ada token
2. Auto-redirect: jika sudah login ke `/login` → `/`
3. Role check: cocokkan `meta.roles` dengan user role

### 3.4 Pinia Auth Store

```javascript
export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const token = ref(localStorage.getItem('token'))
  const role = computed(() => user.value?.role)

  async function login(email, password) {
    const res = await axios.post('/api/auth/login', { email, password })
    token.value = res.data.token
    user.value = res.data.user
    localStorage.setItem('token', res.data.token)
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('token')
    router.push('/login')
  }

  return { user, token, role, login, logout }
})
```

### 3.5 Testing Strategy

| Level | Tools | Scope | Lokasi |
|-------|-------|-------|--------|
| **Unit** | Vitest | Auth middleware, CRUD validation, dual-write | `tests/unit/` |
| **Integration** | Vitest + Supertest | API endpoints (auth, sessions, broadcast) | `tests/integration/` |
| **Smoke** | Bash curl | Pre-deploy health check | `deploy.sh` |

**Skip E2E** — VPS 414MB tidak cukup untuk Playwright/Puppeteer.

#### Test Case Prioritas (P0)

```
1. Auth: login success → JWT returned
2. Auth: login invalid password → 401
3. Auth: login rate limit → 429 after 10 attempts
4. Sessions: CRUD session → create/read/update/delete
5. Sessions: connect without API key → 401
6. Broadcast: enqueue message → 201
7. Broadcast: send without permission → 403
8. Rate limiter: abuse /api/auth/login → 429
```

---

## 4. Quality & Security

### 4.1 OWASP Top 10 Review

| Celah | Status | Tindakan |
|-------|--------|----------|
| **A1: Injection** | ✅ Aman | Semua via prepared statements |
| **A2: Broken Auth** | ⚠️ Risiko | JWT expiry 7d terlalu panjang → turunkan ke 24h |
| **A3: Sensitive Data** | **❌ Kritis** | Hapus `.env` dari git — putar semua secret |
| **A4: XXE** | ✅ N/A | No XML processing |
| **A5: Broken Access** | ⚠️ Cukup | RBAC di route level, perlu second layer di service |
| **A6: Misconfiguration** | ⚠️ Ringan | Helmet CSP di-disable → aktifkan dengan config sesuai |
| **A7: XSS** | ✅ Rendah | Vue auto-escape. QR render perlu sanitasi |
| **A8: Insecure Deser** | ✅ Aman | JSON.parse only from DB |
| **A9: Insufficient Logging** | **❌ Kritis** | `logAudit()` defined tapi never called. Fix panggil |
| **A10: CSRF** | ⚠️ Sedang | SameSite=Lax sudah. API stateless via JWT Bearer |

### 4.2 RBAC Hierarchy

```
superadmin → * (bypass all)
admin      → sessions:*, messages:*, users:read, webhooks:*, broadcast:*, analytics:read
operator   → sessions:read, sessions:update, messages:send, broadcast:create, logs:read
manager    → analytics:read, logs:read, dashboard:*
viewer     → dashboard:read only
api        → via X-API-Key, terbatas per tenant
```

### 4.3 Audit Trail

```javascript
// ponytail: satu baris audit per route yang mutate data
function audit(req, action, resource, details = {}) {
  db.prepare(`INSERT INTO audit_log (id, user_id, action, resource, details, ip, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(crypto.randomUUID(), req.user?.id, action, resource,
      JSON.stringify(details), req.ip || '', Date.now());
}
```

**Wajib dipanggil di:** login, logout, create/delete user, create/delete session, send broadcast, regenerate API key.

### 4.4 Code Quality — ESLint Config

```javascript
export default [
  { ignores: ['dist/**', 'node_modules/**', 'frontend/**'] },
  {
    files: ['**/*.js', '**/*.mjs'],
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-undef': 'error',
      'prefer-const': 'error',
      'eqeqeq': ['error', 'always'],
      'no-throw-literal': 'error',
    }
  }
];
```

### 4.5 Dead Code — Hapus

| File | LOC | Alasan |
|------|-----|--------|
| `src/sync.js` | 390 | Periodic SELECT * fullscan penyebab I/O wait 48%. Ganti dual-write |
| `src/supabase.js` | 84 | Hanya dipanggil sync.js |
| `src/d1.js` | 100 | Hanya dipanggil sync.js |

### 4.6 Dependency Audit

| Package | Status |
|---------|--------|
| `express` ^5.0.0 | ✅ Wajib |
| `better-sqlite3` ^12.11.1 | ✅ Wajib |
| `@whiskeysockets/baileys` ^6.7.23 | ✅ Wajib |
| `helmet` ^8.3.0 | ✅ Wajib |
| `jsonwebtoken` ^9.0.3 | ✅ Wajib |
| `bcryptjs` ^3.0.3 | ✅ Wajib |
| `cookie-parser` ^1.4.7 | ✅ Wajib |
| `cors` ^2.8.6 | ✅ Wajib |
| `qrcode` ^1.5.4 | ✅ Wajib |
| `pino` ^9.5.0 | ✅ Wajib |
| `ejs` ^6.0.1 | ✅ Wajib (transisi) |
| `dotenv` ^17.4.2 | ✅ Wajib |
| `@hapi/boom` ^10.0.1 | ✅ Dipakai |
| `socks-proxy-agent` ^8.0.2 | ⚠️ Opsional (hanya jika SOCKS5) |

**Perlu ditambah:** `express-rate-limit` (global rate limiter, bukan cuma login).

---

## 5. DevOps & Delivery

### 5.1 Deployment Architecture

```
wa-gampong.my.id:443
       ↓
[Cloudflare DNS — proxied]
       ↓
┌──────────────────────────────┐
│    nGinX (port 80/443)       │
│  wa-gampong.my.id.conf       │
│                              │
│  / → proxy_pass :2785        │
│  /dist → static files (Vue)  │
│  SSL termination             │
│  Rate limit: 30r/s           │
└──────────┬───────────────────┘
           ↓ :2785
┌──────────────────────────────┐
│  Node.js (Express v5)        │
│  --max-old-space-size=128    │
│  --max-semi-space-size=8     │
│  --expose-gc                 │
│                              │
│  SSR: EJS views/             │
│  API: /api/*                 │
│  Admin: /api/admin/*         │
└──────────────────────────────┘
    ├────────┬──────────┐
    ↓        ↓          ↓
 SQLite   WARP      Supabase
 (WAL)    SOCKS5    (backup)
```

### 5.2 Systemd Service

```ini
[Unit]
Description=WA Gateway
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/wa-gateway

ExecStart=/home/ubuntu/.nvm/versions/node/v24.18.0/bin/node \
    --max-old-space-size=128 \
    --max-semi-space-size=8 \
    --expose-gc \
    server.mjs

EnvironmentFile=/home/ubuntu/wa-gateway/.env
Environment=NODE_ENV=production
Restart=always
RestartSec=10
StartLimitIntervalSec=60
StartLimitBurst=3
OOMScoreAdjust=500
MemoryMax=256M
MemoryHigh=192M
CPUQuota=80%
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ReadWritePaths=/home/ubuntu/wa-gateway/data /home/ubuntu/wa-gateway/auth_info

[Install]
WantedBy=multi-user.target
```

### 5.3 nGinX Config

```nginx
server {
    listen 443 ssl http2;
    server_name wa-gampong.my.id;

    ssl_certificate /etc/letsencrypt/live/wa-gampong.my.id/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/wa-gampong.my.id/privkey.pem;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    server_tokens off;
    limit_req_zone $binary_remote_addr zone=api:10m rate=30r/s;

    location /dist/ {
        root /home/ubuntu/wa-gateway/frontend;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://127.0.0.1:2785;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:2785;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 5.4 Memory Optimization

```bash
# Kernel tuning
sudo sysctl -w vm.swappiness=10
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf

# Journal size limit
sudo journalctl --vacuum-size=50M
echo 'SystemMaxUse=50M' | sudo tee -a /etc/systemd/journald.conf

# Node.js GC
if (global.gc) setInterval(() => global.gc(), 300000)

# Session limit
const MAX_SESSIONS = Math.max(1, Math.floor((os.freemem() - 50 * 1024 * 1024) / (15 * 1024 * 1024)));
```

### 5.5 SSL/HTTPS

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d wa-gampong.my.id

# Auto-renew — already added by certbot
sudo certbot renew --dry-run
```

### 5.6 Backup & DR

```bash
# Daily SQLite backup (cron)
0 3 * * * cp /home/ubuntu/wa-gateway/data/wagateway.db /home/ubuntu/backups/wagateway-$(date +\%Y\%m\%d).db

# Dual-write: setiap write SQLite → fire-and-forget ke Supabase (lihat 2.3)
# Recovery: cp backup → restart service
```

### 5.7 Monitoring

```bash
# Health endpoint (public)
GET /api/health → { "status": "ok", "uptime": 12345 }

# One-liner monitoring
ps -o rss= -p $(pgrep -f 'server.mjs' | head -1) | awk '{printf "%dMB\n", $1/1024}' \
  && curl -so /dev/null -w '%{time_total}s\n' http://127.0.0.1:2785/api/health \
  && du -sh /home/ubuntu/wa-gateway/data/wagateway.db
```

### 5.8 Performance Budget

| Metrik | Target | Cara Ukur |
|--------|--------|-----------|
| Node.js RSS | < 128MB | `ps -o rss= -p $(pgrep -f server.mjs)` |
| API response | < 200ms | `curl -w '%{time_total}' /api/health` |
| SPA first load | < 2s | Browser DevTools |
| Swap usage | < 200MB | `free -m | grep Swap` |
| DB size | < 100MB | `du -sh data/wagateway.db` |

### 5.9 Prioritas Eksekusi

| Hari | Task |
|------|------|
| **Hari 1** | Certbot SSL, update systemd, deploy nGinX config |
| **Hari 1-2** | vm.swappiness=10, SQLite PRAGMA tuning, journald limit |
| **Hari 2** | Delete sync.js/supabase.js/d1.js, ganti dual-write.js |
| **Hari 2-3** | Vue SPA integration, wrapper EJS fallback |
| **Hari 3** | API layer + Pinia stores + route guards |
| **Hari 3-4** | Views: Dashboard, Sessions, Users, Broadcast |
| **Hari 4** | Audit trail fix, rate limiter global, error boundary |
| **Hari 5** | Testing (Vitest), pre-deploy smoke test, final deploy |

---

## Ringkasan Konflik & Resolusi

| Konflik | Resolusi |
|---------|----------|
| sync.js dipertahankan (Architecture) vs dihapus (Quality) | **Hapus sync.js** — dual-write 30 baris ganti 390 baris periodic fullscan |
| Keep EJS + Vue hybrid (Implementation) vs full SPA (Frontend) | **Hybrid** — EJS untuk legacy, arahkan SPA untuk new features |
| Heap 128MB (Architecture) vs 128+8+expose-gc (DevOps) | **128MB + semi-space 8MB + expose-gc** — DevOps lebih detail |
| ORM vs raw (Architecture) | **Raw** — Prisma/Drizzle 30-50MB RAM tambahan, tidak worth |

---

*Plan ini adalah living document — update sesuai progres implementasi.*
