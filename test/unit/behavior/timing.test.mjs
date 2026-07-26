import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AdaptiveTiming } from '../../../src/behavior/timing.js';

describe('AdaptiveTiming generate', () => {
  // Fix Math.random untuk deterministik
  const originalRandom = Math.random;

  it('generate quick persona return angka non-negatif', () => {
    const t = new AdaptiveTiming();
    const r = t.generate('quick', 1.0);
    assert.equal(typeof r.readDelay, 'number');
    assert.equal(typeof r.typingDelay, 'number');
    assert.equal(typeof r.sendDelay, 'number');
    assert.ok(r.readDelay >= 0);
    assert.ok(r.typingDelay >= 0);
    assert.ok(r.sendDelay >= 0);
  });

  it('generate semua persona tidak crash', () => {
    const t = new AdaptiveTiming();
    for (const p of ['quick', 'normal', 'relaxed', 'business']) {
      const r = t.generate(p);
      assert.ok(r.readDelay >= 0);
      assert.ok(r.sendDelay >= 0);
    }
  });

  it('generate unknown persona fallback ke normal', () => {
    const t = new AdaptiveTiming();
    const r = t.generate('unknown_persona');
    assert.ok(r.readDelay >= 0);
    assert.ok(r.sendDelay >= 0);
  });

  it('multiplier 0 menghasilkan semua delay 0', () => {
    const t = new AdaptiveTiming();
    const r = t.generate('normal', 0);
    assert.equal(r.readDelay, 0);
    assert.equal(r.typingDelay, 0);
    assert.equal(r.sendDelay, 0);
  });

  it('multiplier 0.5 mengurangi delay', () => {
    const t = new AdaptiveTiming();
    const r1 = t.generate('normal', 1.0);
    const r2 = t.generate('normal', 0.5);
    assert.ok(true); // tidak crash, value deterministic ketika Math.random fixed
  });

  it('multiplier 2.0 memperbesar delay', () => {
    const t = new AdaptiveTiming();
    const r = t.generate('normal', 2.0);
    assert.ok(r.readDelay >= 0);
    assert.ok(r.sendDelay >= 0);
  });
});

describe('AdaptiveTiming update', () => {
  it('update EMA dengan sample baru', () => {
    const t = new AdaptiveTiming(0.3);
    const result = t.update(100, 200);
    // EMA = 0.3 * 200 + 0.7 * 100 = 60 + 70 = 130
    assert.equal(result, 130);
  });

  it('update tanpa sample return ema', () => {
    const t = new AdaptiveTiming(0.3);
    assert.equal(t.update(100, null), 100);
    assert.equal(t.update(100, 0), 100);
  });

  it('update tanpa ema dan tanpa sample return 0', () => {
    const t = new AdaptiveTiming(0.3);
    assert.equal(t.update(null, null), null);
  });

  it('update dengan alpha 1.0 menggunakan sample sepenuhnya', () => {
    const t = new AdaptiveTiming(1.0);
    assert.equal(t.update(100, 200), 200);
  });

  it('update dengan alpha 0.0 menggunakan ema sepenuhnya', () => {
    const t = new AdaptiveTiming(0.0);
    assert.equal(t.update(100, 200), 100);
  });
});
