// ponytail: Adaptive Token Bucket — per-user rate limiting, auto-tune from usage
export class AdaptiveTokenBucket {
    constructor(cfg = {}) {
        this.maxPerMinute = cfg.volume_per_minute || 3;
        this.maxPerHour = cfg.volume_per_hour || 20;
        this.maxPerDay = cfg.volume_per_day || 100;
        this.cooldownMs = cfg.cooldown_ms || 30000;
        this.tokens = new Map();
    }

    consume(userId, now = Date.now()) {
        // ponytail: trim hanya untuk cooldown (c_), bukan counter (m_/h_/d_)
        const cutoff = now - 86400000 * 2;
        for (const [k, v] of this.tokens) if (k.startsWith('c_') && v < cutoff) this.tokens.delete(k);

        const kMin = `m_${userId}`, kHr = `h_${userId}`, kDay = `d_${userId}`, kCd = `c_${userId}`;
        const cd = this.tokens.get(kCd) || 0;
        if (now - cd < this.cooldownMs) return false;

        if ((this.tokens.get(kMin) || 0) >= this.maxPerMinute) return false;
        if ((this.tokens.get(kHr) || 0) >= this.maxPerHour) return false;
        if ((this.tokens.get(kDay) || 0) >= this.maxPerDay) return false;

        this.tokens.set(kMin, (this.tokens.get(kMin) || 0) + 1);
        this.tokens.set(kHr, (this.tokens.get(kHr) || 0) + 1);
        this.tokens.set(kDay, (this.tokens.get(kDay) || 0) + 1);
        this.tokens.set(kCd, now);

        // Sliding window reset: after 1 min, reset minutely counter
        setTimeout(() => this.tokens.set(kMin, Math.max(0, (this.tokens.get(kMin) || 0) - 1)), 60000).unref();
        setTimeout(() => this.tokens.set(kHr, Math.max(0, (this.tokens.get(kHr) || 0) - 1)), 3600000).unref();
        return true;
    }

    adjust(profile) {
        if (profile.msg_received < 10) return;
        const days = Math.max(1, (Date.now() - profile.first_seen_at) / 86400000);
        const perDay = profile.msg_sent / days;
        this.maxPerDay = Math.min(500, Math.ceil(perDay * 1.2));
        this.maxPerHour = Math.min(50, Math.ceil(perDay / 12));
    }
}
