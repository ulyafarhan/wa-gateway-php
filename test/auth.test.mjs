import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';

process.env.DB_PATH = './data/test-wagateway.db';
process.env.JWT_SECRET = 'test-secret-for-testing-only';
process.env.API_KEY = '';

// Hapus cache modul biar pake env baru
for (const key of Object.keys(import.meta.resolve)) {
  const mod = import.meta.resolve(key);
  if (mod.includes('src/')) delete require.cache[mod];
}

const { default: db } = await import('../src/db.js');
const { default: adminRouter } = await import('../src/routes/admin.js');
const { createUser, verifyToken, generateToken, hashPassword } = await import('../src/auth.js');

describe('Auth Flow', () => {
  before(() => {
    createUser({ username: 'testuser', email: 'test@test.com', password: 'pass12345', role: 'client' });
  });

  after(() => {
    db.close();
    try { require('fs').unlinkSync('./data/test-wagateway.db'); } catch {}
    try { require('fs').unlinkSync('./data/test-wagateway.db-wal'); } catch {}
    try { require('fs').unlinkSync('./data/test-wagateway.db-shm'); } catch {}
  });

  it('login dengan kredensial valid -> access_token', () => {
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get('testuser');
    assert.ok(user, 'user harus ada');
    assert.match(user.password_hash, /^\$2[aby]\$10\$/, 'password_hash harus bcrypt');
    const token = generateToken(user, '15m');
    assert.ok(token, 'token dihasilkan');
    const decoded = verifyToken(token);
    assert.equal(decoded.username, 'testuser');
    assert.equal(decoded.role, 'client');
  });

  it('login dengan password salah -> null', () => {
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get('testuser');
    const { verifyPassword } = require('../src/auth.js');
    assert.ok(user);
    assert.ok(!verifyPassword('wrongpass', user.password_hash));
  });

  it('refresh token httpOnly -> access_token baru', () => {
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get('testuser');
    const refreshToken = generateToken(user, '7d');
    const decoded = verifyToken(refreshToken);
    assert.ok(decoded, 'refresh token valid');
    assert.ok(decoded.exp > decoded.iat, 'expiry > issued');
  });

  it('authMiddleware tolak request tanpa API_KEY dan tanpa JWT', () => {
    const { authMiddleware } = require('../src/auth.js');
    let statusCode = 0;
    let jsonData = null;
    const req = { headers: {} };
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { jsonData = data; }
    };
    authMiddleware(req, res, () => {});
    assert.equal(statusCode, 401);
    assert.equal(jsonData.error, 'No access token provided');
  });

  it('verifyToken tolak token expired/invalid -> null', () => {
    assert.equal(verifyToken('invalid.token.here'), null);
    assert.equal(verifyToken(''), null);
  });
});
