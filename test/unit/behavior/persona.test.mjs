import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { OnlineKMeans } from '../../../src/behavior/persona.js';

describe('OnlineKMeans predict', () => {
  it('predict dengan centroids kosong return 1 (default normal)', () => {
    const m = new OnlineKMeans();
    assert.equal(m.predict([5, 10, 30, 14]), 1);
  });

  it('predict setelah partialFit menemukan cluster terdekat', () => {
    const m = new OnlineKMeans(3, 0, 4);
    m.centroids = [[1, 1, 1, 1], [10, 10, 10, 10], [100, 100, 100, 100]];
    m.counts = [1, 1, 1];
    m.total = 3;
    assert.equal(m.predict([1, 1, 1, 1]), 0);
    assert.equal(m.predict([10, 10, 10, 10]), 1);
    assert.equal(m.predict([100, 100, 100, 100]), 2);
  });

  it('predict dengan edge values (0, negative, large)', () => {
    const m = new OnlineKMeans(3, 0, 4);
    m.centroids = [[0, 0, 0, 0], [50, 50, 50, 50], [1e6, 1e6, 1e6, 1e6]];
    m.counts = [1, 1, 1];
    m.total = 3;
    assert.equal(m.predict([0, 0, 0, 0]), 0);
    assert.equal(m.predict([1e6, 1e6, 1e6, 1e6]), 2);
  });
});

describe('OnlineKMeans partialFit', () => {
  it('partialFit mengisi centroid saat baru', () => {
    const m = new OnlineKMeans(3, 0, 2);
    m.partialFit([1, 2]);
    assert.equal(m.centroids.length, 1);
    assert.deepEqual(m.centroids[0], [1, 2]);
    m.partialFit([3, 4]);
    assert.equal(m.centroids.length, 2);
    m.partialFit([5, 6]);
    assert.equal(m.centroids.length, 3);
  });

  it('partialFit decay menggeser centroid', () => {
    const m = new OnlineKMeans(3, 0.5, 2);
    m.centroids = [[10, 10], [20, 20], [30, 30]];
    m.counts = [5, 5, 5];
    m.total = 15;
    m.partialFit([10, 10]);
    const c0After = m.centroids[0];
    assert.ok(c0After[0] < 10 || c0After[0] > 10); // decay changed it
  });

  it('partialFit tidak crash dengan single feature', () => {
    const m = new OnlineKMeans(1, 0.1, 1);
    m.partialFit([42]);
    assert.equal(m.centroids.length, 1);
    assert.equal(m.centroids[0][0], 42);
  });
});

describe('OnlineKMeans getLabel', () => {
  it('getLabel mapping correct', () => {
    const m = new OnlineKMeans();
    assert.equal(m.getLabel(0), 'quick');
    assert.equal(m.getLabel(1), 'normal');
    assert.equal(m.getLabel(2), 'relaxed');
    assert.equal(m.getLabel(99), 'normal');
  });
});

describe('OnlineKMeans serialize / deserialize', () => {
  it('serialize menghasilkan JSON string', () => {
    const m = new OnlineKMeans(3, 0.1, 4);
    m.centroids = [[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12]];
    m.counts = [3, 5, 2];
    m.total = 10;
    const json = m.serialize();
    const d = JSON.parse(json);
    assert.deepEqual(d.centroids[0], [1, 2, 3, 4]);
    assert.equal(d.total, 10);
  });

  it('deserialize mengembalikan instance baru dengan state sama', () => {
    const m = new OnlineKMeans(3, 0.1, 4);
    m.partialFit([1, 1, 1, 1]);
    m.partialFit([10, 10, 10, 10]);
    m.partialFit([100, 100, 100, 100]);
    const json = m.serialize();
    const m2 = OnlineKMeans.deserialize(json);
    assert.equal(m2.k, 3);
    assert.equal(m2.centroids.length, 3);
    assert.equal(m2.total, 3);
    assert.equal(m2.predict([1, 1, 1, 1]), 0);
  });

  it('deserialize null/undefined return default', () => {
    const m = OnlineKMeans.deserialize(null);
    assert.equal(m.centroids.length, 0);
    assert.equal(m.total, 0);
    const m2 = OnlineKMeans.deserialize(undefined);
    assert.equal(m2.total, 0);
  });

  it('deserialize corrupted JSON tidak crash', () => {
    const m = OnlineKMeans.deserialize('not-json-at-all');
    assert.ok(m instanceof OnlineKMeans);
  });
});
