# wa-gateway — WhatsApp Gateway Multi-Session

Bahasa: **Selalu respons dalam Bahasa Indonesia**. Kode, error, file paths, commands: tetap dalam bentuk aslinya.

## Production
- **Domain:** https://wa.gampong.web.id (SSL via certbot ✅ → butuh Cloudflare mode Full)
- **VPS:** AWS, 414MB RAM, 2 vCPU, 19GB disk, Ubuntu 24.04
- **Node.js:** v24.18.0 (heap 128MB, semi-space 8MB, expose-gc)
- **Status:** Active — 2 sessions (default, sig-udeung), connected (QR waiting)
- **WARP:** Cloudflare WARP proxy SOCKS5 (~96MB RAM)

## Tech Stack
- **Runtime:** Node.js v24 (ESM)
- **Framework:** Express 5
- **WhatsApp API:** @whiskeysockets/baileys v6.7
- **Database:** better-sqlite3 (WAL mode, 19 tables, 70+ prepared stmts)
- **Frontend:** Vue 3 + Vite + Tailwind CSS v4 (TailAdmin)
- **Logging:** pino
- **Auth:** JWT (dual: access_token 15m + refresh_token 7d httpOnly)
- **RBAC:** 5 roles (superadmin, admin, operator, client, viewer)
- **Proxy:** WARP SOCKS5 (socks5://127.0.0.1:40000)

## Architecture
Monolithic REST API microservice. Multi-session WhatsApp WebSocket connections via Baileys. Behavior engine pipeline: persona → volume → safety → content → timing → send. SQLite for all persistence. Optional Supabase/Cloudflare D1 replication. Admin panel via Vue 3 SPA (TailAdmin) served by Express.

```
wa.gampong.web.id:443 (target)
  ↓ nginx (reverse proxy, SSL, rate limit, cache)
localhost:2785
  ↓ Express 5
  ├─ API: /api/* (REST, JSON)
  ├─ SPA: /admin/* (Vue 3 TailAdmin)
  └─ WS: Baileys WhatsApp sessions
```

## Structure
```
wa-gateway/
├── server.mjs              # Entry point (Express 5)
├── src/
│   ├── db.js               # SQLite schema & queries
│   ├── auth.js             # JWT + bcrypt + RBAC
│   ├── auth-state.js       # SQLite-backed Baileys auth
│   ├── session.js          # Socket, queue, reconnect
│   ├── routes/
│   │   ├── api.js          # REST API (sessions, messages, broadcast, behavior, FAQ, templates, analytics)
│   │   └── admin.js        # Admin API (auth, users, tenants, stats, webhooks, roles, packages)
│   ├── webhook.js          # Webhook outbound + retry + dead letter
│   ├── broadcast.js        # Broadcast scheduler
│   ├── dual-write.js       # Fire-and-forget Supabase backup
│   ├── middleware/
│   │   └── error-handler.js
│   └── behavior/           # Anti-ban engine (11-stage pipeline)
│       ├── index.js        # Pipeline orchestrator
│       ├── persona.js      # Online K-Means
│       ├── timing.js       # Human-like delays
│       ├── volume.js       # Token bucket
│       ├── anti-ban.js     # Safety + diversity
│       ├── content.js      # FAQ → Template → AI → Fallback
│       └── ai.js           # LLM adapter (OpenAI, Anthropic, Bedrock)
├── frontend/               # Vue 3 SPA (TailAdmin)
├── sync.js                # Periodic watermark-based sync to Supabase + Cloudflare D1 (replaces dual-write.js)
├── sdk/php/                # PHP SDK + Laravel package
└── data/                   # SQLite DB
```

## Memory (RAM 414MB — TIGHT)
| Komponen | RAM |
|----------|-----|
| WARP (warp-svc) | ~96MB |
| Node.js (wa-gateway) | ~57MB (peak 111MB) |
| OS + services | ~140MB |
| **Free/Available** | **~120MB** |

## Critical Issues (Sisa)
1. **WA sessions disconnected** — QR timeout, proxy/WARP kurang efektif
2. **WARP 96MB** — hampir seperempat RAM, perlu evaluasi
3. **Cloudflare SSL mode** — dashboard perlu di-set ke "Full"

## Prioritas Eksekusi (3-Hari VIBE)
```
Day 1 [Anti-ban]   Day 2 [Infra]      Day 3 [Ship]
├─ Session health   ├─ Caching layer    ├─ Domain waaceh
├─ Log-normal timing ├─ AI pipeline v2  ├─ Pricing model
├─ Block detection  ├─ Context memory   ├─ SDK publish
├─ Sync engine D1  ├─ Multi-provider   ├─ E2E test + deploy
```

## Memory
Awal sesi → `memory({ mode: "search", query: "project context" })`, `memory({ mode: "search", query: "current task status" })`
Akhir sesi → `memory({ mode: "add", content: "## Session Summary\nTask: ..." })`

## Ponytail Rules
- YAGNI — jangan buat yang belum diperlukan
- Stdlib first — pakai built-in sebelum dependency
- One-liner — kalu bisa satu baris, satu baris
- Deletion over addition
- Boring over clever
- `ponytail:` comment untuk setiap simplifikasi deliberate
