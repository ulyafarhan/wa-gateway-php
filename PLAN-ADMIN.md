# WA Gateway Maturation Plan

## Vision
Gateway WhatsApp multi-tenant dengan admin panel sendiri, multi-user, multi-nomor, reusable untuk semua project.

## Architecture

```
┌─────────────────────────────────────────────────┐
│              TailAdmin Dashboard                 │
│  (Alpine.js + ApexCharts + Tailwind v4)          │
│  ├─ Login / Auth                                 │
│  ├─ Dashboard (stats, charts)                    │
│  ├─ Sessions (manage numbers)                    │
│  ├─ Messages (history, search)                   │
│  ├─ Contacts (user profiles + persona)           │
│  ├─ Behavior (AI, FAQ, templates, timing)        │
│  ├─ Webhooks (settings, logs)                    │
│  ├─ API Keys (manage access)                     │
│  └─ Settings (global config)                     │
└──────────────────┬──────────────────────────────┘
                   │ REST API
┌──────────────────▼──────────────────────────────┐
│             WA Gateway Express Backend            │
│  ├─ Auth (JWT multi-user)                        │
│  ├─ Session Manager (multi-number)               │
│  ├─ Behavior Engine (persona, timing, anti-ban)  │
│  ├─ Message Queue + Rate Limiter                 │
│  ├─ Webhook Dispatcher                           │
│  └─ Baileys Socket Pool                          │
└────────────────────────┬────────────────────────┘
                         │
              ┌──────────┴──────────┐
              │     SQLite DB       │
              │  (wagateway.db)     │
              └─────────────────────┘
```

## Phase 1: Core Backend (1-2 weeks)

### 1.1 Multi-User Auth
**File:** `src/auth.js` (new), `src/routes.js` (update)
- JWT-based login/logout/register
- User table: `id, username, email, password_hash, role (admin/operator), created_at`
- Middleware: `authMiddleware` now validates JWT + attaches user

### 1.2 Multi-Session per User
**File:** `src/db.js` (update), `src/routes.js` (update)
- Sessions belong to `user_id` (nullable → required)
- New table: `user_sessions` — `user_id, session_id, label, project_name`
- API changes: `GET /api/sessions` → filter by user
- User can have 0-N sessions (different WA numbers)

### 1.3 API Key Management
**File:** `src/routes.js` (new endpoints)
- Table: `api_keys` — `id, user_id, name, key_hash, scopes, last_used_at`
- CRUD: `POST /api/api-keys`, `DELETE /api/api-keys/:id`
- Each project gets its own API key with scope (read-only, send, admin)
- Validate key against user's sessions

### 1.4 Webhook Logs & Retry
**File:** `src/webhook.js` (update)
- Webhook delivery status per user
- Log viewer: `GET /api/webhooks/logs`
- Manual retry: `POST /api/webhooks/:id/retry`

## Phase 2: Admin Dashboard (2-3 weeks)

### 2.1 Static HTML → Live
**Convert TailAdmin HTML to EJS templates (or SPA with Alpine.js)**

| Page | Route | Content |
|------|-------|---------|
| **Login** | `/login` | Auth form, JWT storage in localStorage |
| **Dashboard** | `/` | Cards: sessions online, msg sent/failed, contacts, webhooks pending + Chart.js |
| **Sessions** | `/sessions` | Table + QR modal + create/delete/disconnect |
| **Session Detail** | `/sessions/:id` | Messages, contacts, behavior config, webhook URL |
| **Messages** | `/messages` | Filter by session/user + status chart |
| **Contacts** | `/contacts` | User profiles, persona distribution, features |
| **Behavior** | `/behavior` | AI config, FAQ editor, templates editor, timing sliders |
| **Webhooks** | `/webhooks` | Status, delivery history, URL config |
| **API Keys** | `/api-keys` | CRUD + regenerate |
| **Settings** | `/settings` | Global limits, quiet hours, timezone |

### 2.2 TailAdmin Components Used
| Component | Where |
|-----------|-------|
| Sidebar (`partials/sidebar.html`) | All pages |
| Header (`partials/header.html`) | All pages |
| Chart (`partials/chart/chart-01.html` with ApexCharts) | Dashboard |
| Charts (`partials/chart/chart-02.html`) | Session detail + Messages |
| Tables (`partials/table/`) | Sessions, Messages, Contacts, Webhooks, API Keys |
| Badge (`partials/badge/`) | Session status, connection indicators |
| Alert (`partials/alert/`) | Success/error messages |
| Form elements (`form-elements.html`) | Behavior config, webhook URL, API key creation |
| Modal (`partials/calendar-event-modal.html`) | QR code display, confirm delete |
| Dropzone | File upload for media messages |

### 2.3 TailAdmin Integration
```
wa-gateway/
├── public/              # Static assets (TailAdmin compiled)
│   └── assets/
├── views/               # EJS templates (dari TailAdmin .html)
│   ├── partials/        # Sidebar, header, charts, tables
│   ├── index.ejs        # Dashboard
│   ├── login.ejs
│   ├── sessions.ejs
│   ├── messages.ejs
│   └── ...
└── server.mjs          # Serve static + EJS + API
```

**Approach:** 
- Compile TailAdmin once (webpack → output to `public/`)
- Use EJS for server-side rendering (extends HTML partials)
- Alpine.js for client interactivity (real-time, charts, modals)
- ApexCharts for time-series data (messages/day, connections)

## Phase 3: Multi-Tenant Features (1-2 weeks)

### 3.1 Project Separation
- Each project (sig-udeung, avaradesa, etc.) = API key scope
- Sessions isolated per project
- Webhooks configurable per project per session
- Rate limits per project per session

### 3.2 User Roles
| Role | Can |
|------|-----|
| `superadmin` | All projects, all sessions, system settings |
| `admin` | Own projects, all sessions in project, manage API keys |
| `operator` | View sessions, send messages, view analytics |

### 3.3 Audit Log
- Table: `audit_log` — `id, user_id, action, resource, details, ip, created_at`
- Log all actions: create session, send message, change config, generate API key

## Phase 4: Polish & Scale (1 week)

### 4.1 Message Scheduler
- Schedule messages for future delivery
- `POST /api/sessions/:id/messages/schedule` with `scheduled_at`

### 4.2 Contact Groups / Broadcast Lists
- Create groups of contacts
- Broadcast to groups with rate limiting

### 4.3 Media Manager
- Upload and store images/documents/audio
- `/api/media/upload` → store in local filesystem or S3
- Auto-delete old media via cron

### 4.4 Export & Reports
- CSV export: messages, contacts, sessions
- Email report: daily summary of activity

## Effort Estimate

| Phase | Tasks | Estimated Days |
|-------|-------|---------------|
| P1 - Core Backend | Auth, multi-session, API keys, webhook logs | 7-10 days |
| P2 - Admin Dashboard | 10 pages, TailAdmin integration, EJS/SPA | 14-21 days |
| P3 - Multi-Tenant | Roles, projects, audit log | 7-10 days |
| P4 - Polish | Scheduler, groups, media, export | 5-7 days |
| **Total** | | **~30-45 days** |

## Tech Decisions

### Why Not Laravel Filament for This?
- WA Gateway is a standalone Node.js microservice, separate from Laravel
- TailAdmin is lighter + Alpine.js is simpler for a single-purpose admin
- Keeps the gateway independent (no PHP dependency on hosting that may not support Laravel)

### Why EJS + Alpine.js instead of Vue/React?
- TailAdmin is already built with Alpine.js + Webpack
- EJS templates map 1:1 to the existing HTML includes
- No Vite/framework build step needed for the admin (TailAdmin webpack covers it)
- Alpine.js and Chart.js are already dependencies in TailAdmin's package.json

## File Structure (After)

```
wa-gateway/
├── public/                  # Static assets
│   ├── assets/              # TailAdmin compiled CSS/JS/images
│   └── uploads/             # Media files
├── views/                   # EJS templates
│   ├── partials/            # Sidebar, header, charts
│   │   ├── sidebar.ejs
│   │   ├── header.ejs
│   │   └── chart-*.ejs
│   ├── login.ejs
│   ├── index.ejs            # Dashboard
│   ├── sessions.ejs         # Session list
│   ├── session.ejs          # Single session detail
│   ├── messages.ejs
│   ├── contacts.ejs
│   ├── behavior.ejs
│   ├── webhooks.ejs
│   └── settings.ejs
├── src/
│   ├── server.mjs           # + EJS engine, static file serving
│   ├── auth.js              # NEW: JWT auth, user management
│   ├── db.js                # + user_sessions, api_keys, audit_log tables
│   ├── routes.js            # + admin endpoints, auth endpoints
│   ├── routes-admin.js      # NEW: admin HTML page routes
│   ├── session.js
│   ├── auth-state.js
│   ├── webhook.js
│   └── behavior/
├── tailadmin/               # TailAdmin source
│   ├── package.json
│   ├── webpack.config.js
│   └── src/
├── package.json
├── .env
└── Dockerfile
```

## Next Step
Mulai dengan **Phase 1.1 + 1.2** — JWT auth + multi-session ownership. Mau proceed?
