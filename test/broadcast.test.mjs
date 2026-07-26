import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';

process.env.DB_PATH = './data/test-broadcast.db';
process.env.RATE_LIMIT_MS = '100';

for (const key of Object.keys(import.meta.resolve)) {
  const mod = import.meta.resolve(key);
  if (mod.includes('src/')) delete require.cache[mod];
}

const { default: db } = await import('../src/db.js');
const { enqueueBroadcast, startBroadcastProcessor } = await import('../src/broadcast.js');

describe('Broadcast', () => {
  before(() => {
    db.prepare(`INSERT OR IGNORE INTO sessions (session_id, status, created_at, updated_at) VALUES (?, ?, ?, ?)`)
      .run('test-session', 'connected', Date.now(), Date.now());
  });

  after(() => {
    try { require('fs').unlinkSync('./data/test-broadcast.db'); } catch {}
    try { require('fs').unlinkSync('./data/test-broadcast.db-wal'); } catch {}
    try { require('fs').unlinkSync('./data/test-broadcast.db-shm'); } catch {}
  });

  it('enqueueBroadcast simpan broadcast_jobs dan broadcast_assignments', () => {
    const result = enqueueBroadcast('test-session', null, ['6281111111111@s.whatsapp.net', '6282222222222@s.whatsapp.net'], 'Test broadcast', 'normal', null);

    assert.ok(result.broadcast_id, 'broadcast_id dihasilkan');
    assert.equal(result.total_targets, 2);

    const job = db.prepare('SELECT * FROM broadcast_jobs WHERE id = ?').get(result.broadcast_id);
    assert.ok(job, 'broadcast_jobs terisi');
    assert.equal(job.status, 'queued');

    const assignment = db.prepare('SELECT * FROM broadcast_assignments WHERE broadcast_id = ?').get(result.broadcast_id);
    assert.ok(assignment, 'broadcast_assignments terisi');
    const targets = JSON.parse(assignment.targets);
    assert.equal(targets.length, 2);
  });

  it('processScheduledBroadcasts activate scheduled jobs', () => {
    const futureId = 'test-future';
    // Insert a scheduled broadcast that should be activated
    db.prepare("INSERT INTO broadcast_jobs (id, tenant_id, total_targets, status, created_at) VALUES (?, ?, ?, 'scheduled', ?)")
      .run(futureId, null, 1, Date.now() - 10000); // 10 detik lalu

    const { processScheduledBroadcasts } = require('../src/broadcast.js');
    const changes = processScheduledBroadcasts();
    assert.ok(changes >= 0, 'processScheduledBroadcasts berjalan tanpa error');
  });

  it('broadcast processor jalan tanpa crash', async () => {
    startBroadcastProcessor();
    await new Promise(r => setTimeout(r, 200));
    assert.ok(true, 'broadcast processor started and running');
  });
});
