// ponytail: routes — REST API for WhatsApp gateway + behavior engine + multi-tenant
import express from 'express';
import { connectSession, enqueueMessage, getSessionStatus, deleteSession, setWebhook, sessions } from '../session.js';
import { enqueueBroadcast } from '../broadcast.js';
import db from '../db.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import QRCode from 'qrcode';

const router = express.Router();
const LEGACY_API_KEY = process.env.API_KEY || '';

// ponytail: auth middleware — tenant API key (primary) | JWT (admin panel)
function authMiddleware(req, res, next) {
    // 1. Tenant API key (per-tenant, from tenants table)
    const key = req.headers['x-api-key'];
    if (key) {
        const tenant = db.prepareGetTenantByApiKey.get(key);
        if (tenant) {
            req.tenant = tenant;
            return next();
        }
        // Legacy global API key
        if (LEGACY_API_KEY && key === LEGACY_API_KEY) {
            req.isSuperAdmin = true;
            return next();
        }
    }

    // 2. JWT (admin panel — sees everything)
    const header = req.headers['authorization'];
    if (header && header.startsWith('Bearer ')) {
        try {
            const decoded = jwt.verify(header.slice(7), process.env.JWT_SECRET);
            req.user = decoded;
            req.isSuperAdmin = ['superadmin', 'admin'].includes(decoded.role);
            return next();
        } catch {}
    }

    return res.status(401).json({ error: 'Unauthorized' });
}

// ponytail: tenant scope helper — if tenant set, filter by tenant; else all (superadmin)
function tenantScope(tenantId, baseQuery, params = []) {
    if (!tenantId) return { sql: baseQuery, params };
    const hasWhere = baseQuery.includes('WHERE');
    const joinMatch = baseQuery.match(/FROM\s+(\w+)\s+(\w+)/i);
    if (joinMatch) {
        const table = joinMatch[1];
        const alias = joinMatch[2];
        const cond = ` AND ${alias}.tenant_id = ?`;
        const sql = hasWhere ? baseQuery + cond : baseQuery + ' WHERE 1=1' + cond;
        return { sql, params: [...params, tenantId] };
    }
    const cond = hasWhere ? ' AND tenant_id = ?' : ' WHERE tenant_id = ?';
    return { sql: baseQuery + cond, params: [...params, tenantId] };
}

router.use(express.json());
router.use((req, res, next) => {
    if (!req.path.startsWith('/api/')) return next();
    if (req.path === '/api/health') return next();
    authMiddleware(req, res, next);
});

// ponytail: tenant ownership check — blocks cross-tenant access
function requireTenantOwnership(req, res, next) {
    if (req.isSuperAdmin || req.user) return next();
    if (!req.tenant) return res.status(403).json({ error: 'Tenant auth required' });
    const session = db.prepare('SELECT tenant_id FROM sessions WHERE session_id = ?').get(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.tenant_id !== req.tenant.tenant_id) return res.status(403).json({ error: 'Forbidden' });
    next();
}

// ponytail: SSRF protection — block private IPs
function isPrivateIP(hostname) {
    return /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|0\.|localhost|169\.254\.|metadata\.|fc00:|fd00:|fe80:|::1$|0:0:0:0:0:0:0:1$)/.test(hostname);
}

// ── Health ──────────────────────────────────────────────────────────────
router.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', uptime: Math.round(process.uptime()), sessions: sessions.size });
});

// ── Sessions ────────────────────────────────────────────────────────────
router.get('/api/sessions', (req, res) => {
    const result = [];
    for (const [id, session] of sessions.entries()) {
        if (req.tenant) {
            const row = db.prepare('SELECT tenant_id FROM sessions WHERE session_id = ?').get(id);
            if (row && row.tenant_id !== req.tenant.tenant_id) continue;
        }
        result.push({ session_id: id, status: session.status });
    }
    res.json(result);
});

router.post('/api/sessions', (req, res) => {
    const { session_id, webhook_url, webhook_secret, session_type, tenant_id } = req.body;
    if (!session_id) return res.status(400).json({ error: 'session_id required' });
    if (sessions.has(session_id)) return res.status(409).json({ error: 'Session already exists' });
    if (webhook_url) setWebhook(session_id, webhook_url, webhook_secret);
    const tenantId = tenant_id || req.tenant?.tenant_id || null;
    const sType = session_type || 'default';
    const now = Date.now();
    // ponytail: upsert DB first with tenant_id, then connect
    db.prepare(`INSERT OR REPLACE INTO sessions (session_id, status, tenant_id, session_type, created_at, updated_at) VALUES (?, 'disconnected', ?, ?, ?, ?)`)
        .run(session_id, tenantId, sType, now, now);
    connectSession(session_id).catch(() => {});
    res.json({ success: true, session_id, tenant_id: tenantId });
});

router.get('/api/sessions/:id/status', requireTenantOwnership, (req, res) => {
    res.json(getSessionStatus(req.params.id));
});

router.get('/api/sessions/:id/qr', requireTenantOwnership, async (req, res) => {
    const s = getSessionStatus(req.params.id);
    if (!s.qr) return res.json({ message: 'No QR code available', status: s.status });
    if (req.query.format === 'html') {
        try {
            const dataUrl = await QRCode.toDataURL(s.qr, { width: 280, margin: 2 });
            res.type('text/html');
            return res.send(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="refresh" content="12">
<title>Scan QR WhatsApp</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f5f5f5}.card{background:white;padding:2rem;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.1);text-align:center;max-width:400px;width:90%}h1{font-size:1.2rem;color:#333;margin-bottom:.5rem}p{color:#666;font-size:.9rem;margin-bottom:1.5rem}img{display:block;margin:0 auto;border-radius:8px}.status{display:inline-block;margin-top:1rem;padding:.3rem .8rem;border-radius:20px;font-size:.8rem;background:#e8f5e9;color:#2e7d32}
</style></head><body><div class="card"><h1>WhatsApp Gateway</h1>
<p>Scan QR ini dengan WhatsApp kamu</p>
<img src="${dataUrl}" alt="QR Code">
<div class="status">${s.status}</div></div>
</body></html>`);
        } catch (e) {
            res.type('text/html');
            return res.send(`<!DOCTYPE html><html><body><pre>QR render error: ${e.message.replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&#34;',"'":'&#39;'}[c]))}</pre></body></html>`);
        }
    }
    res.json({ qr: s.qr, status: s.status });
});

router.put('/api/sessions/:id/webhook', requireTenantOwnership, (req, res) => {
    setWebhook(req.params.id, req.body.webhook_url || null, req.body.webhook_secret || null);
    res.json({ success: true });
});

router.put('/api/sessions/:id', requireTenantOwnership, (req, res) => {
    const { tenant_id, session_type, webhook_url, webhook_secret } = req.body;
    const updates = [];
    const params = [];
    if (tenant_id !== undefined) { updates.push('tenant_id = ?'); params.push(tenant_id); }
    if (session_type !== undefined) { updates.push('session_type = ?'); params.push(session_type); }
    if (webhook_url !== undefined) { updates.push('webhook_url = ?'); params.push(webhook_url); }
    if (webhook_secret !== undefined) { updates.push('webhook_secret = ?'); params.push(webhook_secret); }
    if (!updates.length) return res.status(400).json({ error: 'No fields to update' });
    updates.push('updated_at = ?');
    params.push(Date.now(), req.params.id);
    db.prepare(`UPDATE sessions SET ${updates.join(', ')} WHERE session_id = ?`).run(...params);
    if (webhook_url !== undefined) setWebhook(req.params.id, webhook_url || null, webhook_secret || null);
    res.json({ success: true });
});

router.delete('/api/sessions/:id', requireTenantOwnership, (req, res) => {
    deleteSession(req.params.id);
    res.json({ success: true });
});

// ── Messages ────────────────────────────────────────────────────────────
router.post('/api/sessions/:id/messages', requireTenantOwnership, (req, res) => {
    const { type, chatId, text, imageUrl, caption, priority } = req.body;
    if (!chatId) return res.status(400).json({ error: 'chatId required' });
    if (type && !['text', 'image', 'audio', 'document'].includes(type)) return res.status(400).json({ error: 'Invalid type' });
    const messageId = enqueueMessage(req.params.id, { type: type || 'text', chatId, text, imageUrl, caption, priority: priority || 'normal' });
    res.json({ success: true, message_id: messageId, queued: true });
});

router.post('/api/sessions/:id/messages/send-text', requireTenantOwnership, (req, res) => {
    const { chatId, text } = req.body;
    if (!chatId || !text) return res.status(400).json({ error: 'chatId and text required' });
    res.json({ success: true, message_id: enqueueMessage(req.params.id, { type: 'text', chatId, text }) });
});

router.post('/api/sessions/:id/messages/send-image', requireTenantOwnership, (req, res) => {
    const { chatId, imageUrl, caption } = req.body;
    if (!chatId || !imageUrl) return res.status(400).json({ error: 'chatId and imageUrl required' });
    res.json({ success: true, message_id: enqueueMessage(req.params.id, { type: 'image', chatId, imageUrl, caption }) });
});

// ── Broadcast (P3: priority + schedule) ─────────────────────────────────
router.post('/api/sessions/:id/broadcast', requireTenantOwnership, (req, res) => {
    const { numbers, message, priority, schedule_at } = req.body;
    if (!Array.isArray(numbers) || !message) return res.status(400).json({ error: 'numbers (array) and message required' });
    if (!req.tenant && !req.isSuperAdmin && !req.user) return res.status(403).json({ error: 'Tenant auth required for broadcast' });

    const tenantId = req.tenant?.tenant_id || null;
    const result = enqueueBroadcast(req.params.id, tenantId, numbers, message, priority || 'normal', schedule_at || null);
    res.json(result);
});

router.get('/api/sessions/:id/messages', requireTenantOwnership, (req, res) => {
    res.json(db.prepareGetMessageHistory.all(req.params.id));
});

router.get('/api/sessions/:id/incoming', requireTenantOwnership, (req, res) => {
    const hooks = db.prepare('SELECT * FROM webhook_outbox WHERE session_id = ? AND event = ? ORDER BY created_at DESC LIMIT 50')
        .all(req.params.id, 'message.incoming');
    res.json(hooks.map(h => ({ id: h.id, payload: tryParse(h.payload), created_at: h.created_at })));
});

// ── Behavior Config (P2: session type presets) ──────────────────────────
const SESSION_PRESETS = {
    notifikasi: { persona_mode: 'quick', ai_enabled: 0, timing_multiplier: 0.3, volume_per_minute: 10, volume_per_hour: 100, volume_per_day: 500, quiet_hours_start: 22, quiet_hours_end: 7 },
    cs_chat: { persona_mode: 'normal', ai_enabled: 1, timing_multiplier: 1.0, volume_per_minute: 3, volume_per_hour: 20, volume_per_day: 100, quiet_hours_start: 22, quiet_hours_end: 7 },
    broadcast: { persona_mode: 'quick', ai_enabled: 0, timing_multiplier: 0.2, volume_per_minute: 2, volume_per_hour: 30, volume_per_day: 200, quiet_hours_start: 7, quiet_hours_end: 22 },
    default: { persona_mode: 'auto', ai_enabled: 0, timing_multiplier: 1.0, volume_per_minute: 3, volume_per_hour: 20, volume_per_day: 100, quiet_hours_start: 22, quiet_hours_end: 7 },
};

router.get('/api/sessions/:id/behavior', requireTenantOwnership, (req, res) => {
    const cfg = db.prepareGetBehaviorConfig.get(req.params.id);
    if (!cfg) return res.status(404).json({ error: 'Not configured' });
    const { ai_api_key, model_state, ...safe } = cfg;
    safe.ai_key_set = !!ai_api_key;
    safe.model_trained = !!model_state;
    res.json(safe);
});

router.post('/api/sessions/:id/behavior', requireTenantOwnership, (req, res) => {
    const b = req.body;
    const now = Date.now();

    // P2: apply preset if session_type specified
    const preset = SESSION_PRESETS[b.session_type] || {};
    const merged = { ...preset, ...b };

    db.prepareUpsertBehaviorConfig.run(
        req.params.id, merged.persona_mode || 'auto', merged.ai_enabled ? 1 : 0,
        merged.ai_provider || 'openai', merged.ai_api_url || null, merged.ai_api_key || null,
        merged.ai_model || 'gpt-4o-mini', merged.ai_system_prompt || null,
        merged.ai_temperature || 0.7, merged.ai_max_tokens || 500,
        merged.faq_enabled !== false ? 1 : 0, merged.template_enabled !== false ? 1 : 0,
        merged.volume_per_minute || 3, merged.volume_per_hour || 20, merged.volume_per_day || 100,
        merged.cooldown_ms || 30000,
        merged.quiet_hours?.start ?? 22, merged.quiet_hours?.end ?? 7,
        merged.quiet_hours?.timezone || 'Asia/Jakarta',
        merged.timing_multiplier || 1.0, merged.ml_learning_rate || 0.1, merged.ml_decay || 0.05,
        null, req.params.id, now, now
    );
    res.json({ success: true, applied_preset: b.session_type || 'custom' });
});

// ── User Profiles ───────────────────────────────────────────────────────
router.get('/api/sessions/:id/users', requireTenantOwnership, (req, res) => {
    res.json(db.prepareGetUsersBySession.all(req.params.id));
});

router.get('/api/sessions/:id/users/:userId', requireTenantOwnership, (req, res) => {
    const p = db.prepareGetUserProfile.get(req.params.userId, req.params.id);
    if (!p) return res.status(404).json({ error: 'User not found' });
    res.json(p);
});

router.put('/api/sessions/:id/users/:userId/persona', requireTenantOwnership, (req, res) => {
    const { persona } = req.body;
    if (!['quick', 'normal', 'relaxed'].includes(persona)) return res.status(400).json({ error: 'Invalid persona' });
    const now = Date.now();
    db.prepareUpdateUserPersona.run(req.params.userId, req.params.id, persona, 1.0, null, req.params.userId, req.params.id, now, now);
    res.json({ success: true });
});

// ── FAQ ─────────────────────────────────────────────────────────────────
router.get('/api/sessions/:id/faq', requireTenantOwnership, (req, res) => {
    res.json(db.prepareGetFaqsBySession.all(req.params.id));
});

router.post('/api/sessions/:id/faq', requireTenantOwnership, (req, res) => {
    const { question, answer, keywords, intent } = req.body;
    if (!answer) return res.status(400).json({ error: 'answer required' });
    const now = Date.now();
    db.prepareInsertFaq.run(crypto.randomUUID(), req.params.id, question || null, answer, JSON.stringify(keywords || []), intent || null, now, now);
    res.json({ success: true });
});

router.delete('/api/sessions/:id/faq/:faqId', requireTenantOwnership, (req, res) => {
    db.prepareDeleteFaq.run(req.params.faqId, req.params.id);
    res.json({ success: true });
});

// ── Templates (P1: full CRUD) ──────────────────────────────────────────
router.get('/api/sessions/:id/templates', requireTenantOwnership, (req, res) => {
    const rows = db.prepareGetTemplatesBySession.all(req.params.id);
    res.json(rows.map(r => ({ ...r, templates: tryParse(r.templates) })));
});

router.post('/api/sessions/:id/templates', requireTenantOwnership, (req, res) => {
    const { intent, templates, label } = req.body;
    if (!intent || !templates || !Array.isArray(templates) || !templates.length) {
        return res.status(400).json({ error: 'intent and templates (array) required' });
    }
    const now = Date.now();
    db.prepareInsertTemplate.run(crypto.randomUUID(), req.params.id, intent, JSON.stringify(templates), now, now);
    res.json({ success: true });
});

router.put('/api/sessions/:id/templates/:templateId', requireTenantOwnership, (req, res) => {
    const { intent, templates } = req.body;
    const existing = db.prepareGetTemplateById.get(req.params.templateId, req.params.id);
    if (!existing) return res.status(404).json({ error: 'Template not found' });
    const now = Date.now();
    db.prepareUpdateTemplate.run(
        intent || existing.intent,
        templates ? JSON.stringify(templates) : existing.templates,
        now, req.params.templateId, req.params.id
    );
    res.json({ success: true });
});

router.delete('/api/sessions/:id/templates/:templateId', requireTenantOwnership, (req, res) => {
    db.prepareDeleteTemplate.run(req.params.templateId, req.params.id);
    res.json({ success: true });
});

// Legacy endpoint (POST with intent in URL)
router.post('/api/sessions/:id/templates/:intent', requireTenantOwnership, (req, res) => {
    const { templates } = req.body;
    if (!templates || !Array.isArray(templates) || !templates.length) return res.status(400).json({ error: 'templates (array) required' });
    const now = Date.now();
    db.prepareInsertTemplate.run(crypto.randomUUID(), req.params.id, req.params.intent, JSON.stringify(templates), now, now);
    res.json({ success: true });
});

// ── Analytics (P4) ──────────────────────────────────────────────────────
router.get('/api/sessions/:id/analytics/personas', requireTenantOwnership, (req, res) => {
    const rows = db.prepare('SELECT persona, COUNT(*) as count FROM user_profiles WHERE session_id = ? GROUP BY persona').all(req.params.id);
    res.json(rows);
});

router.get('/api/sessions/:id/analytics/sources', requireTenantOwnership, (req, res) => {
    const rows = db.prepare('SELECT source, COUNT(*) as count FROM behavior_outbox WHERE session_id = ? GROUP BY source').all(req.params.id);
    res.json(rows);
});

router.get('/api/sessions/:id/analytics/volume', requireTenantOwnership, (req, res) => {
    const days = parseInt(req.query.days || '1');
    const since = Date.now() - days * 86400000;
    const rows = db.prepare(`
        SELECT strftime('%Y-%m-%d %H:00:00', created_at/1000, 'unixepoch') as hour,
               COUNT(*) as count
        FROM behavior_outbox WHERE session_id = ? AND created_at > ?
        GROUP BY hour ORDER BY hour
    `).all(req.params.id, since);
    res.json(rows);
});

router.get('/api/sessions/:id/analytics/summary', requireTenantOwnership, (req, res) => {
    const since = Date.now() - 30 * 86400000;
    const msgStats = db.prepare(`SELECT COUNT(*) as total, SUM(CASE WHEN status='sent' THEN 1 ELSE 0 END) as sent, SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) as failed FROM messages WHERE session_id = ? AND created_at > ?`).get(req.params.id, since);
    const sources = db.prepare('SELECT source, COUNT(*) as count FROM behavior_outbox WHERE session_id = ? AND created_at > ? GROUP BY source').all(req.params.id, since);
    const personas = db.prepare('SELECT persona, COUNT(*) as count FROM user_profiles WHERE session_id = ? GROUP BY persona').all(req.params.id);
    const avgDelay = db.prepare('SELECT AVG(delay_ms) as avg FROM behavior_outbox WHERE session_id = ? AND created_at > ?').get(req.params.id, since);
    const activeUsers = db.prepare('SELECT COUNT(DISTINCT user_id) as count FROM user_profiles WHERE session_id = ?').get(req.params.id);
    res.json({
        period: { start: new Date(since).toISOString(), end: new Date().toISOString() },
        messages: { total: msgStats.total || 0, sent: msgStats.sent || 0, failed: msgStats.failed || 0, success_rate: msgStats.total ? ((msgStats.sent || 0) / msgStats.total * 100).toFixed(2) : 100 },
        sources: Object.fromEntries(sources.map(s => [s.source, s.count])),
        personas: Object.fromEntries(personas.map(p => [p.persona, p.count])),
        avg_response_time_ms: Math.round(avgDelay?.avg || 0),
        active_users: activeUsers?.count || 0,
    });
});

router.get('/api/sessions/:id/analytics/export.csv', requireTenantOwnership, (req, res) => {
    const since = Date.now() - 30 * 86400000;
    const rows = db.prepare(`
        SELECT m.created_at, m.session_id, 'outbound' as direction, m.type, bo.source,
               bo.persona_at_send as persona, bo.delay_ms as response_time_ms, m.status
        FROM messages m LEFT JOIN behavior_outbox bo ON m.session_id = bo.session_id AND m.chat_id = bo.user_id
        WHERE m.session_id = ? AND m.created_at > ?
        UNION ALL
        SELECT bo.created_at, bo.session_id, 'inbound' as direction, 'text' as type, bo.source,
               bo.persona_at_send as persona, bo.delay_ms as response_time_ms, 'replied' as status
        FROM behavior_outbox bo WHERE bo.session_id = ? AND bo.created_at > ?
        ORDER BY created_at DESC
    `).all(req.params.id, since, req.params.id, since);

    const header = 'timestamp,session_id,direction,type,source,persona,response_time_ms,status\n';
    const csv = rows.map(r => `${new Date(r.created_at).toISOString()},${r.session_id},${r.direction},${r.type},${r.source || ''},${r.persona || ''},${r.response_time_ms || ''},${r.status}`).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="analytics-${req.params.id}.csv"`);
    res.send(header + csv);
});

// ── Template Sync from Laravel (P6) ────────────────────────────────────
router.post('/api/sync/templates', async (req, res) => {
    const { since, webhook_url } = req.body;
    if (!webhook_url) return res.status(400).json({ error: 'webhook_url required' });

    try {
        const url = new URL(webhook_url);
        const dns = await import('dns');
        const { promisify } = await import('util');
        const lookup = promisify(dns.lookup);
        const { address } = await lookup(url.hostname);
        if (isPrivateIP(url.hostname) || isPrivateIP(address)) {
            return res.status(403).json({ error: 'Private/internal URLs not allowed' });
        }

        const safeSince = encodeURIComponent(since || '');
        const syncUrl = `${url.origin}/api/v1/gateway/sync/templates?since=${safeSince}`;
        const response = await fetch(syncUrl, {
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(10000),
            redirect: 'error',
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        res.json({ success: true, synced: data });
    } catch (e) {
        res.status(502).json({ error: 'Sync failed', details: e.message });
    }
});

function tryParse(str) { if (!str) return null; try { return JSON.parse(str); } catch { return str; } }

export default router;
