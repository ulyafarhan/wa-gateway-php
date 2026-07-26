// ponytail: outbound webhook — P5 exponential backoff + dead letter + ordered delivery
import crypto from 'crypto';
import db from './db.js';

const WEBHOOK_URL = process.env.WEBHOOK_URL || '';

// P5: Exponential backoff — 5s → 15s → 1m → 5m → 15m → 30m → 1h → 2h → 4h → 8h
const BACKOFF_INTERVALS = [5, 15, 60, 300, 900, 1800, 3600, 7200, 14400, 28800]; // seconds
const MAX_ATTEMPTS = BACKOFF_INTERVALS.length;
const DEAD_LETTER_AFTER_MS = 86400000; // 24h

// Sequence numbers per session for ordered delivery
const sequenceNumbers = new Map();

export function getWebhookUrl(sessionId) {
    const row = db.prepare('SELECT webhook_url, webhook_secret FROM sessions WHERE session_id = ?').get(sessionId);
    if (row?.webhook_url) return { url: row.webhook_url, secret: row.webhook_secret || '' };
    if (WEBHOOK_URL) return { url: WEBHOOK_URL, secret: '' };
    return null;
}

export function enqueueWebhook(sessionId, event, payload) {
    const wh = getWebhookUrl(sessionId);
    if (!wh) return;

    const id = crypto.randomUUID();
    // Increment sequence number per session
    const seq = (sequenceNumbers.get(sessionId) || 0) + 1;
    sequenceNumbers.set(sessionId, seq);

    const data = JSON.stringify({ event, session_id: sessionId, sequence: seq, ...payload, timestamp: Date.now() });
    db.prepareInsertWebhook.run(id, sessionId, event, data, Date.now());
    deliver(id, wh, data, sessionId);
}

export async function deliver(id, wh, data, sessionId) {
    try {
        const headers = { 'Content-Type': 'application/json' };
        if (wh.secret) headers['X-Webhook-Secret'] = wh.secret;

        const res = await fetch(wh.url, {
            method: 'POST',
            headers,
            body: data,
            signal: AbortSignal.timeout(10000),
        });

        if (res.ok) {
            db.prepareUpdateWebhookStatus.run('delivered', id);
        } else {
            db.prepareUpdateWebhookStatus.run('failed', id);
        }
    } catch {
        db.prepareUpdateWebhookStatus.run('failed', id);
    }
}

// P5: Exponential backoff retry processor
export function startWebhookProcessor() {
    setInterval(() => {
        const pending = db.prepareGetPendingWebhooks.all();
        const now = Date.now();

        for (const wh of pending) {
            if (wh.retry_count >= MAX_ATTEMPTS) {
                // P5: Move to dead letter after max attempts
                db.prepareInsertDeadLetter.run(
                    crypto.randomUUID(), wh.session_id, wh.event, wh.payload,
                    `Max retries (${MAX_ATTEMPTS}) exceeded`, wh.created_at, now
                );
                db.prepareUpdateWebhookStatus.run('dead_letter', wh.id);
                continue;
            }

            // P5: Check if enough time has passed based on backoff interval
            const backoffSeconds = BACKOFF_INTERVALS[wh.retry_count] || BACKOFF_INTERVALS[BACKOFF_INTERVALS.length - 1];
            const nextAttemptAt = wh.created_at + (backoffSeconds * 1000);
            if (now < nextAttemptAt) continue;

            const whConfig = getWebhookUrl(wh.session_id);
            if (whConfig) {
                deliver(wh.id, whConfig, wh.payload, wh.session_id);
            } else {
                db.prepareUpdateWebhookStatus.run('no_config', wh.id);
            }
        }

        // P5: Move old pending webhooks to dead letter (24h)
        const stale = db.prepare(`SELECT id FROM webhook_outbox WHERE status = 'pending' AND created_at < ?`).all(now - DEAD_LETTER_AFTER_MS);
        for (const row of stale) {
            const wh = db.prepare('SELECT * FROM webhook_outbox WHERE id = ?').get(row.id);
            if (wh) {
                db.prepareInsertDeadLetter.run(
                    crypto.randomUUID(), wh.session_id, wh.event, wh.payload,
                    'Expired (24h timeout)', wh.created_at, now
                );
                db.prepareUpdateWebhookStatus.run('dead_letter', wh.id);
            }
        }

        // Cleanup delivered/failed webhooks older than 24h (except dead_letter)
        db.prepareCleanupOldWebhooks.run(now - DEAD_LETTER_AFTER_MS);
    }, 10000); // Check every 10 seconds (was 30s — faster retry for exponential backoff)
}
