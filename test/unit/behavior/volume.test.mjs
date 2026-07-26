import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { AdaptiveTokenBucket } from '../../../src/behavior/volume.js';

describe('AdaptiveTokenBucket consume', () => {
  let bucket;

  beforeEach(() => {
    bucket = new AdaptiveTokenBucket({ volume_per_minute: 3, volume_per_hour: 20, volume_per_day: 100, cooldown_ms: 30000 });
  });

  it('consume pertama return true', () => {
    assert.equal(bucket.consume('user1'), true);
  });

  it('consume melebihi maxPerMinute return false', () => {
    // setiap call dipisah 31s agar cooldown 30s tidak mengganggu
    const base = Date.now();
    assert.equal(bucket.consume('user1', base + 31000), true);
    assert.equal(bucket.consume('user1', base + 62000), true);
    assert.equal(bucket.consume('user1', base + 93000), true);
    assert.equal(bucket.consume('user1', base + 124000), false);
  });

  it('consume user berbeda tidak saling mempengaruhi', () => {
    const base = Date.now();
    assert.equal(bucket.consume('userA', base + 31000), true);
    assert.equal(bucket.consume('userA', base + 62000), true);
    assert.equal(bucket.consume('userA', base + 93000), true);
    // userB belum pernah consume — cooldown tidak aktif
    assert.equal(bucket.consume('userB', base + 124000), true);
    assert.equal(bucket.consume('userB', base + 155000), true);
  });

  it('cooldown enforcement menolak dalam cooldownMs', () => {
    const now = Date.now();
    assert.equal(bucket.consume('user1', now), true);
    assert.equal(bucket.consume('user1', now - 1000), false); // cooldown 30s dari now
  });

  it('cooldown setelah waktu berlalu allow lagi', () => {
    const now = Date.now();
    assert.equal(bucket.consume('user1', now), true);
    assert.equal(bucket.consume('user1', now + 31000), true);
  });
});

describe('AdaptiveTokenBucket adjust', () => {
  it('adjust dengan msg_received < 10 tidak mengubah params', () => {
    const bucket = new AdaptiveTokenBucket({ volume_per_day: 100, volume_per_hour: 20 });
    bucket.adjust({ msg_received: 5, msg_sent: 10, first_seen_at: Date.now() - 86400000 * 5 });
    assert.equal(bucket.maxPerDay, 100);
    assert.equal(bucket.maxPerHour, 20);
  });

  it('adjust dengan data cukup auto-tune maxPerDay', () => {
    const bucket = new AdaptiveTokenBucket({ volume_per_day: 100, volume_per_hour: 20 });
    const fiveDaysAgo = Date.now() - 86400000 * 5;
    // 50 msg / 5 days = 10/day → *1.2 = 12
    bucket.adjust({ msg_received: 50, msg_sent: 50, first_seen_at: fiveDaysAgo });
    assert.equal(bucket.maxPerDay, 12);
    assert.equal(bucket.maxPerHour, 1);
  });

  it('adjust cap maxPerDay at 500', () => {
    const bucket = new AdaptiveTokenBucket({ volume_per_day: 100, volume_per_hour: 20 });
    const longAgo = Date.now() - 86400000 * 100;
    bucket.adjust({ msg_received: 50000, msg_sent: 50000, first_seen_at: longAgo });
    assert.equal(bucket.maxPerDay, 500);
  });

  it('adjust cap maxPerHour at 50', () => {
    const bucket = new AdaptiveTokenBucket({ volume_per_day: 100, volume_per_hour: 20 });
    // 50000 msg / 100 days = 500/day → 500/12 = 41.666 → ceil=42
    const longAgo = Date.now() - 86400000 * 100;
    bucket.adjust({ msg_received: 50000, msg_sent: 50000, first_seen_at: longAgo });
    assert.equal(bucket.maxPerHour, 42);
  });

  it('adjust dengan first_seen 0 tetap hitung perDay (tidak division by zero)', () => {
    const bucket = new AdaptiveTokenBucket({ volume_per_day: 100, volume_per_hour: 20 });
    // days = max(1, (now - 0) / 86400000) = ~19900 → perDay = 50/19900 ≈ 0.0025
    // maxPerDay = ceil(0.0025 * 1.2) = 1
    bucket.adjust({ msg_received: 50, msg_sent: 50, first_seen_at: 0 });
    assert.equal(bucket.maxPerDay, 1);
  });
});
