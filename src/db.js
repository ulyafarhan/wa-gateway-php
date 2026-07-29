// ponytail: SQLite — messages, sessions, auth, webhooks, behavior tables
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DB_PATH = process.env.DB_PATH || './data/wagateway.db';
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('cache_size = -4000');
db.pragma('wal_autocheckpoint = 500');
db.pragma('page_size = 4096');
db.pragma('temp_store = MEMORY');
db.pragma('mmap_size = 268435456');
db.pragma('busy_timeout = 5000');

// ── Tables ──────────────────────────────────────────────────────────────
db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY, session_id TEXT NOT NULL, chat_id TEXT NOT NULL,
        type TEXT, payload TEXT, status TEXT DEFAULT 'queued',
        wa_status TEXT, error TEXT, created_at INTEGER, sent_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS sessions (
        session_id TEXT PRIMARY KEY, status TEXT DEFAULT 'disconnected',
        qr TEXT, webhook_url TEXT, webhook_secret TEXT,
        reconnect_count INTEGER DEFAULT 0, reconnect_at INTEGER,
        msg_sent INTEGER DEFAULT 0, msg_failed INTEGER DEFAULT 0,
        created_at INTEGER, updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS auth_state (
        session_id TEXT PRIMARY KEY, creds_data TEXT, keys_data TEXT, updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS webhook_outbox (
        id TEXT PRIMARY KEY, session_id TEXT NOT NULL, event TEXT NOT NULL,
        payload TEXT NOT NULL, status TEXT DEFAULT 'pending',
        retry_count INTEGER DEFAULT 0, created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS user_profiles (
        user_id TEXT NOT NULL, session_id TEXT NOT NULL,
        persona TEXT DEFAULT 'unknown', persona_confidence REAL DEFAULT 0,
        avg_response_time REAL DEFAULT 0, msg_sent INTEGER DEFAULT 0,
        msg_received INTEGER DEFAULT 0, last_reply_at INTEGER,
        first_seen_at INTEGER, features TEXT,
        created_at INTEGER, updated_at INTEGER,
        PRIMARY KEY (user_id, session_id)
    );

    CREATE TABLE IF NOT EXISTS behavior_config (
        session_id TEXT PRIMARY KEY,
        persona_mode TEXT DEFAULT 'auto', ai_enabled INTEGER DEFAULT 0,
        ai_provider TEXT DEFAULT 'openai', ai_api_url TEXT,
        ai_api_key TEXT, ai_model TEXT DEFAULT 'gpt-4o-mini',
        ai_system_prompt TEXT, ai_temperature REAL DEFAULT 0.7,
        ai_max_tokens INTEGER DEFAULT 500,
        faq_enabled INTEGER DEFAULT 1, template_enabled INTEGER DEFAULT 1,
        volume_per_minute INTEGER DEFAULT 3, volume_per_hour INTEGER DEFAULT 20,
        volume_per_day INTEGER DEFAULT 100, cooldown_ms INTEGER DEFAULT 30000,
        quiet_hours_start INTEGER DEFAULT 22, quiet_hours_end INTEGER DEFAULT 7,
        quiet_hours_timezone TEXT DEFAULT 'Asia/Jakarta',
        timing_multiplier REAL DEFAULT 1.0,
        ml_learning_rate REAL DEFAULT 0.1, ml_decay REAL DEFAULT 0.05,
        model_state TEXT, created_at INTEGER, updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS behavior_outbox (
        id TEXT PRIMARY KEY, session_id TEXT NOT NULL, user_id TEXT NOT NULL,
        content_hash TEXT, content_preview TEXT,
        source TEXT, ai_provider_used TEXT, ai_model_used TEXT,
        persona_at_send TEXT, delay_ms INTEGER, created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS faq_entries (
        id TEXT PRIMARY KEY, session_id TEXT NOT NULL,
        question TEXT, answer TEXT NOT NULL,
        keywords TEXT, intent TEXT, enabled INTEGER DEFAULT 1,
        created_at INTEGER, updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS template_entries (
        id TEXT PRIMARY KEY, session_id TEXT NOT NULL,
        intent TEXT NOT NULL, templates TEXT NOT NULL,
        created_at INTEGER, updated_at INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
    CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
    CREATE INDEX IF NOT EXISTS idx_webhook_status ON webhook_outbox(status);
    CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
    CREATE INDEX IF NOT EXISTS idx_user_profiles_session ON user_profiles(session_id);
    CREATE INDEX IF NOT EXISTS idx_behavior_outbox_user ON behavior_outbox(session_id, user_id);
    CREATE INDEX IF NOT EXISTS idx_faq_session ON faq_entries(session_id);
    CREATE INDEX IF NOT EXISTS idx_template_session ON template_entries(session_id);
    CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
    CREATE INDEX IF NOT EXISTS idx_sessions_updated ON sessions(updated_at);

    CREATE TABLE IF NOT EXISTS tenants (
        tenant_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        api_key TEXT NOT NULL UNIQUE,
        webhook_url TEXT,
        webhook_secret TEXT,
        is_active INTEGER DEFAULT 1,
        created_at INTEGER, updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'operator', created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS user_sessions (
        user_id TEXT NOT NULL, session_id TEXT NOT NULL,
        label TEXT, project_name TEXT, created_at INTEGER,
        PRIMARY KEY (user_id, session_id),
        FOREIGN KEY (session_id) REFERENCES sessions(session_id)
    );

    CREATE TABLE IF NOT EXISTS api_keys (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL,
        name TEXT NOT NULL, key_hash TEXT NOT NULL,
        scopes TEXT DEFAULT 'read', last_used_at INTEGER,
        created_at INTEGER,
        FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS audit_log (
        id TEXT PRIMARY KEY, user_id TEXT,
        action TEXT NOT NULL, resource TEXT,
        details TEXT, ip TEXT, created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS broadcast_jobs (
        id TEXT PRIMARY KEY, tenant_id TEXT,
        total_targets INTEGER, sent INTEGER DEFAULT 0, failed INTEGER DEFAULT 0,
        message TEXT, status TEXT DEFAULT 'queued', created_at INTEGER, completed_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS broadcast_assignments (
        id TEXT PRIMARY KEY, broadcast_id TEXT,
        session_id TEXT, targets TEXT, sent INTEGER DEFAULT 0,
        failed INTEGER DEFAULT 0, status TEXT DEFAULT 'pending',
        FOREIGN KEY (broadcast_id) REFERENCES broadcast_jobs(id)
    );

    CREATE TABLE IF NOT EXISTS webhook_dead_letter (
        id TEXT PRIMARY KEY, session_id TEXT,
        event TEXT, payload TEXT, last_error TEXT,
        created_at INTEGER, last_attempt_at INTEGER
    );

    -- ponytail: RBAC tables
    CREATE TABLE IF NOT EXISTS roles (
        id TEXT PRIMARY KEY, name TEXT UNIQUE NOT NULL,
        description TEXT, permissions TEXT DEFAULT '[]',
        is_system INTEGER DEFAULT 0, created_at INTEGER, updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS contact_groups (
        id TEXT PRIMARY KEY, session_id TEXT NOT NULL,
        name TEXT NOT NULL, color TEXT DEFAULT '#6366f1',
        created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS tenant_packages (
        id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL,
        package_name TEXT NOT NULL DEFAULT 'starter',
        max_sessions INTEGER DEFAULT 1,
        max_messages_per_day INTEGER DEFAULT 100,
        max_broadcasts_per_day INTEGER DEFAULT 0,
        features TEXT DEFAULT '[]',
        expires_at INTEGER, created_at INTEGER, updated_at INTEGER,
        FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE
    );
`);

// ── Migrations ──────────────────────────────────────────────────────────
const columns = db.prepare("PRAGMA table_info(sessions)").all().map(c => c.name);
if (!columns.includes('tenant_id')) {
    db.exec("ALTER TABLE sessions ADD COLUMN tenant_id TEXT REFERENCES tenants(tenant_id)");
    db.exec("CREATE INDEX IF NOT EXISTS idx_sessions_tenant ON sessions(tenant_id)");
}
if (!columns.includes('session_type')) {
    db.exec("ALTER TABLE sessions ADD COLUMN session_type TEXT DEFAULT 'default'");
}

// ── Migrations: RBAC tables ────────────────────────────────────────────
const rolesColumns = db.prepare("PRAGMA table_info(roles)").all().map(c => c.name);
if (!rolesColumns.includes('updated_at')) {
    db.exec("ALTER TABLE roles ADD COLUMN updated_at INTEGER");
    console.log('[db] Migration: added updated_at to roles');
}
if (!rolesColumns.includes('id')) {
    // Recreate roles table if missing id column
    db.exec("DROP TABLE IF EXISTS roles");
    db.exec(`CREATE TABLE roles (
        id TEXT PRIMARY KEY, name TEXT UNIQUE NOT NULL,
        description TEXT, permissions TEXT DEFAULT '[]',
        is_system INTEGER DEFAULT 0, created_at INTEGER, updated_at INTEGER
    )`);
    console.log('[db] Migration: recreated roles table');
}

const pkgColumns = db.prepare("PRAGMA table_info(tenant_packages)").all().map(c => c.name);
if (!pkgColumns.includes('updated_at')) {
    db.exec("ALTER TABLE tenant_packages ADD COLUMN updated_at INTEGER");
    console.log('[db] Migration: added updated_at to tenant_packages');
}
if (pkgColumns.length === 0 && !pkgColumns.includes('id')) {
    // Table doesn't exist yet, will be created by CREATE TABLE IF NOT EXISTS above
}

// ── Migrations: broadcast_jobs ────────────────────────────────────────────
const bjColumns = db.prepare("PRAGMA table_info(broadcast_jobs)").all().map(c => c.name);
if (!bjColumns.includes('message')) {
    db.exec("ALTER TABLE broadcast_jobs ADD COLUMN message TEXT");
    console.log('[db] Migration: added message to broadcast_jobs');
}
if (!bjColumns.includes('schedule_at')) {
    db.exec("ALTER TABLE broadcast_jobs ADD COLUMN schedule_at INTEGER");
    console.log('[db] Migration: added schedule_at to broadcast_jobs');
}

const baColumns = db.prepare("PRAGMA table_info(broadcast_assignments)").all().map(c => c.name);
if (!baColumns.includes('offset')) {
    db.exec("ALTER TABLE broadcast_assignments ADD COLUMN offset INTEGER DEFAULT 0");
    db.exec("ALTER TABLE broadcast_assignments ADD COLUMN total INTEGER DEFAULT 0");
    console.log('[db] Migration: added offset+total to broadcast_assignments');
}

// ── Indexes for new tables ──────────────────────────────────────────────
db.exec("CREATE INDEX IF NOT EXISTS idx_tenants_api_key ON tenants(api_key)");
db.exec("CREATE INDEX IF NOT EXISTS idx_broadcast_jobs_tenant ON broadcast_jobs(tenant_id)");
db.exec("CREATE INDEX IF NOT EXISTS idx_broadcast_assignments_broadcast ON broadcast_assignments(broadcast_id)");
db.exec("CREATE INDEX IF NOT EXISTS idx_dead_letter_session ON webhook_dead_letter(session_id)");
db.exec("CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name)");
db.exec("CREATE INDEX IF NOT EXISTS idx_tenant_packages_tenant ON tenant_packages(tenant_id)");

// ── Migration: contact_groups ──────────────────────────────────────────
const upColumns = db.prepare("PRAGMA table_info(user_profiles)").all().map(c => c.name);
if (!upColumns.includes('group_id')) {
    db.exec("ALTER TABLE user_profiles ADD COLUMN group_id TEXT REFERENCES contact_groups(id)");
    console.log('[db] Migration: added group_id to user_profiles');
}

// ── Seed default roles ──────────────────────────────────────────────────
const existingRoles = db.prepare('SELECT COUNT(*) as c FROM roles').get().c;
if (existingRoles === 0) {
    const now = Date.now();
    const insertRole = db.prepare('INSERT OR IGNORE INTO roles (id, name, description, permissions, is_system, created_at) VALUES (?, ?, ?, ?, 1, ?)');
    insertRole.run('role_superadmin', 'superadmin', 'Full system access', JSON.stringify(['*']), now);
    insertRole.run('role_admin', 'admin', 'Admin access (no user management)', JSON.stringify(['sessions:*', 'messages:*', 'tenants:read', 'tenants:update', 'users:read', 'webhooks:*', 'behavior:*', 'broadcast:*', 'analytics:read']), now);
    insertRole.run('role_operator', 'operator', 'Session and message operator', JSON.stringify(['sessions:read', 'sessions:update', 'messages:read', 'messages:send', 'webhooks:read', 'behavior:read', 'behavior:update', 'broadcast:create', 'broadcast:read', 'analytics:read']), now);
    insertRole.run('role_client', 'client', 'Client (read + send only)', JSON.stringify(['sessions:read', 'messages:read', 'messages:send', 'analytics:read']), now);
    insertRole.run('role_viewer', 'viewer', 'Read-only access', JSON.stringify(['sessions:read', 'messages:read', 'analytics:read']), now);
    console.log('[db] Default roles seeded');
}

// ── Seed default package for existing tenants ───────────────────────────
const existingPackages = db.prepare('SELECT COUNT(*) as c FROM tenant_packages').get().c;
if (existingPackages === 0) {
    const tenants = db.prepare('SELECT tenant_id FROM tenants').all();
    const insertPkg = db.prepare('INSERT OR IGNORE INTO tenant_packages (id, tenant_id, package_name, max_sessions, max_messages_per_day, max_broadcasts_per_day, features, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    for (const t of tenants) {
        insertPkg.run(`pkg_${t.tenant_id}`, t.tenant_id, 'starter', 1, 100, 0, JSON.stringify(['send', 'receive']), Date.now());
    }
    if (tenants.length) console.log(`[db] Default packages created for ${tenants.length} tenants`);
}

// ── Migration: reset_token for forgot-password ───────────────────────────
const userCols = db.prepare("PRAGMA table_info(users)").all().map(c => c.name);
if (!userCols.includes('reset_token')) {
    db.exec("ALTER TABLE users ADD COLUMN reset_token TEXT");
    db.exec("ALTER TABLE users ADD COLUMN reset_token_expires INTEGER");
    console.log('[db] Migration: added reset_token to users');
}

// ── Prepared: messages ──────────────────────────────────────────────────
db.prepareInsertMessage = db.prepare(`INSERT OR REPLACE INTO messages (id, session_id, chat_id, type, payload, status, created_at) VALUES (?, ?, ?, ?, ?, 'queued', ?)`);
db.prepareInsertReceived = db.prepare(`INSERT OR REPLACE INTO messages (id, session_id, chat_id, type, payload, status, created_at) VALUES (?, ?, ?, ?, ?, 'received', ?)`);
db.prepareUpdateMessageStatus = db.prepare(`UPDATE messages SET status = ?, wa_status = ?, error = ?, sent_at = ? WHERE id = ?`);
db.prepareGetMessageHistory = db.prepare(`SELECT * FROM messages WHERE session_id = ? ORDER BY created_at DESC LIMIT 50`);

// ── Prepared: sessions ──────────────────────────────────────────────────
db.prepareUpsertSession = db.prepare(`INSERT OR REPLACE INTO sessions (session_id, status, created_at, updated_at) VALUES (?, ?, ?, ?)`);
db.prepareUpdateSessionStatus = db.prepare(`UPDATE sessions SET status = ?, updated_at = ? WHERE session_id = ?`);
db.prepareIncrementReconnect = db.prepare(`UPDATE sessions SET reconnect_count = reconnect_count + 1, reconnect_at = ?, updated_at = ? WHERE session_id = ?`);
db.prepareIncrementMsgSent = db.prepare(`UPDATE sessions SET msg_sent = msg_sent + 1, updated_at = ? WHERE session_id = ?`);
db.prepareIncrementMsgFailed = db.prepare(`UPDATE sessions SET msg_failed = msg_failed + 1, updated_at = ? WHERE session_id = ?`);
db.prepareUpdateSessionWebhook = db.prepare(`UPDATE sessions SET webhook_url = ?, webhook_secret = ?, updated_at = ? WHERE session_id = ?`);
db.prepareGetSessions = db.prepare(`SELECT * FROM sessions ORDER BY created_at DESC`);
db.prepareDeleteSession = db.prepare(`DELETE FROM sessions WHERE session_id = ?`);
db.prepareGetSession = db.prepare(`SELECT * FROM sessions WHERE session_id = ?`);

// ── Prepared: auth_state ────────────────────────────────────────────────
db.prepareGetAuthState = db.prepare(`SELECT creds_data, keys_data FROM auth_state WHERE session_id = ?`);
db.prepareUpsertAuthState = db.prepare(`INSERT OR REPLACE INTO auth_state (session_id, creds_data, keys_data, updated_at) VALUES (?, ?, ?, ?)`);
db.prepareDeleteAuthState = db.prepare(`DELETE FROM auth_state WHERE session_id = ?`);

// ── Prepared: webhook ───────────────────────────────────────────────────
db.prepareInsertWebhook = db.prepare(`INSERT INTO webhook_outbox (id, session_id, event, payload, status, created_at) VALUES (?, ?, ?, ?, 'pending', ?)`);
db.prepareGetPendingWebhooks = db.prepare(`SELECT * FROM webhook_outbox WHERE status = 'pending' ORDER BY created_at ASC LIMIT 50`);
db.prepareUpdateWebhookStatus = db.prepare(`UPDATE webhook_outbox SET status = ?, retry_count = retry_count + 1 WHERE id = ?`);
db.prepareCleanupOldWebhooks = db.prepare(`DELETE FROM webhook_outbox WHERE created_at < ? AND status != 'pending'`);

// ── Prepared: user_profiles ─────────────────────────────────────────────
db.prepareGetUserProfile = db.prepare(`SELECT * FROM user_profiles WHERE user_id = ? AND session_id = ?`);
db.prepareUpsertUserProfile = db.prepare(`INSERT OR REPLACE INTO user_profiles (user_id, session_id, persona, persona_confidence, avg_response_time, msg_sent, msg_received, last_reply_at, first_seen_at, features, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM user_profiles WHERE user_id = ? AND session_id = ?), ?), ?)`);
db.prepareUpdateUserPersona = db.prepare(`INSERT OR REPLACE INTO user_profiles (user_id, session_id, persona, persona_confidence, features, created_at, updated_at) VALUES (?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM user_profiles WHERE user_id = ? AND session_id = ?), ?), ?)`);
db.prepareIncrementMsgSentUser = db.prepare(`UPDATE user_profiles SET msg_sent = msg_sent + 1, updated_at = ? WHERE user_id = ? AND session_id = ?`);
db.prepareIncrementMsgReceived = db.prepare(`UPDATE user_profiles SET msg_received = msg_received + 1, last_reply_at = ?, avg_response_time = ?, features = ?, updated_at = ? WHERE user_id = ? AND session_id = ?`);
db.prepareGetUsersBySession = db.prepare(`SELECT * FROM user_profiles WHERE session_id = ? ORDER BY updated_at DESC`);

// ── Prepared: behavior_config ───────────────────────────────────────────
db.prepareGetBehaviorConfig = db.prepare(`SELECT * FROM behavior_config WHERE session_id = ?`);
db.prepareUpsertBehaviorConfig = db.prepare(`INSERT OR REPLACE INTO behavior_config (session_id, persona_mode, ai_enabled, ai_provider, ai_api_url, ai_api_key, ai_model, ai_system_prompt, ai_temperature, ai_max_tokens, faq_enabled, template_enabled, volume_per_minute, volume_per_hour, volume_per_day, cooldown_ms, quiet_hours_start, quiet_hours_end, quiet_hours_timezone, timing_multiplier, ml_learning_rate, ml_decay, model_state, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM behavior_config WHERE session_id = ?), ?), ?)`);
db.prepareUpdateBehaviorModel = db.prepare(`UPDATE behavior_config SET model_state = ?, updated_at = ? WHERE session_id = ?`);

// ── Prepared: behavior_outbox ───────────────────────────────────────────
db.prepareInsertBehaviorOutbox = db.prepare(`INSERT INTO behavior_outbox (id, session_id, user_id, content_hash, content_preview, source, ai_provider_used, ai_model_used, persona_at_send, delay_ms, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
db.prepareGetRecentOutbox = db.prepare(`SELECT * FROM behavior_outbox WHERE session_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 3`);

// ── Prepared: FAQ ───────────────────────────────────────────────────────
db.prepareGetFaqsBySession = db.prepare(`SELECT * FROM faq_entries WHERE session_id = ? AND enabled = 1 ORDER BY created_at DESC`);
db.prepareInsertFaq = db.prepare(`INSERT OR REPLACE INTO faq_entries (id, session_id, question, answer, keywords, intent, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
db.prepareDeleteFaq = db.prepare(`DELETE FROM faq_entries WHERE id = ? AND session_id = ?`);

// ── Prepared: Templates ─────────────────────────────────────────────────
db.prepareGetTemplatesBySession = db.prepare(`SELECT * FROM template_entries WHERE session_id = ? ORDER BY created_at DESC`);
db.prepareGetTemplatesByIntent = db.prepare(`SELECT * FROM template_entries WHERE session_id = ? AND intent = ?`);
db.prepareInsertTemplate = db.prepare(`INSERT OR REPLACE INTO template_entries (id, session_id, intent, templates, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`);
db.prepareUpdateTemplate = db.prepare(`UPDATE template_entries SET intent = ?, templates = ?, updated_at = ? WHERE id = ? AND session_id = ?`);
db.prepareDeleteTemplate = db.prepare(`DELETE FROM template_entries WHERE id = ? AND session_id = ?`);
db.prepareGetTemplateById = db.prepare(`SELECT * FROM template_entries WHERE id = ? AND session_id = ?`);

// ── Prepared: Tenants ──────────────────────────────────────────────────
db.prepareInsertTenant = db.prepare(`INSERT INTO tenants (tenant_id, name, slug, api_key, webhook_url, webhook_secret, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`);
db.prepareGetTenantByApiKey = db.prepare(`SELECT * FROM tenants WHERE api_key = ? AND is_active = 1`);
db.prepareGetTenantById = db.prepare(`SELECT * FROM tenants WHERE tenant_id = ?`);
db.prepareGetTenants = db.prepare(`SELECT * FROM tenants ORDER BY created_at DESC`);
db.prepareDeleteTenant = db.prepare(`DELETE FROM tenants WHERE tenant_id = ?`);
db.prepareUpdateTenant = db.prepare(`UPDATE tenants SET name = ?, webhook_url = ?, webhook_secret = ?, updated_at = ? WHERE tenant_id = ?`);

// ── Prepared: Tenant-scoped queries ────────────────────────────────────
db.prepareGetSessionsByTenant = db.prepare(`SELECT * FROM sessions WHERE tenant_id = ? ORDER BY created_at DESC`);
db.prepareGetMessagesByTenant = db.prepare(`SELECT m.* FROM messages m JOIN sessions s ON m.session_id = s.session_id WHERE s.tenant_id = ? ORDER BY m.created_at DESC LIMIT ? OFFSET ?`);
db.prepareGetWebhooksByTenant = db.prepare(`SELECT w.* FROM webhook_outbox w JOIN sessions s ON w.session_id = s.session_id WHERE s.tenant_id = ? AND w.status = ? ORDER BY w.created_at DESC LIMIT 100`);
db.prepareGetContactsByTenant = db.prepare(`SELECT up.* FROM user_profiles up JOIN sessions s ON up.session_id = s.session_id WHERE s.tenant_id = ? ORDER BY up.updated_at DESC LIMIT 200`);
db.prepareGetAnalyticsSummary = db.prepare(`SELECT COUNT(*) as total, SUM(CASE WHEN m.status='sent' THEN 1 ELSE 0 END) as sent, SUM(CASE WHEN m.status='failed' THEN 1 ELSE 0 END) as failed FROM messages m JOIN sessions s ON m.session_id = s.session_id WHERE s.tenant_id = ? AND m.created_at > ?`);
db.prepareGetAnalyticsSources = db.prepare(`SELECT source, COUNT(*) as count FROM behavior_outbox bo JOIN sessions s ON bo.session_id = s.session_id WHERE s.tenant_id = ? AND bo.created_at > ? GROUP BY source`);
db.prepareGetAnalyticsPersonas = db.prepare(`SELECT persona, COUNT(*) as count FROM user_profiles up JOIN sessions s ON up.session_id = s.session_id WHERE s.tenant_id = ? GROUP BY persona`);
db.prepareGetAnalyticsVolume = db.prepare(`SELECT strftime('%Y-%m-%d %H:00:00', m.created_at/1000, 'unixepoch') as hour, COUNT(*) as count FROM messages m JOIN sessions s ON m.session_id = s.session_id WHERE s.tenant_id = ? AND m.created_at > ? GROUP BY hour ORDER BY hour`);

// ── Prepared: Broadcast ────────────────────────────────────────────────
db.prepareInsertBroadcastJob = db.prepare(`INSERT INTO broadcast_jobs (id, tenant_id, total_targets, message, status, created_at) VALUES (?, ?, ?, ?, 'queued', ?)`);
db.prepareInsertBroadcastAssignment = db.prepare(`INSERT INTO broadcast_assignments (id, broadcast_id, session_id, targets, status) VALUES (?, ?, ?, ?, 'pending')`);
db.prepareUpdateBroadcastProgress = db.prepare(`UPDATE broadcast_assignments SET sent = sent + ?, failed = failed + ?, status = ? WHERE id = ?`);
db.prepareUpdateBroadcastJob = db.prepare(`UPDATE broadcast_jobs SET sent = sent + ?, failed = failed + ?, status = ?, completed_at = ? WHERE id = ?`);
db.prepareGetPendingBroadcasts = db.prepare(`SELECT * FROM broadcast_jobs WHERE status IN ('queued','running') ORDER BY created_at ASC`);
db.prepareGetBroadcastAssignments = db.prepare(`SELECT * FROM broadcast_assignments WHERE broadcast_id = ? AND status != 'completed'`);

// ── Prepared: Dead Letter ──────────────────────────────────────────────
db.prepareInsertDeadLetter = db.prepare(`INSERT INTO webhook_dead_letter (id, session_id, event, payload, last_error, created_at, last_attempt_at) VALUES (?, ?, ?, ?, ?, ?, ?)`);
db.prepareGetDeadLetters = db.prepare(`SELECT * FROM webhook_dead_letter WHERE session_id = ? ORDER BY created_at DESC LIMIT 100`);

// ── Prepared: Roles (RBAC) ────────────────────────────────────────────
db.prepareGetRoles = db.prepare(`SELECT * FROM roles ORDER BY created_at DESC`);
db.prepareGetRoleByName = db.prepare(`SELECT * FROM roles WHERE name = ?`);
db.prepareInsertRole = db.prepare(`INSERT INTO roles (id, name, description, permissions, is_system, created_at) VALUES (?, ?, ?, ?, ?, ?)`);
db.prepareUpdateRole = db.prepare(`UPDATE roles SET description = ?, permissions = ?, updated_at = ? WHERE name = ?`);
db.prepareDeleteRole = db.prepare(`DELETE FROM roles WHERE name = ? AND is_system = 0`);

// ── Prepared: Tenant Packages ──────────────────────────────────────────
db.prepareGetPackageByTenant = db.prepare(`SELECT * FROM tenant_packages WHERE tenant_id = ?`);
db.prepareUpsertPackage = db.prepare(`INSERT OR REPLACE INTO tenant_packages (id, tenant_id, package_name, max_sessions, max_messages_per_day, max_broadcasts_per_day, features, expires_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
db.prepareDeletePackage = db.prepare(`DELETE FROM tenant_packages WHERE tenant_id = ?`);

// ── Prepared: Tenant package limit checks ──────────────────────────────
db.prepareCountTenantSessions = db.prepare(`SELECT COUNT(*) as c FROM sessions WHERE tenant_id = ?`);
db.prepareCountTenantMessagesToday = db.prepare(`SELECT COUNT(*) as c FROM messages m JOIN sessions s ON m.session_id = s.session_id WHERE s.tenant_id = ? AND m.created_at > ?`);
db.prepareCountTenantBroadcastsToday = db.prepare(`SELECT COUNT(*) as c FROM broadcast_jobs WHERE tenant_id = ? AND created_at > ?`);

export default db;
