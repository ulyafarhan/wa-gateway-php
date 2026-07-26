// ponytail: log-normal timing via Box-Muller — better human mimicry than uniform
const RANGES = {
    quick:   { read: [3, 10],  typing: [15, 40],  send: [20, 90] },
    normal:  { read: [5, 20],  typing: [20, 60],  send: [30, 180] },
    relaxed: { read: [15, 60], typing: [30, 90],  send: [60, 300] },
    business:{ read: [3, 15],  typing: [10, 40],  send: [15, 120] },
};

function logNormalSample(mean, sigma) {
    // Box-Muller → log-normal
    let u1 = 0, u2 = 0;
    while (u1 === 0) u1 = Math.random();
    while (u2 === 0) u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return Math.max(1, Math.exp(mean + sigma * z));
}

function sampleRange(min, max) {
    const mu = Math.log((min + max) / 2);
    const sigma = Math.log(max / min) / 3;
    return logNormalSample(mu, sigma);
}

export class AdaptiveTiming {
    constructor(alpha = 0.3) { this.alpha = alpha; }

    update(ema, sample) {
        return sample ? this.alpha * sample + (1 - this.alpha) * (ema || sample) : ema;
    }

    generate(persona, multiplier = 1.0) {
        const r = RANGES[persona] || RANGES.normal;
        return {
            readDelay:  Math.round(sampleRange(r.read[0] * 1000, r.read[1] * 1000) * multiplier),
            typingDelay: Math.round(sampleRange(r.typing[0] * 1000, r.typing[1] * 1000) * multiplier),
            sendDelay:  Math.round(sampleRange(r.send[0] * 1000, r.send[1] * 1000) * multiplier),
        };
    }
}
