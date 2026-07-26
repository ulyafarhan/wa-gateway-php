// ponytail: periodic watermark-based sync to Supabase + Cloudflare D1
// global lock, per-table locks if contention matters
import crypto from 'crypto';
import db from './db.js';

const CF = {
  account: process.env.CLOUDFLARE_ACCOUNT_ID,
  db: process.env.CLOUDFLARE_D1_DATABASE_ID,
  token: process.env.CLOUDFLARE_API_TOKEN,
};
const SB = {
  url: process.env.SUPABASE_URL,
  key: process.env.SUPABASE_SECRET_KEY,
};
const ACTIVE = {
  d1: !!(CF.account && CF.db && CF.token),
  supabase: !!(SB.url && SB.key),
};

const INTERVAL = {
  supabase: parseInt(process.env.SYNC_INTERVAL_SUPABASE || '300000', 10),
  d1: parseInt(process.env.SYNC_INTERVAL_D1 || '900000', 10),
};
const BATCH = parseInt(process.env.SYNC_BATCH_SIZE || '100', 10);
const RETRY = [5000, 30000, 300000, 900000];

// ponytail: in-memory watermarks, lost on restart (full re-sync next cycle)
const wm = { supabase: {}, d1: {} };

// Tables with updated_at for incremental sync (others use created_at)
const TABLES = [
  { name: 'messages', ts: 'created_at' },
  { name: 'sessions', ts: 'updated_at' },
  { name: 'tenants', ts: 'updated_at' },
  { name: 'users', ts: 'created_at' },
  { name: 'user_sessions', ts: 'created_at' },
  { name: 'api_keys', ts: 'created_at' },
  { name: 'roles', ts: 'updated_at' },
  { name: 'tenant_packages', ts: 'updated_at' },
  { name: 'webhook_outbox', ts: 'created_at' },
  { name: 'user_profiles', ts: 'updated_at' },
  { name: 'behavior_config', ts: 'updated_at' },
  { name: 'faq_entries', ts: 'updated_at' },
  { name: 'template_entries', ts: 'updated_at' },
  { name: 'broadcast_jobs', ts: 'created_at' },
  { name: 'webhook_dead_letter', ts: 'created_at' },
  { name: 'audit_log', ts: 'created_at' },
];

async function pushToD1(table, rows) {
  const values = rows.map(r => `(${Object.keys(r).map(k => {
    const v = r[k];
    if (v === null || v === undefined) return 'NULL';
    if (typeof v === 'number') return v;
    return `'${String(v).replace(/'/g, "''")}'`;
  }).join(',')})`).join(',');
  const cols = Object.keys(rows[0]).join(', ');
  const sql = `INSERT OR REPLACE INTO ${table} (${cols}) VALUES ${values}`;
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CF.account}/d1/database/${CF.db}/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${CF.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql }),
  });
  const data = await res.json();
  if (!data.success) console.error(`[sync] D1 ${table}: ${data.errors?.[0]?.message || 'unknown'}`);
  return data.success;
}

async function pushToSupabase(table, rows) {
  const res = await fetch(`${SB.url}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SB.key,
      Authorization: `Bearer ${SB.key}`,
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) console.error(`[sync] Supabase ${table}: ${res.status} ${await res.text().catch(() => '')}`);
  return res.ok;
}

async function syncTable(target, table, ts) {
  const watermark = wm[target][table] || 0;
  let maxTs = watermark;

  const rows = db.prepare(`SELECT * FROM ${table} WHERE ${ts} > ? ORDER BY ${ts} ASC LIMIT ?`).all(watermark, BATCH);
  if (!rows.length) return;

  const pushFn = target === 'd1' ? pushToD1 : pushToSupabase;

  for (let attempt = 0; attempt <= RETRY.length; attempt++) {
    const ok = await pushFn(table, rows);
    if (ok) {
      maxTs = Math.max(...rows.map(r => r[ts] || 0), watermark);
      wm[target][table] = maxTs;
      return;
    }
    if (attempt < RETRY.length) {
      await new Promise(r => setTimeout(r, RETRY[attempt]));
    }
  }

  // ponytail: max retries exhausted, dead letter
  try {
    db.prepare(`INSERT INTO webhook_dead_letter (id, session_id, event, payload, last_error, created_at, last_attempt_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(crypto.randomUUID(), table, `sync_${target}`, JSON.stringify(rows.slice(0, 3)), `Failed after ${RETRY.length} retries`, Date.now(), Date.now());
  } catch {}
}

async function syncTarget(target) {
  if (!ACTIVE[target]) return;
  for (const { name, ts } of TABLES) {
    await syncTable(target, name, ts);
  }
}

let running = false;
async function tick() {
  if (running) return;
  running = true;
  try {
    await syncTarget('supabase');
    await syncTarget('d1');
  } finally {
    running = false;
  }
}

let supabaseTimer, d1Timer;
export function startSync() {
  if (ACTIVE.supabase) {
    tick();
    supabaseTimer = setInterval(tick, INTERVAL.supabase);
  }
  if (ACTIVE.d1) {
    if (!ACTIVE.supabase) tick();
    d1Timer = setInterval(() => syncTarget('d1'), INTERVAL.d1);
  }
}

export function stopSync() {
  clearInterval(supabaseTimer);
  clearInterval(d1Timer);
}
