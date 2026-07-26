import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

process.env.DB_PATH = ':memory:';
process.env.JWT_SECRET = 'test-secret';
process.env.WEBHOOK_URL = '';

const db = (await import('../../src/db.js')).default;
const wh = await import('../../src/webhook.js');

describe('getWebhookUrl', () => {
  before(() => {
    db.prepare('INSERT INTO sessions (session_id, status, webhook_url, webhook_secret, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run('wh-session', 'connected', 'https://example.com/hook', 'sec123', Date.now(), Date.now());
    db.prepare('INSERT INTO sessions (session_id, status, webhook_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run('wh-session-nosecret', 'connected', 'https://example.com/hook2', Date.now(), Date.now());
    db.prepare('INSERT INTO sessions (session_id, status, created_at, updated_at) VALUES (?, ?, ?, ?)').run('wh-session-nourl', 'connected', Date.now(), Date.now());
  });

  it('session dengan webhook_url return url dan secret', () => {
    const r = wh.getWebhookUrl('wh-session');
    assert.equal(r.url, 'https://example.com/hook');
    assert.equal(r.secret, 'sec123');
  });

  it('session tanpa webhook_secret return secret kosong', () => {
    const r = wh.getWebhookUrl('wh-session-nosecret');
    assert.equal(r.url, 'https://example.com/hook2');
    assert.equal(r.secret, '');
  });

  it('session tanpa webhook_url return null', () => {
    assert.equal(wh.getWebhookUrl('wh-session-nourl'), null);
  });

  it('session tidak ada return null', () => {
    assert.equal(wh.getWebhookUrl('nonexistent'), null);
  });
});

describe('enqueueWebhook — tanpa webhook URL (skip)', () => {
  it('tidak insert ke DB jika tidak ada webhook_url', () => {
    db.prepare('INSERT INTO sessions (session_id, status, created_at, updated_at) VALUES (?, ?, ?, ?)').run('no-wh', 'connected', Date.now(), Date.now());
    wh.enqueueWebhook('no-wh', 'test', { msg: 'hello' });
    const row = db.prepare('SELECT COUNT(*) as c FROM webhook_outbox WHERE session_id = ?').get('no-wh');
    assert.equal(row.c, 0);
  });
});

describe('deliver — success', () => {
  let server;
  let url;
  const received = [];

  before(async () => {
    server = http.createServer((req, res) => {
      let body = '';
      req.on('data', c => body += c);
      req.on('end', () => {
        received.push({ url: req.url, headers: req.headers, body: JSON.parse(body) });
        res.writeHead(200);
        res.end('ok');
      });
    });
    await new Promise(r => server.listen(0, r));
    url = `http://127.0.0.1:${server.address().port}`;
  });

  after(() => server.close());

  it('deliver sukses update status ke delivered', async () => {
    db.prepare('INSERT INTO sessions (session_id, status, webhook_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run('wh-del-succ', 'connected', url, Date.now(), Date.now());

    wh.enqueueWebhook('wh-del-succ', 'message', { text: 'test success' });
    await new Promise(r => setTimeout(r, 200));

    const row = db.prepare('SELECT * FROM webhook_outbox WHERE session_id = ?').get('wh-del-succ');
    assert.ok(row, 'webhook record should exist');
    assert.equal(row.status, 'delivered');
    assert.equal(row.event, 'message');
  });

  it('deliver mengirim body yang benar', () => {
    const found = received.find(r => r.body.event === 'message' && r.body.text === 'test success');
    assert.ok(found, 'should have received the webhook payload');
    assert.ok(found.body.session_id, 'wh-del-succ');
    assert.ok(found.body.timestamp);
  });
});

describe('deliver — failure', () => {
  it('deliver ke URL invalid update status ke failed', async () => {
    db.prepare('INSERT INTO sessions (session_id, status, webhook_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run('wh-del-fail', 'connected', 'http://127.0.0.1:1/nonexistent', Date.now(), Date.now());

    wh.enqueueWebhook('wh-del-fail', 'message', { text: 'test fail' });
    await new Promise(r => setTimeout(r, 200));

    const row = db.prepare('SELECT * FROM webhook_outbox WHERE session_id = ?').get('wh-del-fail');
    assert.ok(row, 'webhook record should exist');
    assert.equal(row.status, 'failed');
  });
});

describe('deliver — retry langsung', () => {
  it('deliver dipanggil manual update retry_count', async () => {
    const now = Date.now();
    const id = 'wh-retry-test';
    db.prepare('INSERT INTO sessions (session_id, status, webhook_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run('retry-sess', 'connected', 'http://127.0.0.1:1/nonexistent', now, now);
    db.prepareInsertWebhook.run(id, 'retry-sess', 'retry-event', JSON.stringify({ test: true }), now);

    await wh.deliver(id, { url: 'http://127.0.0.1:1/bad', secret: '' }, JSON.stringify({ test: true }), 'retry-sess');
    await new Promise(r => setTimeout(r, 100));

    const row = db.prepare('SELECT * FROM webhook_outbox WHERE id = ?').get(id);
    assert.ok(row, 'record should exist');
    assert.equal(row.status, 'failed');
  });
});
