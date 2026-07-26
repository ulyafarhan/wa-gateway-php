import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';

process.env.DB_PATH = ':memory:';
process.env.JWT_SECRET = 'test-secret-for-unit-tests';
process.env.API_KEY = '';

const db = (await import('../../src/db.js')).default;
const auth = await import('../../src/auth.js');

describe('hashPassword / verifyPassword', () => {
  it('hash dan verify password benar', () => {
    const hash = auth.hashPassword('testpass123');
    assert.ok(hash.startsWith('$2'));
    assert.ok(auth.verifyPassword('testpass123', hash));
  });

  it('verify password salah return false', () => {
    const hash = auth.hashPassword('testpass123');
    assert.equal(auth.verifyPassword('wrongpass', hash), false);
  });
});

describe('generateToken / verifyToken', () => {
  const user = { id: 'u1', username: 'testuser', role: 'admin' };

  it('generate dan verify access token', () => {
    const token = auth.generateToken(user, '15m');
    assert.ok(typeof token === 'string');
    const decoded = auth.verifyToken(token);
    assert.equal(decoded.id, 'u1');
    assert.equal(decoded.username, 'testuser');
    assert.equal(decoded.role, 'admin');
    assert.ok(decoded.exp > decoded.iat);
  });

  it('verify token invalid return null', () => {
    assert.equal(auth.verifyToken('invalid.token.here'), null);
    assert.equal(auth.verifyToken(''), null);
  });

  it('token dengan JWT_SECRET berbeda return null', () => {
    const token = auth.generateToken(user, '15m');
    assert.ok(auth.verifyToken(token)); // same secret
  });
});

describe('hasPermission', () => {
  it('superadmin bypass semua permission', () => {
    assert.equal(auth.hasPermission('superadmin', 'anything:here'), true);
    assert.equal(auth.hasPermission('superadmin', ''), true);
  });

  it('viewer hanya punya read permissions', () => {
    assert.equal(auth.hasPermission('viewer', 'sessions:read'), true);
    assert.equal(auth.hasPermission('viewer', 'messages:read'), true);
    assert.equal(auth.hasPermission('viewer', 'messages:send'), false);
    assert.equal(auth.hasPermission('viewer', 'sessions:create'), false);
  });

  it('client bisa send messages', () => {
    assert.equal(auth.hasPermission('client', 'messages:send'), true);
    assert.equal(auth.hasPermission('client', 'sessions:create'), false);
  });

  it('operator punya behavior access', () => {
    assert.equal(auth.hasPermission('operator', 'behavior:read'), true);
    assert.equal(auth.hasPermission('operator', 'broadcast:create'), true);
  });

  it('admin wildcard sessions:* match semua session permission', () => {
    assert.equal(auth.hasPermission('admin', 'sessions:read'), true);
    assert.equal(auth.hasPermission('admin', 'sessions:create'), true);
    assert.equal(auth.hasPermission('admin', 'sessions:delete'), true);
  });

  it('global wildcard * (superadmin)', () => {
    assert.equal(auth.hasPermission('superadmin', 'whatever:you:want'), true);
  });

  it('role tidak dikenal return false', () => {
    assert.equal(auth.hasPermission('nonexistent_role', 'anything'), false);
  });
});

describe('checkTenantLimits', () => {
  before(() => {
    const now = Date.now();
    db.prepareInsertTenant.run('tenant-check', 'Check Tenant', 'check-tenant', 'key-check', null, null, now, now);
  });

  it('no package — error', () => {
    const r = auth.checkTenantLimits('no-pkg-tenant');
    assert.equal(r.allowed, false);
    assert.equal(r.error, 'No package configured');
  });

  it('expired package — error', () => {
    const now = Date.now();
    db.prepare('INSERT INTO tenant_packages (id, tenant_id, package_name, max_sessions, max_messages_per_day, max_broadcasts_per_day, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run('pkg-expired', 'tenant-check', 'starter', 1, 100, 0, now - 1000, now);
    const r = auth.checkTenantLimits('tenant-check');
    assert.equal(r.allowed, false);
    assert.equal(r.error, 'Package expired');
  });

  it('session limit reached — error', () => {
    const now = Date.now();
    const tid = 'tenant-session-limit';
    db.prepareInsertTenant.run(tid, 'Session Limit', 'session-limit', 'key-session', null, null, now, now);
    db.prepare('INSERT INTO tenant_packages (id, tenant_id, package_name, max_sessions, max_messages_per_day, max_broadcasts_per_day, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run('pkg-session', tid, 'starter', 0, 100, 0, null, now);
    const r = auth.checkTenantLimits(tid);
    assert.equal(r.allowed, false);
    assert.ok(r.error.includes('limit'));
  });

  it('all good — return usage info', () => {
    const now = Date.now();
    const tid = 'tenant-good';
    db.prepareInsertTenant.run(tid, 'Good Tenant', 'good-tenant', 'key-good', null, null, now, now);
    db.prepare('INSERT INTO tenant_packages (id, tenant_id, package_name, max_sessions, max_messages_per_day, max_broadcasts_per_day, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run('pkg-good', tid, 'pro', 5, 500, 10, null, now);
    const r = auth.checkTenantLimits(tid);
    assert.equal(r.allowed, true);
    assert.equal(r.package, 'pro');
    assert.equal(r.limits.max_sessions, 5);
  });
});

describe('createUser', () => {
  it('password < 8 chars throw', () => {
    assert.throws(() => auth.createUser({ username: 'u1', email: 'u1@t.com', password: '1234567' }), /8 characters/);
  });

  it('create user sukses', () => {
    const u = auth.createUser({ username: 'newuser', email: 'new@test.com', password: 'password123', role: 'operator' });
    assert.equal(u.username, 'newuser');
    assert.equal(u.email, 'new@test.com');
    assert.equal(u.role, 'operator');
    const saved = db.prepare('SELECT * FROM users WHERE username = ?').get('newuser');
    assert.ok(saved);
    assert.ok(saved.password_hash.startsWith('$2'));
  });
});
