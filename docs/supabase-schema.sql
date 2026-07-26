-- wa-gateway Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run

-- Tenants
CREATE TABLE IF NOT EXISTS tenants (
  tenant_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  api_key TEXT NOT NULL UNIQUE,
  webhook_url TEXT,
  webhook_secret TEXT,
  is_active INTEGER DEFAULT 1,
  created_at BIGINT,
  updated_at BIGINT
);

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
  session_id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  status TEXT DEFAULT 'disconnected',
  session_type TEXT DEFAULT 'default',
  qr TEXT,
  webhook_url TEXT,
  webhook_secret TEXT,
  reconnect_count INTEGER DEFAULT 0,
  reconnect_at BIGINT,
  msg_sent INTEGER DEFAULT 0,
  msg_failed INTEGER DEFAULT 0,
  created_at BIGINT,
  updated_at BIGINT
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES sessions(session_id) ON DELETE CASCADE,
  chat_id TEXT NOT NULL,
  type TEXT,
  payload TEXT,
  status TEXT DEFAULT 'queued',
  wa_status TEXT,
  error TEXT,
  created_at BIGINT,
  sent_at BIGINT
);

-- Users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'operator',
  created_at BIGINT
);

-- User Sessions (junction)
CREATE TABLE IF NOT EXISTS user_sessions (
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  session_id TEXT REFERENCES sessions(session_id) ON DELETE CASCADE,
  label TEXT,
  project_name TEXT,
  created_at BIGINT,
  PRIMARY KEY (user_id, session_id)
);

-- API Keys
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  scopes TEXT DEFAULT 'read',
  last_used_at BIGINT,
  created_at BIGINT
);

-- Roles (RBAC)
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  permissions JSONB DEFAULT '[]',
  is_system BOOLEAN DEFAULT FALSE,
  created_at BIGINT,
  updated_at BIGINT
);

-- Tenant Packages
CREATE TABLE IF NOT EXISTS tenant_packages (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  package_name TEXT NOT NULL DEFAULT 'starter',
  max_sessions INTEGER DEFAULT 1,
  max_messages_per_day INTEGER DEFAULT 100,
  max_broadcasts_per_day INTEGER DEFAULT 0,
  features JSONB DEFAULT '[]',
  expires_at BIGINT,
  created_at BIGINT,
  updated_at BIGINT
);

-- Webhook Outbox
CREATE TABLE IF NOT EXISTS webhook_outbox (
  id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES sessions(session_id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT DEFAULT 'pending',
  retry_count INTEGER DEFAULT 0,
  created_at BIGINT
);

-- User Profiles
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id TEXT,
  session_id TEXT,
  persona TEXT DEFAULT 'unknown',
  persona_confidence REAL DEFAULT 0,
  avg_response_time REAL DEFAULT 0,
  msg_sent INTEGER DEFAULT 0,
  msg_received INTEGER DEFAULT 0,
  last_reply_at BIGINT,
  first_seen_at BIGINT,
  features JSONB,
  created_at BIGINT,
  updated_at BIGINT,
  PRIMARY KEY (user_id, session_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE
);

-- Behavior Config
CREATE TABLE IF NOT EXISTS behavior_config (
  session_id TEXT PRIMARY KEY REFERENCES sessions(session_id) ON DELETE CASCADE,
  persona_mode TEXT DEFAULT 'auto',
  ai_enabled BOOLEAN DEFAULT FALSE,
  ai_provider TEXT DEFAULT 'openai',
  ai_api_url TEXT,
  ai_api_key TEXT,
  ai_model TEXT DEFAULT 'gpt-4o-mini',
  ai_system_prompt TEXT,
  ai_temperature REAL DEFAULT 0.7,
  ai_max_tokens INTEGER DEFAULT 500,
  faq_enabled BOOLEAN DEFAULT TRUE,
  template_enabled BOOLEAN DEFAULT TRUE,
  volume_per_minute INTEGER DEFAULT 3,
  volume_per_hour INTEGER DEFAULT 20,
  volume_per_day INTEGER DEFAULT 100,
  cooldown_ms INTEGER DEFAULT 30000,
  quiet_hours_start INTEGER DEFAULT 22,
  quiet_hours_end INTEGER DEFAULT 7,
  quiet_hours_timezone TEXT DEFAULT 'Asia/Jakarta',
  timing_multiplier REAL DEFAULT 1.0,
  ml_learning_rate REAL DEFAULT 0.1,
  ml_decay REAL DEFAULT 0.05,
  model_state JSONB,
  created_at BIGINT,
  updated_at BIGINT
);

-- FAQ Entries
CREATE TABLE IF NOT EXISTS faq_entries (
  id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES sessions(session_id) ON DELETE CASCADE,
  question TEXT,
  answer TEXT NOT NULL,
  keywords JSONB,
  intent TEXT,
  enabled BOOLEAN DEFAULT TRUE,
  created_at BIGINT,
  updated_at BIGINT
);

-- Template Entries
CREATE TABLE IF NOT EXISTS template_entries (
  id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES sessions(session_id) ON DELETE CASCADE,
  intent TEXT NOT NULL,
  templates JSONB NOT NULL,
  created_at BIGINT,
  updated_at BIGINT
);

-- Behavior Outbox
CREATE TABLE IF NOT EXISTS behavior_outbox (
  id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES sessions(session_id) ON DELETE CASCADE,
  user_id TEXT,
  content_hash TEXT,
  content_preview TEXT,
  source TEXT,
  ai_provider_used TEXT,
  ai_model_used TEXT,
  persona_at_send TEXT,
  delay_ms INTEGER,
  created_at BIGINT
);

-- Broadcast Jobs
CREATE TABLE IF NOT EXISTS broadcast_jobs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  total_targets INTEGER,
  sent INTEGER DEFAULT 0,
  failed INTEGER DEFAULT 0,
  status TEXT DEFAULT 'queued',
  created_at BIGINT,
  completed_at BIGINT
);

-- Broadcast Assignments
CREATE TABLE IF NOT EXISTS broadcast_assignments (
  id TEXT PRIMARY KEY,
  broadcast_id TEXT REFERENCES broadcast_jobs(id) ON DELETE CASCADE,
  session_id TEXT REFERENCES sessions(session_id) ON DELETE CASCADE,
  targets JSONB,
  sent INTEGER DEFAULT 0,
  failed INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending'
);

-- Dead Letter
CREATE TABLE IF NOT EXISTS webhook_dead_letter (
  id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES sessions(session_id) ON DELETE CASCADE,
  event TEXT,
  payload JSONB,
  last_error TEXT,
  created_at BIGINT,
  last_attempt_at BIGINT
);

-- Audit Log
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource TEXT,
  details JSONB,
  ip TEXT,
  created_at BIGINT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_tenant ON sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_webhook_status ON webhook_outbox(status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_session ON user_profiles(session_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_jobs_tenant ON broadcast_jobs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenants_api_key ON tenants(api_key);

-- Row Level Security
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- RLS Policies (per-tenant isolation)
CREATE POLICY tenant_isolation_sessions ON sessions
  USING (tenant_id = current_setting('app.current_tenant', true)::text);

CREATE POLICY tenant_isolation_messages ON messages
  USING (session_id IN (
    SELECT session_id FROM sessions
    WHERE tenant_id = current_setting('app.current_tenant', true)::text
  ));
