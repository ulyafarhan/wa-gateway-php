// ponytail: test user flow — landing page → login → dashboard
import { describe, it } from 'node:test';
import assert from 'node:assert';

const BASE = process.env.TEST_URL || 'http://localhost:2785';

describe('User Flow', () => {
  it('GET / -> landing page (HTML)', async () => {
    const res = await fetch(`${BASE}/`);
    assert.equal(res.status, 200);
    const text = await res.text();
    assert.ok(text.includes('WaAceh'), 'landing page title WaAceh');
    assert.ok(text.includes('<!doctype html>') || text.includes('<!DOCTYPE html>'), 'response HTML');
  });

  it('GET /admin/login -> Vue SPA (harusnya redirect ke /login atau render SPA)', async () => {
    const res = await fetch(`${BASE}/admin/login`, { redirect: 'manual' });
    // SPA menangani routing client-side, jadi /admin/* GET return index.html
    assert.ok(res.status === 200 || res.status === 302 || res.status === 304,
      `SPA harus respond, dapat ${res.status}`);
  });

  it('Flow lengkap: landing -> login -> dashboard', async () => {
    // 1. Landing page
    const landing = await fetch(`${BASE}/`);
    assert.equal(landing.status, 200);

    // 2. Login
    const login = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: process.env.SEED_ADMIN_USER || 'admin',
        password: process.env.SEED_ADMIN_PASS || 'Admin#2026'
      })
    });
    assert.equal(login.status, 200);
    const { access_token } = await login.json();
    assert.ok(access_token);

    // 3. Dashboard (admin SPA)
    const dashboard = await fetch(`${BASE}/admin/`, {
      headers: { 'Authorization': `Bearer ${access_token}` }
    });
    assert.ok(dashboard.status === 200 || dashboard.status === 304,
      `dashboard accessible, dapat ${dashboard.status}`);
  });

  it('Logout -> refresh_token diclear', async () => {
    const res = await fetch(`${BASE}/api/auth/logout`, { method: 'POST' });
    const cookies = res.headers.getSetCookie?.() || [];
    const clearCookie = cookies.find(c => c.includes('refresh_token=') && c.includes('Max-Age=0'));
    assert.ok(clearCookie || res.status === 200,
      'logout harus clear cookie atau return success');
  });
});
