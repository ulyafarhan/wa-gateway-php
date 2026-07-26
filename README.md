# WhatsApp Gateway v5 — WaAceh

Gateway WhatsApp multi-session dengan REST API, Behavior Engine anti-ban, SQLite persistence, dan Vue 3 Admin Panel. Dibangun di atas **Baileys v6.7** (WebSocket API tidak resmi).

---

## 1. Overview

`wa-gateway` adalah microservice mandiri yang menghubungkan aplikasi Anda dengan WhatsApp Web melalui koneksi WebSocket. Setiap sesi adalah akun WhatsApp terpisah, dikelola via REST API + Vue 3 Admin Panel.

**Kemampuan inti:**

- Multi-sesi — jalankan banyak nomor WhatsApp dalam satu proses
- Kirim & terima pesan (teks, gambar, audio, dokumen)
- Broadcast ke banyak nomor dengan prioritas (high/normal/low)
- Public registration — daftar langsung dari landing page
- JWT dual-token auth (access 15m + refresh 7d httpOnly)
- RBAC 5 roles (superadmin, admin, operator, client, viewer)
- Admin Panel Vue 3 (TailAdmin) — kelola sessions, users, broadcast, webhooks
- Webhook event dengan retry + dead letter queue
- Behavior Engine — auto-reply dengan timing dan volume seperti manusia, anti-ban
- Deteksi persona per pengirim via Online K-Means
- Auto-reconnect dengan exponential backoff
- SQLite untuk semua data (auth state, pesan, konfigurasi)
- Optional SOCKS5 proxy (WARP) — bypass blokir WhatsApp dari IP cloud
- Sync engine ke Cloudflare D1 + Supabase (watermark-based)

---

## 2. Tech Stack

| Komponen | Teknologi |
|----------|-----------|
| Runtime | **Node.js v24** (ESM) |
| Web Framework | **Express 5** |
| WhatsApp API | **@whiskeysockets/baileys** v6.7.23 |
| Database | **better-sqlite3** (WAL mode) |
| Proxy | **socks-proxy-agent** (optional) |
| Logging | **pino** |
| QR Code | **qrcode** (server-side render) |
| AI Adapter | Multi-provider: OpenAI, Anthropic, Bedrock, Azure |
| Behavior Engine | **Vanilla JS** — zero dependencies |

---

## 3. Quick Start

### Prasyarat

- **Node.js v24+**
- **npm**
- (Opsional) **WARP** — `cloudflare-warp` SOCKS5 proxy di `localhost:40000`
- (Opsional) **API key AI** — OpenAI / Anthropic / Azure jika ingin auto-reply AI

### Instalasi

```bash
# Clone & masuk direktori
cd wa-gateway

# Install dependencies
npm install

# Copy environment
cp .env.example .env

# (Opsional) Edit .env — set API_KEY untuk production
```

### Menjalankan

```bash
npm start
```

Server berjalan di `http://localhost:2785` (default).

### Membuat sesi pertama

```bash
# Buat sesi
curl -X POST http://localhost:2785/api/sessions \
  -H 'Content-Type: application/json' \
  -d '{"session_id": "my-wa"}'

# Buka QR di browser
open http://localhost:2785/api/sessions/my-wa/qr?format=html

# Scan QR dengan WhatsApp -> Sesi terhubung
```

---

## 4. Project Structure

```
wa-gateway/
├── server.mjs              # Entry point — Express app, startup, graceful shutdown
├── package.json
├── .env.example
├── .gitignore
├── src/
│   ├── db.js               # SQLite — schema, prepared statements semua query
│   ├── auth-state.js       # Custom SQLite-backed auth state (pengganti useMultiFileAuthState)
│   ├── session.js          # Manajemen sesi — socket, queue, reconnect, state machine
│   ├── routes.js           # REST API — semua endpoint
│   ├── webhook.js          # Webhook outbound — deliver & retry ke Laravel/external
│   └── behavior/
│       ├── index.js        # Orchestrator — pipeline incoming message → response
│       ├── persona.js      # Online K-Means — deteksi persona per user (quick/normal/relaxed)
│       ├── timing.js       # AdaptiveTiming — delay seperti manusia per persona
│       ├── volume.js       # AdaptiveTokenBucket — rate limit per user (per min/hour/day)
│       ├── anti-ban.js     # SafetyEngine, DiversityEngine, quiet hours, burst protection
│       ├── content.js      # Content engine — FAQ → Template → AI → Fallback
│       └── ai.js           # AI adapter — OpenAI, Anthropic, Bedrock, Azure, OpenAI-compatible
└── data/                   # SQLite DB (gitignored)
```

---

## 5. API Endpoints

Semua endpoint (kecuali `/api/health`) dilindungi oleh **X-API-Key** jika `API_KEY` di-set.

| Method | Path | Deskripsi |
|--------|------|-----------|
| `GET` | `/api/health` | Health check — status server, uptime, jumlah sesi |
| **Sessions** | | |
| `GET` | `/api/sessions` | Daftar semua sesi dan statusnya |
| `POST` | `/api/sessions` | Buat sesi baru (mulai koneksi WhatsApp) |
| `GET` | `/api/sessions/:id/status` | Status satu sesi (connected/waiting_qr/disconnected) |
| `GET` | `/api/sessions/:id/qr?format=json\|html` | QR code untuk scan (JSON atau HTML page) |
| `PUT` | `/api/sessions/:id/webhook` | Set webhook URL & secret per sesi |
| `DELETE` | `/api/sessions/:id` | Hapus sesi (logout + bersihkan auth state) |
| **Messages** | | |
| `POST` | `/api/sessions/:id/messages` | Kirim pesan (text/image/audio/document) |
| `POST` | `/api/sessions/:id/messages/send-text` | Kirim teks cepat |
| `POST` | `/api/sessions/:id/messages/send-image` | Kirim gambar (URL) |
| `POST` | `/api/sessions/:id/broadcast` | Broadcast teks ke banyak nomor |
| `GET` | `/api/sessions/:id/messages` | Riwayat 50 pesan terakhir |
| `GET` | `/api/sessions/:id/incoming` | 50 pesan masuk terakhir via webhook |
| **Behavior Config** | | |
| `GET` | `/api/sessions/:id/behavior` | Konfigurasi behavior engine |
| `POST` | `/api/sessions/:id/behavior` | Update konfigurasi behavior engine |
| **User Profiles** | | |
| `GET` | `/api/sessions/:id/users` | Semua profil user (kontak) |
| `GET` | `/api/sessions/:id/users/:userId` | Profil satu user |
| `PUT` | `/api/sessions/:id/users/:userId/persona` | Override persona user (quick/normal/relaxed) |
| **FAQ** | | |
| `GET` | `/api/sessions/:id/faq` | Daftar FAQ |
| `POST` | `/api/sessions/:id/faq` | Tambah FAQ |
| `DELETE` | `/api/sessions/:id/faq/:faqId` | Hapus FAQ |
| **Templates** | | |
| `GET` | `/api/sessions/:id/templates` | Daftar template pesan per intent |
| `POST` | `/api/sessions/:id/templates/:intent` | Tambah template untuk intent tertentu |
| **Analytics** | | |
| `GET` | `/api/sessions/:id/analytics/personas` | Distribusi persona user |
| `GET` | `/api/sessions/:id/analytics/sources` | Sumber reply (faq/template/ai/fallback) |
| `GET` | `/api/sessions/:id/analytics/volume` | Volume pesan per jam (24 jam terakhir) |

### Contoh kirim pesan

```bash
curl -X POST http://localhost:2785/api/sessions/my-wa/messages \
  -H 'Content-Type: application/json' \
  -d '{"chatId": "628123456789@s.whatsapp.net", "text": "Halo, ini pesan dari gateway"}'
```

### Contoh broadcast

```bash
curl -X POST http://localhost:2785/api/sessions/my-wa/broadcast \
  -H 'Content-Type: application/json' \
  -d '{"numbers": ["6281111111111@s.whatsapp.net", "6282222222222@s.whatsapp.net"], "message": "Promo spesial hari ini!"}'
```

---

## 6. Environment Variables

| Variabel | Default | Deskripsi |
|----------|---------|-----------|
| `PORT` | `2785` | Port HTTP server |
| `HOST` | `0.0.0.0` | Bind address |
| `API_KEY` | `""` | API Key untuk auth. **Kosong = tanpa auth (dev only). WAJIB diisi di production.** |
| `SOCKS5_PROXY` | `socks5://127.0.0.1:40000` | SOCKS5 proxy URL. Kosongkan jika langsung. |
| `DB_PATH` | `./data/wagateway.db` | Path SQLite database |
| `WEBHOOK_URL` | `""` | Global fallback webhook URL (bisa di-override per sesi via API) |
| `RATE_LIMIT_MS` | `1500` | Interval minimum antar pengiriman pesan (ms) |
| `LOG_LEVEL` | `silent` | Level log: `silent`, `error`, `warn`, `info`, `debug` |

---

## 7. Behavior Engine

Behavior Engine adalah sistem auto-reply cerdas yang merespon pesan masuk **seperti manusia** — bukan robot. Tujuannya: pengalaman natural dan **anti-ban**.

### Pipeline

Setiap pesan masuk diproses melalui 11 tahap:

```
Pesan Masuk
    │
    ├─ 1. Feature Extraction  ─── [avgResponseTime, msgPerDay, length, hour]
    ├─ 2. Persona Detection   ─── Online K-Means → quick / normal / relaxed
    ├─ 3. Volume Control      ─── Adaptive Token Bucket (per min/hour/day)
    ├─ 4. Safety Check        ─── Quiet hours, burst protection
    ├─ 5. Content Selection   ─── FAQ → Template → AI → Fallback
    ├─ 6. Diversity Check     ─── Hindari reply identik
    ├─ 7. Timing Generation   ─── Read delay + typing delay + send delay
    ├─ 8. Human Simulation    ─── Presence update (available → composing)
    ├─ 9. Send Message        ─── Via Baileys socket
    ├─10. Recording           ─── Hash, source, delay → behavior_outbox
    └─11. Model Update        ─── Update centroid, token bucket, EMA timing
```

### Persona Detection (Online K-Means)

- **3 cluster**: `quick` (cepat), `normal` (sedang), `relaxed` (lambat)
- **4 fitur**: rata-rata response time, pesan per hari, panjang reply, jam
- **Online learning** — model update setiap kali user kirim pesan (>3 pesan)
- Zero dependency — implementasi vanilla JS, simpan state ke SQLite

### Timing

Delay realistis per persona (dalam detik):

| Persona | Read Delay | Typing Delay | Send Delay |
|---------|-----------|-------------|-----------|
| quick | 3–10s | 15–40s | 20–90s |
| normal | 5–20s | 20–60s | 30–180s |
| relaxed | 15–60s | 30–90s | 60–300s |
| business | 3–15s | 10–40s | 15–120s |

Delay ditambahkan noise Gaussian dan bisa dikalikan dengan `timing_multiplier`.

### Volume Control (Adaptive Token Bucket)

- **3 window**: per menit, per jam, per hari
- Default: 3/menit, 20/jam, 100/hari
- **Auto-tune**: setelah 10 pesan, batas harian disesuaikan dengan `rata-rata * 1.2`
- **Cooldown**: jeda minimal antar reply ke user yang sama (default 30s)

### Anti-Ban

| Mekanisme | Detail |
|-----------|--------|
| Quiet hours | Blokir reply 22:00–07:00 (configurable) |
| Burst protection | Maks 3 reply ke user sama dalam 30 detik |
| Diversity check | Cegah reply identik (Levenshtein similarity > 0.7) |
| Content variation | Suffix acak, case variation |
| Human simulation | `sendPresenceUpdate('available')` → `'composing'` sebelum kirim |
| Proxy support | SOCKS5 (WARP) untuk hindari deteksi IP cloud |

### Content Pipeline

1. **FAQ** — cocokkan keyword atau similaritas pertanyaan
2. **Template** — deteksi intent (greeting, help, question, dll), pilih template belum terpakai
3. **AI** — panggil LLM (OpenAI, Anthropic, Bedrock, Azure, atau OpenAI-compatible)
4. **Fallback** — reply generik bahasa Indonesia

### Konfigurasi Behavior

Via `POST /api/sessions/:id/behavior`:

```json
{
  "persona_mode": "auto",
  "ai_enabled": true,
  "ai_provider": "openai",
  "ai_api_key": "sk-...",
  "ai_model": "gpt-4o-mini",
  "ai_system_prompt": "Kamu adalah asisten customer service yang ramah.",
  "faq_enabled": true,
  "template_enabled": true,
  "volume_per_minute": 3,
  "volume_per_hour": 20,
  "volume_per_day": 100,
  "cooldown_ms": 30000,
  "quiet_hours": { "start": 22, "end": 7, "timezone": "Asia/Jakarta" },
  "timing_multiplier": 1.0
}
```

---

## 8. The `state.get` Fix (Baileys v6.7 Auth State)

### Masalah

Dokumentasi resmi Baileys menyatakan:

> **DO NOT rely on `useMultiFileAuthState` in production. It is very inefficient.**

`useMultiFileAuthState` membaca/menulis banyak file kecil per kredensial — tidak cocok untuk production multi-sesi.

### Solusi

Kami menggunakan **custom SQLite-backed auth state** (`src/auth-state.js`):

- **`getAuthStateForBaileys(sessionId)`** — menghasilkan object `{ state, saveCreds }` dengan antarmuka persis seperti `useMultiFileAuthState`
- **Perbedaan kunci**: `state.keys.get()` dan `state.keys.set()` diimplementasikan sebagai method async yang membaca/menulis **in-memory cache + SQLite**, bukan file system
- **Otomatis persist** — setiap `creds.update` langsung disimpan ke DB

### Cara pakai (di session.js)

```javascript
const auth = getAuthStateForBaileys(sessionId);

const sock = makeWASocket({
    version,
    auth: auth.state,  // ← state object dengan .keys.get/.keys.set
    // ...
});

sock.ev.on('creds.update', (creds) => {
    auth.saveCreds(creds);
});
```

Tidak perlu `useMultiAuthState` atau file I/O — semua auth state tersimpan rapi di SQLite.

---

## 9. Deployment

### Systemd Service

Buat file `/etc/systemd/system/wa-gateway.service`:

```ini
[Unit]
Description=WhatsApp Gateway v4
After=network.target

[Service]
Type=simple
User=node
WorkingDirectory=/opt/wa-gateway
ExecStart=/usr/bin/node server.mjs
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=API_KEY=rahasia123
Environment=SOCKS5_PROXY=socks5://127.0.0.1:40000
Environment=LOG_LEVEL=info

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable wa-gateway
sudo systemctl start wa-gateway
sudo systemctl status wa-gateway
```

### Docker (manual)

```dockerfile
FROM node:24-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --production
COPY . .
EXPOSE 2785
CMD ["node", "server.mjs"]
```

---

## 10. Troubleshooting

### QR tidak muncul

```
Penyebab: Sesi terhalang oleh blokir IP cloud.
Solusi:   Aktifkan SOCKS5 proxy (WARP) — set SOCKS5_PROXY di .env.
          Pastikan WARP berjalan: curl --socks5 localhost:40000 https://ip.me
```

### Connection closed / terus reconnect

```
Penyebab: Token WhatsApp kedaluwarsa, atau IP dibanned sementara.
Solusi:   Hapus sesi (DELETE /api/sessions/:id) dan buat ulang.
          Jika terus terjadi, gunakan proxy WARP.
```

### "Session already exists"

```
Penyebab: Sesi dengan ID yang sama sudah aktif.
Solusi:   Hapus sesi lama dulu sebelum buat ulang, atau gunakan session_id berbeda.
```

### Webhook tidak diterima

```
Penyebab: URL webhook tidak reachable, atau tidak di-set.
Solusi:   Set webhook via PUT /api/sessions/:id/webhook.
          Pastikan server tujuan bisa menerima POST dari server ini.
          Cek tabel webhook_outbox di SQLite untuk status pengiriman.
```

### Behavior engine tidak membalas

```
Penyebab: AI tidak enabled, atau tidak ada FAQ/template.
Solusi:   Cek konfigurasi via GET /api/sessions/:id/behavior.
          Set ai_enabled=true dan ai_api_key jika ingin AI reply.
          Tambah FAQ atau template jika ingin reply otomatis non-AI.
```

### Rate limit terlalu ketat

```
Penyebab: Default volume_per_minute=3 terlalu rendah untuk use case tertentu.
Solusi:   Sesuaikan via POST /api/sessions/:id/behavior.
          Atau biarkan auto-tune setelah 10+ pesan per user.
```

### Database locked / SQLite error

```
Penyebab: Multiple process akses file SQLite yang sama.
Solusi:   Pastikan hanya satu instance wa-gateway yang berjalan.
          Gunakan DB_PATH berbeda jika perlu multiple instance.
```

---

## 11. Testing

Framework: **Node.js `node:test`** (built-in, zero dependencies).

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run pretest       # Syntax check
```

**Coverage:** 114 unit tests — behavior engine (persona, timing, volume, anti-ban, content), auth (JWT, RBAC, bcrypt), cache, webhook. Lihat [TESTING.md](TESTING.md).

---

## 12. Deployment

### VPS (AWS, 414MB RAM)

```bash
# Build frontend
cd frontend && npm run build && cd ..

# Copy to VPS
rsync -avz --exclude node_modules --exclude .env --exclude data \
  server.mjs src/ public/ frontend/dist/ package.json \
  -e "ssh -i ~/.ssh/wa-gateway.pem" \
  ubuntu@52.77.165.51:/home/ubuntu/wa-gateway/

# Install & restart
ssh -i ~/.ssh/wa-gateway.pem ubuntu@52.77.165.51
cd /home/ubuntu/wa-gateway && npm install --production
sudo systemctl restart wa-gateway
```

Systemd service: `wa-gateway.service` — running di belakang nginx + Cloudflare.

---

## License

**GNU Affero General Public License v3.0 (AGPL-3.0)**

- ✅ **Gratis untuk penggunaan individu** — pribadi, non-komersial, bebas.
- ⚠️ **Wajib buka kode jika dijual** — jika kamu menjual layanan ini atau mengintegrasikannya ke produk bisnis, **seluruh kode turunan WAJIB dibuka** di bawah lisensi yang sama (AGPL).
- ⚠️ **Wajib buka kode jika dimodifikasi** — setiap modifikasi yang didistribusikan atau dijalankan sebagai layanan publik harus disertai akses ke source code.

Ini adalah **AGPL**, bukan MIT. Tujuannya: menjaga ekosistem tetap terbuka dan mencegah eksploitasi komersial tanpa kontribusi balik. Lihat [LICENSE](LICENSE) untuk detail lengkap.
