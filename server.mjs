// ponytail: WhatsApp Gateway v5 — multi-tenant, priority queue, access+refresh token auth
import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import cors from 'cors';
import pino from 'pino';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import db from './src/db.js';
import apiRouter from './src/routes/api.js';
import adminRouter from './src/routes/admin.js';
import { connectSession, sessions } from './src/session.js';
import { startWebhookProcessor } from './src/webhook.js';
import { startBroadcastProcessor } from './src/broadcast.js';
import { createUser, getUserByUsername } from './src/auth.js';
import { errorHandler } from './src/middleware/error-handler.js';
import { startSync, stopSync } from './src/sync.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = parseInt(process.env.PORT || '2785', 10);
const logger = pino({ level: process.env.LOG_LEVEL || 'silent', redact: ['req.headers.authorization', 'req.headers.cookie', 'body.password', 'body.api_key', 'body.token'] });

// Seed admin user
if (process.env.SEED_ADMIN_USER && process.env.SEED_ADMIN_PASS) {
    if (!getUserByUsername(process.env.SEED_ADMIN_USER)) {
        createUser({
            username: process.env.SEED_ADMIN_USER,
            email: process.env.SEED_ADMIN_EMAIL || 'admin@wagateway.local',
            password: process.env.SEED_ADMIN_PASS,
            role: 'superadmin'
        });
        logger.info(`Seed admin user created: ${process.env.SEED_ADMIN_USER}`);
    }
}

// Middleware
app.set('trust proxy', 1);
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));

// ponytail: security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "cdn.tailwindcss.com"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:"],
            connectSrc: ["'self'", "ws:", "wss:"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            formAction: ["'self'"],
        },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true },
}));
app.use((_req, res, next) => {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
});

// ponytail: CORS
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || 'https://wa.gampong.web.id,https://waaceh.biz.id,http://localhost:2785,http://localhost:5173').split(',');
app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));

// Static files — Vue SPA build
const frontendDist = path.join(__dirname, 'frontend', 'dist');
app.use('/assets', express.static(path.join(frontendDist, 'assets'), { maxAge: '7d', immutable: true }));
app.get('/favicon.ico', (_, r) => r.sendFile(path.join(frontendDist, 'favicon.ico')));

// ── Swagger UI ──────────────────────────────────────────────────────────
const swaggerHtml = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>WaAceh API Docs</title>
<link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
</head>
<body><div id="swagger-ui"></div>
<script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
<script>SwaggerUIBundle({ url: "/api/docs/openapi.json", dom_id: "#swagger-ui", deepLinking: true })</script>
</body></html>`;

app.get('/api/docs', (req, res) => res.type('text/html').send(swaggerHtml));
app.get('/api/docs/openapi.json', (req, res) => res.sendFile(path.join(__dirname, 'docs', 'openapi.json')));

// SPA index
const indexHtml = fs.readFileSync(path.join(frontendDist, 'index.html'), 'utf-8');

// Redirect /admin/* to root (SPA sekarang di /)
app.get(/^\/admin/, (req, res) => {
  const path = req.path.replace('/admin', '') || '/';
  res.redirect(301, path);
});

// API routes
app.use(adminRouter);
app.use(apiRouter);

// Health endpoint
app.get('/api/health', (req, res) => res.json({ status: 'ok', uptime: Math.round(process.uptime()), sessions: db.prepare('SELECT COUNT(*) as c FROM sessions').get().c }));

// SPA fallback — non-API GET routes go to Vue app
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api/') && !req.path.startsWith('/assets/')) {
    return res.set('Content-Type', 'text/html; charset=utf-8').send(indexHtml);
  }
  next();
});

// ── WebSocket ────────────────────────────────────────────────────────────
import { createServer } from 'http';
import { startWebSocketServer, broadcastEvent } from './src/ws.js';

const server = createServer(app);
startWebSocketServer(server);



// ── MCP Server ──────────────────────────────────────────────────────────
import { handleMcpRequest } from './src/mcp.js';
app.post('/mcp', (req, res, next) => {
  if (!handleMcpRequest(req, res)) next();
});
app.get('/mcp', (req, res, next) => {
  if (!handleMcpRequest(req, res)) next();
});

// Error handler
app.use(errorHandler);

// Start
startWebhookProcessor();
startBroadcastProcessor();
startSync();

// GC periodik — 414MB VPS
if (global.gc) setInterval(() => global.gc(), 300000);

// TTL — auto-purge messages > 30 days
setInterval(() => {
    const cutoff = Date.now() - 30 * 86400000;
    db.prepare('DELETE FROM messages WHERE created_at < ?').run(cutoff);
    db.prepare('DELETE FROM behavior_outbox WHERE created_at < ?').run(cutoff);
}, 3600000);

server.listen(PORT, process.env.HOST || '0.0.0.0', () => {
    logger.info(`WhatsApp Gateway v5 running on http://localhost:${PORT}`);
    const existing = db.prepare('SELECT session_id FROM sessions').all();
    for (const { session_id } of existing) {
        connectSession(session_id).catch(e => logger.error(`[${session_id}] ${e.message}`));
    }
});

async function shutdown() {
    logger.info('Shutting down...');
    for (const [sid, session] of sessions.entries()) {
        if (session.sock) {
            try { await session.sock.logout(); } catch {}
            try { session.sock.end(); } catch {}
        }
    }
    stopSync();
    db.pragma('wal_checkpoint(TRUNCATE)');
    db.close();
    process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
