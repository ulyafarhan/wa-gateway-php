// ponytail: test API security — auth bypass, query string key, body limit
import { describe, it } from 'node:test';
import assert from 'node:assert';

const BASE = process.env.TEST_URL || 'http://localhost:2785';

describe('API Security', () => {
  it('GET /api/sessions tanpa auth -> 401 (regression: auth bypass)', async () => {
    const res = await fetch(`${BASE}/api/sessions`);
    // Seharusnya 401 karena tidak ada API_KEY dan tidak ada JWT
    assert.ok(res.status === 401 || res.status === 403,
      `harus tolak request tanpa auth, dapat ${res.status}`);
  });

  it('GET /api/sessions dengan api_key di query string -> (seharusnya ditolak atau pake header)', async () => {
    const res = await fetch(`${BASE}/api/sessions?apikey=test`);
    assert.ok(res.status === 401 || res.status === 403,
      `query string apikey tidak boleh bypass auth, dapat ${res.status}`);
  });

  it('POST ke /api/sessions dengan payload besar -> 413 atau ditolak', async () => {
    const bigPayload = { session_id: 'test', data: 'x'.repeat(2 * 1024 * 1024) }; // 2MB
    const res = await fetch(`${BASE}/api/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bigPayload)
    });
    // Body limit 1mb, 2mb harus ditolak
    assert.ok(res.status === 413 || res.status === 400 || res.status === 401,
      `payload besar harus ditolak, dapat ${res.status}`);
  });
});
