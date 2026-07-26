// ponytail: Online K-Means — persona detection tanpa ML library, zero dependency
// k=3 cluster: quick(0), normal(1), relaxed(2)
// Features: [avgResponseTime, msgPerDay, replyLength, hourOfDay]

export class OnlineKMeans {
    constructor(k = 3, decay = 0.05, numFeatures = 4) {
        this.k = k;
        this.decay = decay;
        this.numFeatures = numFeatures;
        this.centroids = [];
        this.counts = [];
        this.total = 0;
    }

    predict(features) {
        if (this.centroids.length < this.k) return 1; // default normal
        let minD = Infinity, best = 1;
        for (let i = 0; i < this.centroids.length; i++) {
            const d = this._dist(features, this.centroids[i]);
            if (d < minD) { minD = d; best = i; }
        }
        return best;
    }

    partialFit(features) {
        this.total++;
        if (this.centroids.length < this.k) {
            this.centroids.push([...features]);
            this.counts.push(1);
            return;
        }
        const c = this.predict(features);
        const n = ++this.counts[c];
        const lr = 1 / Math.sqrt(n);
        for (let i = 0; i < features.length; i++) {
            this.centroids[c][i] *= (1 - this.decay);
            this.centroids[c][i] += lr * (features[i] - this.centroids[c][i]);
        }
    }

    getLabel(cluster) { return ['quick', 'normal', 'relaxed'][cluster] || 'normal'; }

    serialize() {
        return JSON.stringify({ centroids: this.centroids, counts: this.counts, total: this.total });
    }

    static deserialize(json) {
        const m = new OnlineKMeans();
        if (json) {
            try {
                const d = JSON.parse(json);
                m.centroids = d.centroids || [];
                m.counts = d.counts || [];
                m.total = d.total || 0;
            } catch {}
        }
        return m;
    }

    _dist(a, b) {
        let s = 0;
        for (let i = 0; i < Math.min(a.length, b.length); i++) s += (a[i] - b[i]) ** 2;
        return Math.sqrt(s);
    }
}
