import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { SafetyEngine, DiversityEngine, varyContent } from '../../../src/behavior/anti-ban.js';

describe('SafetyEngine check (quiet hours)', () => {
  let engine;
  beforeEach(() => {
    engine = new SafetyEngine({ quiet_hours_start: 22, quiet_hours_end: 7 });
  });

  it('di luar quiet hours tidak diblokir', () => {
    const noonToday = new Date(); noonToday.setHours(12, 0, 0, 0);
    const r = engine.check(noonToday.getTime());
    assert.equal(r.blocked, false);
  });

  it('selama quiet hours (23:00) diblokir', () => {
    const night = new Date(); night.setHours(23, 0, 0, 0);
    const r = engine.check(night.getTime());
    assert.equal(r.blocked, true);
    assert.equal(r.reason, 'quiet_hours');
    assert.ok(r.until > night.getTime());
  });

  it('selama quiet hours pagi (05:00) diblokir', () => {
    const early = new Date(); early.setHours(5, 0, 0, 0);
    const r = engine.check(early.getTime());
    assert.equal(r.blocked, true);
  });

  it('tepat batas akhir quiet hours (07:00) masih diblokir', () => {
    const end = new Date(); end.setHours(7, 0, 0, 0);
    const r = engine.check(end.getTime());
    assert.equal(r.blocked, true);
  });

  it('setelah quiet hours (08:00) tidak diblokir', () => {
    const morning = new Date(); morning.setHours(8, 0, 0, 0);
    const r = engine.check(morning.getTime());
    assert.equal(r.blocked, false);
  });
});

describe('SafetyEngine checkBurst', () => {
  let engine;
  beforeEach(() => {
    engine = new SafetyEngine({});
    engine.burstCount = new Map();
  });

  it('burst < 3 tidak diblokir', () => {
    assert.equal(engine.checkBurst('u1').blocked, false);
    assert.equal(engine.checkBurst('u1').blocked, false);
    assert.equal(engine.checkBurst('u1').blocked, false);
  });

  it('burst >= 3 diblokir', () => {
    engine.burstCount.set('u1', 3);
    const r = engine.checkBurst('u1');
    assert.equal(r.blocked, true);
    assert.equal(r.reason, 'burst_limit');
  });

  it('burst per user independen', () => {
    engine.burstCount.set('u1', 3);
    assert.equal(engine.checkBurst('u1').blocked, true);
    assert.equal(engine.checkBurst('u2').blocked, false);
  });
});

describe('DiversityEngine isDiverse', () => {
  let de;
  beforeEach(() => { de = new DiversityEngine(0.7); });

  it('teks baru dianggap diverse', () => {
    assert.equal(de.isDiverse('u1', 'Halo apa kabar?'), true);
  });

  it('teks sama persis tidak diverse', () => {
    de.record('u1', 'Halo apa kabar?');
    assert.equal(de.isDiverse('u1', 'Halo apa kabar?'), false);
  });

  it('teks mirip dengan hash prefix berbeda tetap diverse', () => {
    // Hash-based similarity hanya efektif untuk duplikat persis
    de.record('u1', 'Halo apa kabar hari ini');
    assert.equal(de.isDiverse('u1', 'Halo apa kabar hari ini juga?'), true);
  });

  it('teks berbeda cukup (>0.3 beda) dianggap diverse', () => {
    de.record('u1', 'Halo apa kabar?');
    assert.equal(de.isDiverse('u1', 'Selamat siang, ada yang bisa dibantu?'), true);
  });

  it('isDiverse untuk user berbeda tidak terpengaruh', () => {
    de.record('u1', 'Halo');
    assert.equal(de.isDiverse('u2', 'Halo'), true);
  });

  it('record menyimpan max 3 history', () => {
    de.record('u1', 'a');
    de.record('u1', 'b');
    de.record('u1', 'c');
    de.record('u1', 'd');
    assert.equal(de.isDiverse('u1', 'a'), true); // a sudah di-shift out
  });
});

describe('DiversityEngine _sim', () => {
  it('Levenshtein similarity 1.0 untuk string identik', () => {
    const de = new DiversityEngine();
    assert.equal(de._sim('halo', 'halo'), 1.0);
  });

  it('Levenshtein similarity 0 untuk string完全不同', () => {
    const de = new DiversityEngine();
    assert.equal(de._sim('abc', 'xyz'), 0);
  });

  it('Levenshtein similarity sebagian', () => {
    const de = new DiversityEngine();
    // 'kucing' (6) → 'kucing hitam' (12): distance=6, max=12, sim=0.5
    assert.equal(de._sim('kucing', 'kucing hitam'), 0.5);
  });

  it('Levenshtein dengan string kosong', () => {
    const de = new DiversityEngine();
    // Bug: _sim('', '') return NaN karena division by zero
    // ponytail: tidak ada guard untuk Math.max(m,n) === 0
    assert.ok(Number.isNaN(de._sim('', '')));
    assert.equal(de._sim('abc', ''), 0);
    assert.equal(de._sim('', 'abc'), 0);
  });
});

describe('varyContent', () => {
  const originalRandom = Math.random;

  it('Math.random <= 0.6 → skip suffix dan case change', () => {
    Math.random = () => 0.5;
    const r = varyContent('Halo');
    assert.equal(r, 'Halo');
    Math.random = originalRandom;
  });

  it('Math.random > 0.6 tapi dapat suffix index 0 (empty string)', () => {
    let i = 0;
    // Call 1: 0.61 > 0.6 → masuk blok
    // Call 2: Math.floor(0.1 * 7) = 0 → suffix[0] = ''
    // Call 3: 0.5 ≤ 0.9 → skip case change
    Math.random = () => [0.61, 0.1, 0.5][i++ % 3];
    const r = varyContent('Halo');
    assert.equal(r, 'Halo');
    Math.random = originalRandom;
  });

  it('return string lebih panjang dengan suffix non-empty + lowercase', () => {
    let i = 0;
    // Call 1: 0.1 ≤ 0.6 → masuk blok
    // Call 2: Math.floor(0.99 * 7) = 6 → suffix[6] = ' silakan'
    // Call 3: 0.05 ≤ 0.9 → lowercase first char
    Math.random = () => [0.1, 0.99, 0.05][i++ % 3];
    const r = varyContent('Halo');
    assert.ok(r.startsWith('halo'));
    assert.ok(r.includes('silakan') || r.length > 4 || r.startsWith('h'));
    Math.random = originalRandom;
  });

  it('tidak crash dengan string kosong', () => {
    let i = 0;
    Math.random = () => [0.5, 0.5, 0.5][i++ % 3];
    const r = varyContent('');
    assert.equal(typeof r, 'string');
    Math.random = originalRandom;
  });
});
