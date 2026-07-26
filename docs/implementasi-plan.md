# Implementasi: Migrasi Express.js Terstruktur + Vue SPA (TailAdmin)

> **Untuk agentic workers:** REQUIRED SUB-SKILL: Gunakan superpowers:subagent-driven-development atau superpowers:executing-plans untuk implementasi task-by-task.

**Goal:** Refactor server.mjs dari inline SSR routes ke arsitektur Express Router terstruktur + integrasi Vue 3 SPA (TailAdmin) + API service layer + Pinia stores.

**Architecture:** Express.js backend dengan route modules (`routes/`, `middleware/`), Vue 3 SPA frontend (TailAdmin template) dengan Pinia stores dan Axios API layer, dual-write backup ke Supabase REST per write.

**Tech Stack:** Express 5, Vue 3, TailAdmin 2.3.0, Pinia, Axios, SQLite (better-sqlite3), Supabase REST API, Vite 6.

---

## Global Constraints

- Express 5 sudah terinstall — jangan install ulang.
- Semua path relatif terhadap `C:\laragon\www\wa-gateway`.
- TailAdmin template sudah ada di `vue-tailwind-admin-dashboard-main/`.
- Jangan hapus existing `server.mjs` — refactor bertahap.
- Jangan tambah dependency baru jika stdlib/express built-in mencukupi.
- Dual-write: fire-and-forget, jangan block response.
- Bahasa kode: English (kecuali komentar ponytail dalam English).
- Setiap task harus punya deliverable yang bisa di-test independen.

---

## File Structure Mapping

### Backend (Express) — Create/Refactor

| File | Status | Responsibility |
|------|--------|----------------|
| `server.mjs` | **Modify** | Entry point: middleware global, mount routers, start services |
| `src/db.js` | *Existing* | SQLite connection + prepared statements — unchanged |
| `src/auth.js` | *Existing* | JWT + bcrypt + RBAC helpers — unchanged |
| `src/session.js` | *Existing* | WhatsApp session management — unchanged |
| `src/routes.js` | **Rename** → `src/routes/api.js` | REST API routes (health, sessions, messages, behavior, FAQ, templates) |
| `src/routes-admin.js` | **Rename** → `src/routes/admin.js` | Admin API routes (auth, users, tenants, stats, settings) |
| `src/middleware/auth.js` | **Create** | `requireAuth`, `requireRole`, `requirePermission`, `optionalAuth` dari `src/auth.js` |
| `src/middleware/rate-limit.js` | **Create** | Login rate limiter (dipindah dari `routes-admin.js`) |
| `src/controllers/sessionController.js` | **Create** | Handler functions untuk session CRUD |
| `src/controllers/messageController.js` | **Create** | Handler functions untuk message endpoints |
| `src/services/sessionService.js` | **Create** | Business logic untuk session (dipisah dari handler) |
| `src/services/messageService.js` | **Create** | Business logic untuk message |
| `src/dual-write.js` | **Create** | Fire-and-forget Supabase REST backup (≤30 baris) |

### Frontend (Vue 3 + TailAdmin) — Create

| File | Status | Responsibility |
|------|--------|----------------|
| `frontend/` | **Replace** with `vue-tailwind-admin-dashboard-main/` | Root Vue SPA |
| `src/api/axios.js` | **Create** | Axios instance + interceptor JWT |
| `src/api/sessions.js` | **Create** | Session API calls |
| `src/api/users.js` | **Create** | Users API calls |
| `src/api/devices.js` | **Create** | Device API calls |
| `src/api/broadcast.js` | **Create** | Broadcast API calls |
| `src/api/logs.js` | **Create** | Logs API calls |
| `src/stores/auth.js` | **Create** | Pinia auth store (login, logout, user, token) |
| `src/stores/sessions.js` | **Create** | Pinia sessions store (CRUD) |
| `src/stores/stats.js` | **Create** | Pinia stats store (dashboard) |
| `src/router/index.ts` | **Modify** | Tambah route guards, lazy load views |
| `vite.config.ts` | **Modify** | Proxy `/api` ke Express |

---

## Task 1: Refactor Express Server — Router Structure

**Files:**
- Modify: `server.mjs`
- Rename: `src/routes.js` → `src/routes/api.js`
- Rename: `src/routes-admin.js` → `src/routes/admin.js`
- Create: `src/middleware/auth.js`
- Create: `src/middleware/rate-limit.js`
- Restructure: templates `views/` tetap ada untuk SSR gradual migration

**Interfaces:**
- Consumes: existing `src/auth.js`, `src/session.js`, `src/broadcast.js`, `src/db.js`
- Produces: `app.use('/api', apiRouter)`, `app.use('/api', adminRouter)` — sama seperti sekarang

### Step 1: Create `src/middleware/auth.js`

```js
import { verifyToken, getUserById } from '../auth.js';

export function requireAuth(req, res, next) {
    const token = req.cookies?.token;
    if (!token) return res.redirect('/login');
    const decoded = verifyToken(token);
    if (!decoded) return res.clearCookie('token').redirect('/login');
    req.user = decoded;
    next();
}

export function requireApiAuth(req, res, next) {
    const header = req.headers['authorization'];
    if (header && header.startsWith('Bearer ')) {
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

export function optionalAuth(req, res, next) {
    const header = req.headers['authorization'];
    if (header && header.startsWith('Bearer ')) {
        const decoded = verifyToken(header.slice(7));
        if (decoded) req.user = decoded;
    }
    next();
}

export function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
        if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
        next();
    };
}
```

### Step 2: Create `src/middleware/rate-limit.js`

```js
const attempts = new Map();
const WINDOW = 60000;
const MAX = 10;

export function rateLimitLogin(req, res, next) {
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = attempts.get(ip);
    if (!entry || now - entry.start > WINDOW) {
        attempts.set(ip, { start: now, count: 1 });
        return next();
    }
    entry.count++;
    if (entry.count > MAX) return res.status(429).json({ error: 'Too many login attempts. Try again in a minute.' });
    next();
}
```

### Step 3: Rename `src/routes.js` → `src/routes/api.js`

Ubah export default jadi `export default router` (sama, tidak perlu perubahan konten, hanya nama file).

### Step 4: Rename `src/routes-admin.js` → `src/routes/admin.js`

- Hapus `rateLimitLogin` dari file ini (pindah ke middleware).
- Import dari `../middleware/rate-limit.js`:
  ```js
  import { rateLimitLogin } from '../middleware/rate-limit.js';
  ```
- Import dari `../middleware/auth.js`:
  ```js
  import { requireApiAuth, requireRole } from '../middleware/auth.js';
  ```
- Ganti semua `authMiddleware` → `requireApiAuth`.
- Export: `export { default, logAudit }`.

### Step 5: Refactor `server.mjs`

```js
import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import cors from 'cors';
import pino from 'pino';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './src/db.js';
import { seedAdminUser } from './src/auth.js';
import { connectSession } from './src/session.js';
import { startWebhookProcessor } from './src/webhook.js';
import { startBroadcastProcessor } from './src/broadcast.js';
import { requireAuth } from './src/middleware/auth.js';

// Route modules
import apiRouter from './src/routes/api.js';
import adminRouter from './src/routes/admin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = parseInt(process.env.PORT || '2785', 10);
const logger = pino({ level: process.env.LOG_LEVEL || 'silent' });

seedAdminUser();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(cookieParser());
app.use(express.json());
app.use('/assets', express.static(path.join(__dirname, 'public', 'assets')));
app.use('/assets/images', express.static(path.join(__dirname, 'frontend', 'public', 'images')));

const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || 'https://wa.gampong.web.id,http://localhost:2785').split(',');
app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
app.use(helmet({ contentSecurityPolicy: false, hsts: { maxAge: 31536000, includeSubDomains: true } }));
app.use((_req, res, next) => {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
});

app.use('/api', (req, _res, next) => {
    if (req.cookies?.token) req.headers.authorization = 'Bearer ' + req.cookies.token;
    next();
});

app.use('/api', apiRouter);
app.use('/api', adminRouter);

// SSR pages — tetap inline, dipindah gradual ke route module
app.get('/register', (req, res) => res.redirect('/login'));
app.get('/login', (req, res) => { /* ... */ });
app.get('/', (req, res) => { /* ... */ });
app.get('/dashboard', requireAuth, (req, res) => { /* ... */ });
// ... ssr routes lainnya tetap di sini

app.get('/docs', (req, res) => { /* ... */ });

startWebhookProcessor();
startBroadcastProcessor();

app.listen(PORT, process.env.HOST || '0.0.0.0', () => {
    logger.info(`WhatsApp Gateway v5 running on http://localhost:${PORT}`);
    const existing = db.prepare('SELECT session_id FROM sessions').all();
    for (const { session_id } of existing) {
        connectSession(session_id).catch(e => logger.error(`[${session_id}] ${e.message}`));
    }
});

process.on('SIGTERM', () => { logger.info('Shutting down...'); process.exit(0); });
process.on('SIGINT', () => { logger.info('Shutting down...'); process.exit(0); });
```

> ponytail: SSR routes tetap inline — dipindah ke route module nanti saat view sudah full Vue SPA.

---

## Task 2: Integrasi Vue SPA (TailAdmin) dengan Express

**Files:**
- Modify: `vue-tailwind-admin-dashboard-main/vite.config.ts`
- Create: `vue-tailwind-admin-dashboard-main/.env.development`
- Modify: `server.mjs` (serve static + SPA fallback)
- Modify: `vue-tailwind-admin-dashboard-main/package.json` (add pinia, axios)

**Interfaces:**
- Dev: Vite dev server port 5173, proxy `/api` → `http://localhost:2785`
- Prod: `vite build` output ke `public/`, Express serve static + SPA fallback

### Step 1: Modify `vue-tailwind-admin-dashboard-main/vite.config.ts`

```ts
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'

export default defineConfig({
    plugins: [vue(), vueJsx()],
    resolve: {
        alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://localhost:2785',
                changeOrigin: true,
            },
        },
    },
    build: {
        outDir: '../public',
        emptyOutDir: true,
    },
})
```

### Step 2: Add SPA static serving + fallback di `server.mjs`

```js
// Setelah semua route API — SPA fallback
const publicDir = path.join(__dirname, 'public');
if (fs.existsSync(path.join(publicDir, 'index.html'))) {
    app.use(express.static(publicDir));
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api/') || req.path.startsWith('/auth/') || req.path.startsWith('/assets/')) return next();
        res.sendFile(path.join(publicDir, 'index.html'));
    });
}
```

### Step 3: Development workflow — `package.json` root

```json
"scripts": {
    "dev": "concurrently \"node server.mjs\" \"cd frontend && npm run dev\"",
    "start": "node server.mjs",
    "build:frontend": "cd frontend && npm run build",
    "dev:server": "node server.mjs",
    "dev:client": "cd frontend && npm run dev"
}
```

Tambahkan `concurrently` ke devDependencies: `npm install -D concurrently`.

---

## Task 3: API Service Layer di Vue

**Files:**
- Create: `src/api/axios.js`
- Create: `src/api/sessions.js`
- Create: `src/api/users.js`
- Create: `src/api/devices.js`
- Create: `src/api/broadcast.js`
- Create: `src/api/logs.js`

### Step 1: Create `src/api/axios.js`

```ts
import axios from 'axios'

const api = axios.create({
    baseURL: '/api',
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true,
})

api.interceptors.request.use(config => {
    const token = localStorage.getItem('token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
})

api.interceptors.response.use(
    res => res,
    err => {
        if (err.response?.status === 401) {
            localStorage.removeItem('token')
            window.location.href = '/signin'
        }
        return Promise.reject(err)
    }
)

export default api
```

### Step 2: Create `src/api/sessions.js`

```ts
import api from './axios'

export function getSessions() { return api.get('/sessions').then(r => r.data) }

export function createSession(data) { return api.post('/sessions', data).then(r => r.data) }

export function getSessionStatus(id) { return api.get(`/sessions/${id}/status`).then(r => r.data) }

export function getSessionQR(id, format) {
    return api.get(`/sessions/${id}/qr`, { params: { format } }).then(r => r.data)
}

export function updateSessionWebhook(id, data) {
    return api.put(`/sessions/${id}/webhook`, data).then(r => r.data)
}

export function updateSession(id, data) {
    return api.put(`/sessions/${id}`, data).then(r => r.data)
}

export function deleteSession(id) { return api.delete(`/sessions/${id}`).then(r => r.data) }

export function sendMessage(id, data) {
    return api.post(`/sessions/${id}/messages`, data).then(r => r.data)
}

export function getMessages(id) { return api.get(`/sessions/${id}/messages`).then(r => r.data) }
```

### Step 3: Create `src/api/users.js`

```ts
import api from './axios'

export function getUsers() { return api.get('/admin/users').then(r => r.data) }

export function createUser(data) { return api.post('/auth/register', data).then(r => r.data) }

export function deleteUser(id) { return api.delete(`/admin/users/${id}`).then(r => r.data) }
```

### Step 4: Create `src/api/devices.js`

```ts
import api from './axios'
// alias: sessions dikenal sebagai devices di UI
export { getSessions as getDevices, getSessionStatus as getDeviceStatus, deleteSession as deleteDevice } from './sessions'
```

### Step 5: Create `src/api/broadcast.js`

```ts
import api from './axios'

export function sendBroadcast(sessionId, data) {
    return api.post(`/sessions/${sessionId}/broadcast`, data).then(r => r.data)
}
```

### Step 6: Create `src/api/logs.js`

```ts
import api from './axios'

export function getWebhooks(params) { return api.get('/admin/webhooks', { params }).then(r => r.data) }

export function retryWebhook(id) { return api.post(`/admin/webhooks/${id}/retry`).then(r => r.data) }

export function getAuditLogs() { return api.get('/admin/audit').then(r => r.data) }

export function getDeadLetters(params) { return api.get('/admin/dead-letter', { params }).then(r => r.data) }
```

---

## Task 4: Pinia Store

**Files:**
- Create: `src/stores/auth.ts`
- Create: `src/stores/sessions.ts`
- Create: `src/stores/stats.ts`
- Modify: `src/main.ts` (register Pinia)
- Modify: `src/router/index.ts` (route guards)

### Step 1: Register Pinia di `src/main.ts`

```ts
import { createPinia } from 'pinia'
// ...
const pinia = createPinia()
app.use(pinia)
```

### Step 2: Create `src/stores/auth.ts`

```ts
import { defineStore } from 'pinia'
import api from '@/api/axios'

export const useAuthStore = defineStore('auth', {
    state: () => ({
        user: null as null | { id: string, username: string, email: string, role: string },
        token: localStorage.getItem('token') || null,
        loading: false,
    }),

    getters: {
        isAuthenticated: state => !!state.token,
        isSuperAdmin: state => state.user?.role === 'superadmin',
        isAdmin: state => state.user?.role === 'admin' || state.user?.role === 'superadmin',
    },

    actions: {
        async login(username: string, password: string) {
            this.loading = true
            try {
                const res = await api.post('/auth/login', { username, password })
                this.user = res.data.user
                const tokenRes = await api.get('/auth/token')
                this.token = tokenRes.data.token
                localStorage.setItem('token', this.token!)
            } finally {
                this.loading = false
            }
        },

        async fetchProfile() {
            try {
                const res = await api.get('/auth/me')
                this.user = res.data
            } catch {
                this.logout()
            }
        },

        logout() {
            this.user = null
            this.token = null
            localStorage.removeItem('token')
            api.get('/auth/logout').catch(() => {})
            window.location.href = '/signin'
        },
    },
})
```

### Step 3: Route guards di `src/router/index.ts`

```ts
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/signin',
            name: 'Signin',
            component: () => import('../views/Auth/Signin.vue'),
            meta: { title: 'Sign In', guest: true },
        },
        {
            path: '/',
            name: 'Dashboard',
            component: () => import('../views/Ecommerce.vue'),
            meta: { title: 'Dashboard', requiresAuth: true },
        },
        {
            path: '/sessions',
            name: 'Sessions',
            component: () => import('../views/Sessions/Sessions.vue'),
            meta: { title: 'Sessions', requiresAuth: true },
        },
        {
            path: '/sessions/:id',
            name: 'SessionDetail',
            component: () => import('../views/Sessions/SessionDetail.vue'),
            meta: { title: 'Session Detail', requiresAuth: true },
        },
        {
            path: '/messages',
            name: 'Messages',
            component: () => import('../views/Messages/Messages.vue'),
            meta: { title: 'Messages', requiresAuth: true },
        },
        {
            path: '/users',
            name: 'Users',
            component: () => import('../views/Users/Users.vue'),
            meta: { title: 'Users', requiresAuth: true, roles: ['superadmin', 'admin'] },
        },
        {
            path: '/settings',
            name: 'Settings',
            component: () => import('../views/Settings/Settings.vue'),
            meta: { title: 'Settings', requiresAuth: true },
        },
        // ... routes existing TailAdmin tetap ada
    ],
})

router.beforeEach((to, _from, next) => {
    document.title = `${to.meta.title || 'Dashboard'} | WA Gateway`

    const auth = useAuthStore()
    const requiresAuth = to.meta.requiresAuth as boolean | undefined
    const guest = to.meta.guest as boolean | undefined
    const roles = to.meta.roles as string[] | undefined

    if (requiresAuth && !auth.isAuthenticated) {
        return next('/signin')
    }
    if (guest && auth.isAuthenticated) {
        return next('/')
    }
    if (roles && auth.user && !roles.includes(auth.user.role)) {
        return next('/')
    }
    next()
})

export default router
```

### Step 4: Create `src/stores/sessions.ts`

```ts
import { defineStore } from 'pinia'
import * as sessionsApi from '@/api/sessions'

export const useSessionsStore = defineStore('sessions', {
    state: () => ({
        list: [] as any[],
        current: null as any | null,
        loading: false,
    }),

    actions: {
        async fetchAll() {
            this.loading = true
            try { this.list = await sessionsApi.getSessions() }
            finally { this.loading = false }
        },

        async create(data: any) {
            const res = await sessionsApi.createSession(data)
            await this.fetchAll()
            return res
        },

        async remove(id: string) {
            await sessionsApi.deleteSession(id)
            this.list = this.list.filter(s => s.session_id !== id)
        },
    },
})
```

### Step 5: Create `src/stores/stats.ts`

```ts
import { defineStore } from 'pinia'
import api from '@/api/axios'

export const useStatsStore = defineStore('stats', {
    state: () => ({
        totalSessions: 0,
        onlineSessions: 0,
        totalMessages: 0,
        sentMessages: 0,
        failedMessages: 0,
        totalContacts: 0,
        pendingWebhooks: 0,
        loading: false,
    }),

    actions: {
        async fetch() {
            this.loading = true
            try {
                const res = await api.get('/admin/stats')
                Object.assign(this, res.data)
            } finally { this.loading = false }
        },
    },
})
```

---

## Task 5: CRUD Pattern — Contoh untuk Sessions

**Files:**
- Create: `src/services/sessionService.js`
- Create: `src/controllers/sessionController.js`
- Modify: `src/routes/api.js` (gunakan controller)

**Interfaces:**
- `sessionService` → pure functions, panggil db, return data/throw error
- `sessionController` → express handler, panggil service, wrap response

### Step 1: `src/services/sessionService.js`

```js
import db from '../db.js';
import { connectSession, deleteSession } from '../session.js';

export function listSessions(tenantId) {
    if (tenantId) return db.prepareGetSessionsByTenant.all(tenantId);
    return db.prepareGetSessions.all();
}

export function getSessionById(id) {
    return db.prepareGetSession.get(id);
}

export function createSession({ session_id, webhook_url, webhook_secret, session_type, tenant_id }) {
    const existing = db.prepareGetSession.get(session_id);
    if (existing) throw Object.assign(new Error('Session already exists'), { status: 409 });

    const tenantId = tenant_id || null;
    const sType = session_type || 'default';
    const now = Date.now();

    db.prepareUpsertSession.run(session_id, 'disconnected', now, now);
    if (tenantId) {
        db.prepare('UPDATE sessions SET tenant_id = ?, session_type = ? WHERE session_id = ?').run(tenantId, sType, session_id);
    }
    if (webhook_url) db.prepareUpdateSessionWebhook.run(webhook_url, webhook_secret || null, now, session_id);

    connectSession(session_id).catch(() => {});
    return { session_id, tenant_id: tenantId, session_type: sType };
}

export function updateSession(id, fields) {
    const session = db.prepareGetSession.get(id);
    if (!session) throw Object.assign(new Error('Session not found'), { status: 404 });

    const updates = [];
    const params = [];
    if (fields.tenant_id !== undefined) { updates.push('tenant_id = ?'); params.push(fields.tenant_id); }
    if (fields.session_type !== undefined) { updates.push('session_type = ?'); params.push(fields.session_type); }
    if (updates.length) {
        updates.push('updated_at = ?');
        params.push(Date.now(), id);
        db.prepare(`UPDATE sessions SET ${updates.join(', ')} WHERE session_id = ?`).run(...params);
    }
    if (fields.webhook_url !== undefined) {
        db.prepareUpdateSessionWebhook.run(fields.webhook_url, fields.webhook_secret || null, Date.now(), id);
    }
    return { success: true };
}

export function removeSession(id) {
    deleteSession(id);
    return { success: true };
}
```

### Step 2: `src/controllers/sessionController.js`

```js
import * as sessionService from '../services/sessionService.js';

export function list(req, res) {
    const tenantId = req.tenant?.tenant_id;
    const sessions = sessionService.listSessions(tenantId);
    res.json(sessions);
}

export function create(req, res) {
    try {
        const result = sessionService.createSession({
            session_id: req.body.session_id,
            webhook_url: req.body.webhook_url,
            webhook_secret: req.body.webhook_secret,
            session_type: req.body.session_type,
            tenant_id: req.body.tenant_id || req.tenant?.tenant_id,
        });
        res.status(201).json(result);
    } catch (e) {
        res.status(e.status || 500).json({ error: e.message });
    }
}

export function show(req, res) {
    const session = sessionService.getSessionById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    const live = getSessionStatus(req.params.id);
    res.json({ ...session, status: live.status, qr: live.qr });
}

export function update(req, res) {
    try {
        const result = sessionService.updateSession(req.params.id, req.body);
        res.json(result);
    } catch (e) {
        res.status(e.status || 500).json({ error: e.message });
    }
}

export function remove(req, res) {
    sessionService.removeSession(req.params.id);
    res.json({ success: true });
}
```

### Step 3: Integrasi ke `src/routes/api.js`

```js
import * as sessionController from '../controllers/sessionController.js';

router.get('/sessions', sessionController.list);
router.post('/sessions', sessionController.create);
router.get('/sessions/:id', requireTenantOwnership, sessionController.show);
router.put('/sessions/:id', requireTenantOwnership, sessionController.update);
router.delete('/sessions/:id', requireTenantOwnership, sessionController.remove);
```

---

## Task 6: Dual-write Implementation

**Files:**
- Create: `src/dual-write.js`
- Modify: `src/services/sessionService.js` (panggil dual-write di setiap write)

### Step 1: `src/dual-write.js`

```js
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;

const HEADERS = SUPABASE_URL && SUPABASE_KEY ? {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal,resolution=merge-duplicates',
} : null;

export function dualWrite(table, rows) {
    if (!HEADERS || !rows.length) return;
    fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify(rows),
    }).catch(() => {});
}
```

### Step 2: Panggil di service layer

```js
import { dualWrite } from '../dual-write.js';

export function createSession(data) {
    // ... write ke SQLite
    db.prepareUpsertSession.run(session_id, 'disconnected', now, now);

    // fire-and-forget ke Supabase
    dualWrite('sessions', [{ session_id, status: 'disconnected', created_at: now, updated_at: now }]);

    return { session_id, tenant_id: tenantId };
}
```

```js
// Ponytail: sync.js yang existing (periodic fullscan SELECT *) TETAP berjalan untuk catch-up.
// dual-write.js adalah lapisan write-time tambahan untuk real-time backup.
// Hapus sync.js nanti saat dual-write sudah mature.
```

---

## Task 7: Package.json Updates

### Root `package.json` — tambahkan:

```json
"devDependencies": {
    "concurrently": "^9.1.0"
}
```

### `frontend/package.json` — tambahkan:

```json
"dependencies": {
    "pinia": "^3.0.0",
    "axios": "^1.7.0"
}
```

### Install:

```bash
npm install -D concurrently
cd frontend && npm install pinia axios
```

---

## Ringkasan Task Execution Order

| # | Task | Files Changed | Dependencies |
|---|------|--------------|--------------|
| 1 | Refactor server.mjs + route structure | 5 files | None |
| 2 | Integrate Vue SPA with Express | 3 files | Task 1 |
| 3 | API service layer (Axios) | 6 files | None |
| 4 | Pinia stores + route guards | 5 files | Task 3 |
| 5 | CRUD pattern (Sessions) | 3 files | Task 1 |
| 6 | Dual-write Supabase | 2 files | None |
| 7 | Package.json updates | 2 files | None |
