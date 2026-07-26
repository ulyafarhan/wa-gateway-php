import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { cacheGet, cacheSet, cacheDel } from '../../src/cache.js';

describe('cacheGet / cacheSet', () => {
  it('set lalu get mengembalikan value', () => {
    cacheSet('k1', 'v1', 60000);
    assert.equal(cacheGet('k1'), 'v1');
  });

  it('get key yang tidak ada return null', () => {
    assert.equal(cacheGet('nonexistent'), null);
  });

  it('get setelah expired return null', async () => {
    cacheSet('k2', 'v2', 10);
    assert.equal(cacheGet('k2'), 'v2');
    await new Promise(r => setTimeout(r, 30));
    assert.equal(cacheGet('k2'), null);
  });

  it('set dengan TTL 0 langsung expired', async () => {
    cacheSet('k3', 'v3', 0);
    await new Promise(r => setTimeout(r, 5));
    assert.equal(cacheGet('k3'), null);
  });

  it('set dengan key yang sama menimpa value lama', () => {
    cacheSet('k4', 'old', 60000);
    cacheSet('k4', 'new', 60000);
    assert.equal(cacheGet('k4'), 'new');
  });

  it('set dengan TTL besar tidak expired dalam test', () => {
    cacheSet('k5', 'v5', 86400000);
    assert.equal(cacheGet('k5'), 'v5');
  });
});

describe('cacheDel', () => {
  it('cacheDel exact key menghapus entry', () => {
    cacheSet('del1', 'v1', 60000);
    cacheDel('del1');
    assert.equal(cacheGet('del1'), null);
  });

  it('cacheDel pattern dengan wildcard prefix', () => {
    cacheSet('pref:a', 'va', 60000);
    cacheSet('pref:b', 'vb', 60000);
    cacheSet('other:c', 'vc', 60000);
    cacheDel('pref:*');
    assert.equal(cacheGet('pref:a'), null);
    assert.equal(cacheGet('pref:b'), null);
    assert.equal(cacheGet('other:c'), 'vc');
  });

  it('cacheDel pattern tidak mempengaruhi key yang tidak cocok', () => {
    cacheSet('user:1', 'u1', 60000);
    cacheSet('user:2', 'u2', 60000);
    cacheSet('admin:1', 'a1', 60000);
    cacheDel('user:*');
    assert.equal(cacheGet('user:1'), null);
    assert.equal(cacheGet('admin:1'), 'a1');
  });

  it('cacheDel zonder wildcard dianggap exact match', () => {
    cacheSet('exact', 'value', 60000);
    cacheDel('exact');
    assert.equal(cacheGet('exact'), null);
  });
});

after(() => {
  // Bersihkan semua timer agar node --test bisa exit
  for (const k of ['k1','k2','k3','k4','k5','del1','pref:a','pref:b','other:c','user:1','user:2','admin:1','exact']) cacheDel(k);
});
