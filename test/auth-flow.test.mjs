// ponytail: integration test — auth flow via real HTTP calls
// Jalankan: node --test test/auth-flow.test.mjs
// (butuh server jalan di port 2785, atau set TEST_URL)

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';

const BASE = process.env.TEST_URL || 'http://localhost:2785';
const USERNAME = 'testuser_' + Date.now();
const PASSWORD = 'TestPass123!';

describe('Auth Flow Integration', () => {
  let accessToken = '';
  let refreshTokenCookie = '';

  it('Login dengan kredensial valid', async () => {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: process.env.SEED_ADMIN_USER || 'admin', password: process.env.SEED_ADMIN_PASS || 'Admin#2026' })
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.access_token, 'access_token ada');
    assert.equal(data.user.role, 'superadmin');
    accessToken = data.access_token;
    const cookies = res.headers.getSetCookie?.() || [];
    refreshTokenCookie = cookies.find(c => c.startsWith('refresh_token=')) || '';
    assert.ok(refreshTokenCookie, 'refresh_token cookie ada');
  });

  it('GET /api/auth/me dengan Bearer token', async () => {
    const res = await fetch(`${BASE}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.id, 'user id ada');
    assert.equal(data.role, 'superadmin');
  });

  it('GET /api/auth/me tanpa token -> 401', async () => {
    const res = await fetch(`${BASE}/api/auth/me`);
    assert.equal(res.status, 401);
  });

  it('POST /api/auth/login password salah -> 401', async () => {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'wrongpass' })
    });
    assert.equal(res.status, 401);
  });

  it('GET /api/health tanpa auth -> 200 (public)', async () => {
    const res = await fetch(`${BASE}/api/health`);
    assert.equal(res.status, 200);
  });
});
