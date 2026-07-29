import express from 'express';
import crypto from 'crypto';
import db from '../db.js';
import { requireApiAuth, requireRole, generateToken, verifyToken, verifyPassword, hashPassword, createUser, getUserByUsername, getUserById } from '../auth.js';

const router = express.Router();

// ── Rate limiting (login brute-force protection) ─────────────────────────
const loginAttempts = new Map(); // ponytail: in-memory, per-IP, resets on restart
const RATE_WINDOW = 60000; // 1 minute
const RATE_MAX = 10; // max attempts per window

function rateLimitLogin(req, res, next) {
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = loginAttempts.get(ip);
    if (!entry || now - entry.start > RATE_WINDOW) {
        loginAttempts.set(ip, { start: now, count: 1 });
        return next();
    }
    entry.count++;
    if (entry.count > RATE_MAX) return res.status(429).json({ error: 'Too many login attempts. Try again in a minute.' });
    next();
}

// ── Auth Routes ──────────────────────────────────────────────────────────

router.post('/api/auth/login', rateLimitLogin, (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    const user = getUserByUsername(username);
    if (!user || !verifyPassword(password, user.password_hash)) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    const accessToken = generateToken(user, '15m');
    const refreshToken = generateToken(user, '7d');
    const secure = process.env.NODE_ENV === 'production';
    res.cookie('refresh_token', refreshToken, { httpOnly: true, sameSite: 'strict', secure, maxAge: 7 * 86400000, path: '/api/auth' });
    logAudit(user.id, 'login', 'auth', { method: 'password' }, req.ip);
    res.json({ access_token: accessToken, user: { id: user.id, username: user.username, email: user.email, role: user.role } });
});

// ponytail: refresh endpoint — reads httpOnly cookie, returns new access_token
router.get('/api/auth/refresh', (req, res) => {
    const refreshToken = req.cookies?.refresh_token;
    if (!refreshToken) return res.status(401).json({ error: 'No refresh token' });
    const decoded = verifyToken(refreshToken);
    if (!decoded) {
        res.clearCookie('refresh_token', { path: '/api/auth' });
        return res.status(401).json({ error: 'Refresh token expired' });
    }
    const user = getUserById(decoded.id);
    if (!user) return res.status(401).json({ error: 'User not found' });
    const accessToken = generateToken(user, '15m');
    res.json({ access_token: accessToken });
});

router.post('/api/auth/logout', (req, res) => {
    res.clearCookie('refresh_token', { path: '/api/auth' });
    res.json({ success: true });
});

// ponytail: public register — rate limited, creates client-role user
const registerAttempts = new Map();
router.post('/api/auth/register', (req, res) => {
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = registerAttempts.get(ip);
    if (entry && now - entry.start < 3600000 && entry.count >= 3) {
        return res.status(429).json({ error: 'Too many registrations from this IP. Try again in an hour.' });
    }
    if (!entry || now - entry.start >= 3600000) {
        registerAttempts.set(ip, { start: now, count: 1 });
    } else {
        entry.count++;
    }
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: 'username, email, password required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    try {
        const user = createUser({ username, email, password, role: 'client' });
        res.status(201).json({ success: true, user });
    } catch (e) {
        res.status(409).json({ error: 'Username or email already exists' });
    }
});

// ponytail: forgot-password — always return success to prevent email enumeration
router.post('/api/auth/forgot-password', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (user) {
        const token = crypto.randomUUID();
        db.prepare('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?').run(token, Date.now() + 3600000, user.id);
    }
    res.json({ success: true });
});

router.post('/api/auth/reset-password', (req, res) => {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token and password required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    const user = db.prepare('SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > ?').get(token, Date.now());
    if (!user) return res.status(400).json({ error: 'Invalid or expired token' });
    db.prepare('UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?').run(hashPassword(password), user.id);
    res.json({ success: true });
});

router.post('/api/auth/register-admin', requireApiAuth, requireRole('superadmin'), (req, res) => {
    const { username, email, password, role } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: 'username, email, password required' });
    try {
        const user = createUser({ username, email, password, role });
        logAudit(req.user.id, 'create_user', `users/${user.id}`, { username, role }, req.ip);
        res.json({ success: true, user });
    } catch (e) {
        res.status(409).json({ error: 'Username or email already exists' });
    }
});

router.get('/api/auth/me', (req, res) => {
    const header = req.headers['authorization'];
    if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ error: 'No access token' });
    const decoded = verifyToken(header.slice(7));
    if (!decoded) return res.status(401).json({ error: 'Access token expired' });
    const user = getUserById(decoded.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
});

// ── Admin: Users ─────────────────────────────────────────────────────────

router.get('/api/admin/users', requireApiAuth, requireRole('superadmin', 'admin'), (_req, res) => {
    const users = db.prepare('SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC').all();
    res.json(users);
});

router.delete('/api/admin/users/:id', requireApiAuth, requireRole('superadmin'), (req, res) => {
    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    logAudit(req.user.id, 'delete_user', `users/${req.params.id}`, {}, req.ip);
    res.json({ success: true });
});

// ── Admin: Tenants (P7) ─────────────────────────────────────────────────

router.get('/api/admin/tenants', requireApiAuth, requireRole('superadmin', 'admin'), (_req, res) => {
    const tenants = db.prepareGetTenants.all();
    res.json(tenants.map(t => ({ ...t, api_key: t.api_key.slice(0, 12) + '...' }))); // Mask key
});

router.post('/api/admin/tenants', requireApiAuth, requireRole('superadmin'), (req, res) => {
    const { name, slug, webhook_url, webhook_secret } = req.body;
    if (!name || !slug) return res.status(400).json({ error: 'name and slug required' });

    const tenantId = 'tn_' + crypto.randomBytes(12).toString('hex');
    const apiKey = 'sk_live_' + crypto.randomBytes(24).toString('hex');
    const now = Date.now();

    try {
        db.prepareInsertTenant.run(tenantId, name, slug, apiKey, webhook_url || null, webhook_secret || null, now, now);
        res.json({ success: true, tenant_id: tenantId, api_key: apiKey, name, slug });
    } catch (e) {
        res.status(409).json({ error: 'Slug already exists' });
    }
});

router.put('/api/admin/tenants/:id', requireApiAuth, requireRole('superadmin'), (req, res) => {
    const { name, webhook_url, webhook_secret } = req.body;
    const tenant = db.prepareGetTenantById.get(req.params.id);
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
    db.prepareUpdateTenant.run(name || tenant.name, webhook_url ?? tenant.webhook_url, webhook_secret ?? tenant.webhook_secret, Date.now(), req.params.id);
    res.json({ success: true });
});

router.delete('/api/admin/tenants/:id', requireApiAuth, requireRole('superadmin'), (req, res) => {
    db.prepareDeleteTenant.run(req.params.id);
    res.json({ success: true });
});

// ── Dashboard Stats ──────────────────────────────────────────────────────

router.get('/api/admin/stats', requireApiAuth, (req, res) => {
    let sessions;
    if (req.user?.role === 'superadmin' || req.user?.role === 'admin') {
        sessions = db.prepare('SELECT * FROM sessions ORDER BY created_at DESC').all();
    } else {
        sessions = db.prepare(`
            SELECT s.* FROM sessions s
            JOIN user_sessions us ON s.session_id = us.session_id
            WHERE us.user_id = ?
        `).all(req.user?.id);
    }

    const totalSessions = sessions.length;
    const onlineSessions = sessions.filter(s => s.status === 'connected').length;
    const totalMessages = sessions.reduce((sum, s) => sum + (s.msg_sent || 0) + (s.msg_failed || 0), 0);
    const sentMessages = sessions.reduce((sum, s) => sum + (s.msg_sent || 0), 0);
    const failedMessages = sessions.reduce((sum, s) => sum + (s.msg_failed || 0), 0);
    const totalContacts = sessions.reduce((sum, s) => {
        const count = db.prepare('SELECT COUNT(*) as c FROM user_profiles WHERE session_id = ?').get(s.session_id);
        return sum + (count?.c || 0);
    }, 0);
    const pendingWebhooks = sessions.reduce((sum, s) => {
        const count = db.prepare("SELECT COUNT(*) as c FROM webhook_outbox WHERE session_id = ? AND status = 'pending'").get(s.session_id);
        return sum + (count?.c || 0);
    }, 0);

    res.json({ totalSessions, onlineSessions, totalMessages, sentMessages, failedMessages, totalContacts, pendingWebhooks });
});

router.get('/api/admin/stats/messages', requireApiAuth, (req, res) => {
    const days = parseInt(req.query.days || '7');
    const since = Date.now() - days * 86400000;
    const rows = db.prepare(`
        SELECT strftime('%Y-%m-%d', created_at/1000, 'unixepoch') as date,
               COUNT(*) as count,
               SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
               SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
        FROM messages WHERE created_at > ?
        GROUP BY date ORDER BY date
    `).all(since);
    res.json(rows);
});

router.get('/api/admin/stats/sessions', requireApiAuth, (req, res) => {
    const sessions = db.prepare('SELECT * FROM sessions ORDER BY created_at DESC').all();
    res.json(sessions.map(s => ({
        session_id: s.session_id, status: s.status, tenant_id: s.tenant_id,
        session_type: s.session_type, msg_sent: s.msg_sent, msg_failed: s.msg_failed,
        created_at: s.created_at, updated_at: s.updated_at
    })));
});

// ── Admin: Messages ──────────────────────────────────────────────────────

router.get('/api/admin/messages', requireApiAuth, (req, res) => {
    const { session_id, status, type, limit = 50, offset = 0 } = req.query;
    let sql = 'SELECT * FROM messages WHERE 1=1';
    const params = [];
    if (session_id) { sql += ' AND session_id = ?'; params.push(session_id); }
    if (status) { sql += ' AND status = ?'; params.push(status); }
    if (type) { sql += ' AND type = ?'; params.push(type); }
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    res.json(db.prepare(sql).all(...params));
});

// ── Admin: Webhook Logs ──────────────────────────────────────────────────

router.get('/api/admin/webhooks', requireApiAuth, (req, res) => {
    const { session_id, status } = req.query;
    let sql = 'SELECT * FROM webhook_outbox WHERE 1=1';
    const params = [];
    if (session_id) { sql += ' AND session_id = ?'; params.push(session_id); }
    if (status) { sql += ' AND status = ?'; params.push(status); }
    sql += ' ORDER BY created_at DESC LIMIT 100';
    res.json(db.prepare(sql).all(...params));
});

router.post('/api/admin/webhooks/:id/retry', requireApiAuth, (_req, res) => {
    db.prepare("UPDATE webhook_outbox SET status = 'pending', retry_count = 0 WHERE id = ?").run(_req.params.id);
    res.json({ success: true });
});

// ── Admin: Dead Letter (P5) ─────────────────────────────────────────────

router.get('/api/admin/dead-letter', requireApiAuth, (req, res) => {
    const { session_id } = req.query;
    if (session_id) {
        res.json(db.prepareGetDeadLetters.all(session_id));
    } else {
        res.json(db.prepare('SELECT * FROM webhook_dead_letter ORDER BY created_at DESC LIMIT 200').all());
    }
});

// ── Admin: API Keys ──────────────────────────────────────────────────────

router.get('/api/admin/api-keys', requireApiAuth, (req, res) => {
    const keys = db.prepare('SELECT id, name, scopes, last_used_at, created_at FROM api_keys WHERE user_id = ?').all(req.user.id);
    res.json(keys);
});

router.post('/api/admin/api-keys', requireApiAuth, (req, res) => {
    const { name, scopes = 'read' } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const id = crypto.randomUUID();
    const rawKey = `wagw_${crypto.randomBytes(24).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const now = Date.now();
    db.prepare('INSERT INTO api_keys (id, user_id, name, key_hash, scopes, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(id, req.user.id, name, keyHash, scopes, now);
    res.json({ success: true, id, name, rawKey, scopes });
});

router.delete('/api/admin/api-keys/:id', requireApiAuth, (req, res) => {
    db.prepare('DELETE FROM api_keys WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    res.json({ success: true });
});

// ── Admin: Settings ──────────────────────────────────────────────────────

router.get('/api/admin/settings', requireApiAuth, (_req, res) => {
    res.json({
        port: process.env.PORT || '2785',
        rateLimitMs: process.env.RATE_LIMIT_MS || '1500',
        webhookUrl: process.env.WEBHOOK_URL || '',
        logLevel: process.env.LOG_LEVEL || 'silent',
        nodeVersion: process.version,
        uptime: Math.round(process.uptime()),
        totalTenants: db.prepare('SELECT COUNT(*) as c FROM tenants').get().c,
        totalSessions: db.prepare('SELECT COUNT(*) as c FROM sessions').get().c,
    });
});

// ── Admin: Contacts ──────────────────────────────────────────────────────

router.get('/api/admin/contacts', requireApiAuth, (req, res) => {
    const { session_id } = req.query;
    let sql = 'SELECT * FROM user_profiles';
    const params = [];
    if (session_id) { sql += ' WHERE session_id = ?'; params.push(session_id); }
    sql += ' ORDER BY updated_at DESC LIMIT 200';
    res.json(db.prepare(sql).all(...params));
});

router.get('/api/admin/contacts/personas', requireApiAuth, (req, res) => {
    const rows = db.prepare('SELECT persona, COUNT(*) as count FROM user_profiles GROUP BY persona').all();
    res.json(rows);
});

// ── Admin: Audit Log ─────────────────────────────────────────────────────

router.get('/api/admin/audit', requireApiAuth, requireRole('superadmin'), (req, res) => {
    const rows = db.prepare('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 100').all();
    res.json(rows);
});

// ── Admin: Roles (RBAC) ────────────────────────────────────────────────

router.get('/api/admin/roles', requireApiAuth, requireRole('superadmin', 'admin'), (_req, res) => {
    const roles = db.prepareGetRoles.all();
    res.json(roles.map(r => ({ ...r, permissions: JSON.parse(r.permissions || '[]') })));
});

router.post('/api/admin/roles', requireApiAuth, requireRole('superadmin'), (req, res) => {
    const { name, description, permissions } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    try {
        const existing = db.prepareGetRoleByName.get(name);
        if (existing) return res.status(409).json({ error: 'Role already exists' });
        
        const id = 'role_' + crypto.randomBytes(8).toString('hex');
        const now = Date.now();
        db.prepareInsertRole.run(id, name, description || '', JSON.stringify(permissions || []), 0, now);
        res.json({ success: true, id, name, description, permissions });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.put('/api/admin/roles/:name', requireApiAuth, requireRole('superadmin'), (req, res) => {
    const { description, permissions } = req.body;
    const existing = db.prepareGetRoleByName.get(req.params.name);
    if (!existing) return res.status(404).json({ error: 'Role not found' });
    if (existing.is_system) return res.status(400).json({ error: 'Cannot modify system role' });
    
    const now = Date.now();
    db.prepareUpdateRole.run(
        description ?? existing.description,
        permissions ? JSON.stringify(permissions) : existing.permissions,
        now, req.params.name
    );
    res.json({ success: true });
});

router.delete('/api/admin/roles/:name', requireApiAuth, requireRole('superadmin'), (req, res) => {
    const existing = db.prepareGetRoleByName.get(req.params.name);
    if (!existing) return res.status(404).json({ error: 'Role not found' });
    if (existing.is_system) return res.status(400).json({ error: 'Cannot delete system role' });
    
    db.prepareDeleteRole.run(req.params.name);
    res.json({ success: true });
});

// ── Admin: Tenant Packages ────────────────────────────────────────────

router.get('/api/admin/tenants/:id/package', requireApiAuth, requireRole('superadmin', 'admin'), (req, res) => {
    const pkg = db.prepareGetPackageByTenant.get(req.params.id);
    if (!pkg) return res.status(404).json({ error: 'No package found' });
    res.json({ ...pkg, features: JSON.parse(pkg.features || '[]') });
});

router.put('/api/admin/tenants/:id/package', requireApiAuth, requireRole('superadmin'), (req, res) => {
    const { package_name, max_sessions, max_messages_per_day, max_broadcasts_per_day, features, expires_at } = req.body;
    const existing = db.prepareGetPackageByTenant.get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'No package found' });
    
    const now = Date.now();
    db.prepareUpsertPackage.run(
        existing.id,
        req.params.id,
        package_name ?? existing.package_name,
        max_sessions ?? existing.max_sessions,
        max_messages_per_day ?? existing.max_messages_per_day,
        max_broadcasts_per_day ?? existing.max_broadcasts_per_day,
        features ? JSON.stringify(features) : existing.features,
        expires_at ?? existing.expires_at,
        existing.created_at, now
    );
    res.json({ success: true });
});

router.post('/api/admin/tenants/:id/package', requireApiAuth, requireRole('superadmin'), (req, res) => {
    const { package_name, max_sessions, max_messages_per_day, max_broadcasts_per_day, features, expires_at } = req.body;
    if (!package_name) return res.status(400).json({ error: 'package_name required' });
    
    const tenant = db.prepareGetTenantById.get(req.params.id);
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
    
    const existing = db.prepareGetPackageByTenant.get(req.params.id);
    if (existing) return res.status(409).json({ error: 'Package already exists. Use PUT to update.' });
    
    const id = 'pkg_' + crypto.randomBytes(8).toString('hex');
    const now = Date.now();
    db.prepareUpsertPackage.run(
        id, req.params.id, package_name,
        max_sessions || 1, max_messages_per_day || 100, max_broadcasts_per_day || 0,
        JSON.stringify(features || []), expires_at || null, now, now
    );
    res.json({ success: true, id, package_name });
});

// ── Admin: Tenant Limits Check ────────────────────────────────────────

router.get('/api/admin/tenants/:id/limits', requireApiAuth, requireRole('superadmin', 'admin'), (req, res) => {
    const tenant = db.prepareGetTenantById.get(req.params.id);
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
    
    const pkg = db.prepareGetPackageByTenant.get(req.params.id);
    if (!pkg) return res.json({ package: null, limits: null });
    
    const todayStart = new Date().setHours(0, 0, 0, 0);
    const sessions = db.prepareCountTenantSessions.get(req.params.id).c;
    const messagesToday = db.prepareCountTenantMessagesToday.get(req.params.id, todayStart).c;
    const broadcastsToday = db.prepareCountTenantBroadcastsToday.get(req.params.id, todayStart).c;
    
    res.json({
        package: pkg.package_name,
        limits: {
            max_sessions: pkg.max_sessions,
            max_messages_per_day: pkg.max_messages_per_day,
            max_broadcasts_per_day: pkg.max_broadcasts_per_day,
        },
        usage: { sessions, messages_today: messagesToday, broadcasts_today: broadcastsToday },
        expires_at: pkg.expires_at,
    });
});

// ── Admin: Sync Status ────────────────────────────────────────────────

router.get('/api/admin/sync/status', requireApiAuth, requireRole('superadmin'), (_req, res) => {
    res.json({ status: 'not configured', message: 'Sync disabled' });
});

// ponytail: sync dihapus — dual-write fire-and-forget gantikan periodic sync

function logAudit(userId, action, resource, details, ip) {
    db.prepare('INSERT INTO audit_log (id, user_id, action, resource, details, ip, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(crypto.randomUUID(), userId, action, resource, JSON.stringify(details), ip || '', Date.now());
}

export { router as default, logAudit };

