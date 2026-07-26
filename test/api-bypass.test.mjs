import { describe, it } from 'node:test';
import assert from 'node:assert';

process.env.DB_PATH = './data/test-apibypass.db';
process.env.JWT_SECRET = 'test-secret';
process.env.API_KEY = ''; // Tidak diset — harus reject

const { default: db } = await import('../src/db.js');
const { authMiddleware } = await import('../src/routes/api.js');

describe('API Auth Bypass (P0 Critical)', () => {
  it('TANPA API_KEY dan TANPA JWT -> 401', () => {
    let statusCode = 0;
    let jsonData = null;
    const req = { headers: {}, path: '/api/sessions', method: 'GET' };
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { jsonData = data; }
    };
    authMiddleware(req, res, () => { fail('should not call next()'); });
    assert.equal(statusCode, 401, 'harus 401');
    assert.ok(jsonData.error, 'error message ada');
  });

  it('API_KEY kosong + JWT valid -> 401 (karena API_KEY empty string)', () => {
    let statusCode = 0;
    let jsonData = null;
    const req = { headers: { 'x-api-key': '' }, path: '/api/sessions', method: 'GET' };
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { jsonData = data; }
    };
    authMiddleware(req, res, () => { fail('should not call next()'); });
    assert.equal(statusCode, 401, 'API_KEY kosong harus 401');
  });
});

after(() => {
  try { require('fs').unlinkSync('./data/test-apibypass.db'); } catch {}
  try { require('fs').unlinkSync('./data/test-apibypass.db-wal'); } catch {}
  try { require('fs').unlinkSync('./data/test-apibypass.db-shm'); } catch {}
});
