// ponytail: Safety checks — quiet hours, anti-burst, anti-repetition, diversity
export class SafetyEngine {
    constructor(cfg) { this.cfg = cfg; this.burstCount = new Map(); }

    check(now = Date.now()) {
        const start = this.cfg.quiet_hours_start ?? 22;
        const end = this.cfg.quiet_hours_end ?? 7;
        const h = new Date(now).getHours();
        if (start <= end ? (h >= start && h <= end) : (h >= start || h <= end)) {
            // Quiet hours — schedule for next allowed time
            const next = new Date(now);
            next.setHours(end, 0, 0, 0);
            if (next <= now) next.setDate(next.getDate() + 1);
            return { blocked: true, reason: 'quiet_hours', until: next.getTime() };
        }
        return { blocked: false };
    }

    checkBurst(userId, now = Date.now()) {
        const count = this.burstCount.get(userId) || 0;
        if (count >= 3) return { blocked: true, reason: 'burst_limit' };
        this.burstCount.set(userId, count + 1);
        setTimeout(() => {
            const c = this.burstCount.get(userId) || 1;
            if (c <= 1) this.burstCount.delete(userId);
            else this.burstCount.set(userId, c - 1);
        }, 30000);
        return { blocked: false };
    }
}

export class DiversityEngine {
    constructor(threshold = 0.7) {
        this.threshold = threshold;
        this.history = new Map();
    }

    isDiverse(userId, text) {
        const hash = this._hash(text.toLowerCase().trim());
        const h = this.history.get(userId) || [];
        if (h.some(x => x === hash)) return false;
        for (const x of h) if (this._sim(hash.slice(0, 12), x.slice(0, 12)) > this.threshold) return false;
        return true;
    }

    record(userId, text) {
        const hash = this._hash(text.toLowerCase().trim());
        const h = this.history.get(userId) || [];
        h.push(hash);
        if (h.length > 3) h.shift();
        this.history.set(userId, h);
    }

    _hash(s) {
        let h = 0;
        for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i), h |= 0;
        return Math.abs(h).toString(16);
    }

    _sim(a, b) {
        if (!a && !b) return 1;
        if (!a || !b) return 0;
        const m = a.length, n = b.length;
        const d = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
        for (let i = 0; i <= m; i++) d[i][0] = i;
        for (let j = 0; j <= n; j++) d[0][j] = j;
        for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++)
            d[i][j] = Math.min(d[i-1][j] + 1, d[i][j-1] + 1, d[i-1][j-1] + (a[i-1] !== b[j-1] ? 1 : 0));
        return 1 - d[m][n] / Math.max(m, n);
    }
}

export function varyContent(text) {
    const suffixes = ['', ' 😊', ' ✅', ' baik', ' ya', ' kak', ' silakan'];
    if (Math.random() > 0.6) text += suffixes[Math.floor(Math.random() * suffixes.length)];
    if (Math.random() > 0.9) text = text.charAt(0).toLowerCase() + text.slice(1);
    return text;
}
