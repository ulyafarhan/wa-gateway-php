// ponytail: Behavior Engine orchestrator — pipeline incoming → response
import crypto from 'crypto';
import db from '../db.js';
import { OnlineKMeans } from './persona.js';
import { AdaptiveTiming } from './timing.js';
import { AdaptiveTokenBucket } from './volume.js';
import { SafetyEngine, DiversityEngine, varyContent } from './anti-ban.js';
import { getContent, detectIntent, simpleHash } from './content.js';

const timingEngine = new AdaptiveTiming();
const safetyEngine = new SafetyEngine({});
const diversityEngine = new DiversityEngine();
const buckets = new Map();
const models = new Map();
let sessionsRef = null;

export function init(sessionsMap) { sessionsRef = sessionsMap; }

function getModel(sessionId) {
    if (!models.has(sessionId)) {
        const row = db.prepareGetBehaviorConfig.get(sessionId);
        models.set(sessionId, OnlineKMeans.deserialize(row?.model_state || null));
    }
    return models.get(sessionId);
}

function getBucket(sessionId) {
    if (!buckets.has(sessionId)) {
        const row = db.prepareGetBehaviorConfig.get(sessionId) || {};
        buckets.set(sessionId, new AdaptiveTokenBucket(row));
    }
    return buckets.get(sessionId);
}

function ensureBehaviorConfig(sessionId) {
    let row = db.prepareGetBehaviorConfig.get(sessionId);
    if (!row) {
        const now = Date.now();
        db.prepareUpsertBehaviorConfig.run(sessionId, 'auto', 0, 'openai', null, null, 'gpt-4o-mini', null, 0.7, 500, 1, 1, 3, 20, 100, 30000, 22, 7, 'Asia/Jakarta', 1.0, 0.1, 0.05, null, sessionId, now, now);
        models.delete(sessionId);
        buckets.delete(sessionId);
        row = db.prepareGetBehaviorConfig.get(sessionId);
    }
    return row;
}

function getUserProfile(sessionId, userId) {
    let p = db.prepareGetUserProfile.get(userId, sessionId);
    if (!p) {
        const now = Date.now();
        db.prepareUpsertUserProfile.run(userId, sessionId, 'unknown', 0, 0, 0, 0, now, now, '[]', userId, sessionId, now, now);
        p = db.prepareGetUserProfile.get(userId, sessionId);
    }
    return p;
}

// ── Extracted pipeline helpers ───────────────────────────────────────────

function loadContext(sessionId, sender) {
    const cfg = ensureBehaviorConfig(sessionId);
    const model = getModel(sessionId);
    const bucket = getBucket(sessionId);
    const profile = getUserProfile(sessionId, sender);
    const now = Date.now();
    if (!profile?.first_seen_at) return null;
    return {
        sessionId, sender, cfg, model, bucket, profile, now,
        days: Math.max(1, (now - profile.first_seen_at) / 86400000),
    };
}

function storeIncoming(sessionId, sender, text) {
    db.prepareInsertReceived.run(crypto.randomUUID(), sessionId, sender, 'text', JSON.stringify({ text }), Date.now());
}

function detectPersona(ctx, text) {
    const { profile, model, days, now, sender, sessionId } = ctx;
    const features = [profile.avg_response_time || 0, (profile.msg_received || 0) / days, text.length, new Date(now).getHours()];
    ctx.features = features;
    ctx.persona = profile.persona || 'normal';
    if ((profile.msg_received || 0) > 3) {
        model.partialFit(features);
        const cluster = model.predict(features);
        const persona = model.getLabel(cluster);
        const cf = Math.min(1, 1 - 1 / Math.sqrt(Math.max(1, model.counts[cluster] || 1)));
        db.prepareUpdateUserPersona.run(sender, sessionId, persona, cf, JSON.stringify(features), sender, sessionId, now, now);
        db.prepareUpdateBehaviorModel.run(model.serialize(), now, sessionId);
    }
}

function volumeControl(ctx, sender) {
    ctx.bucket.adjust(ctx.profile);
    return ctx.bucket.consume(sender, ctx.now);
}

function safetyCheck(ctx, sender) {
    safetyEngine.cfg = ctx.cfg;
    if (safetyEngine.check(ctx.now).blocked) return false;
    if (safetyEngine.checkBurst(sender, ctx.now).blocked) return false;
    return true;
}

async function generateContent(ctx, text) {
    const { sessionId, sender, cfg, persona } = ctx;
    const faqs = db.prepareGetFaqsBySession.all(sessionId);
    const templates = db.prepareGetTemplatesBySession.all(sessionId);
    const recentOutbox = db.prepareGetRecentOutbox.all(sessionId, sender);
    const recentHashes = recentOutbox.map(r => r.content_hash);
    const content = await getContent(text, { sessionId, persona, faqs, templates, recentHashes, userName: sender }, cfg);
    if (!content?.text) return null;
    ctx.content = content;
    let reply = content.text;
    if (!diversityEngine.isDiverse(sender, reply)) reply = varyContent(reply);
    return reply;
}

function humanizeTiming(persona, multiplier) {
    return timingEngine.generate(persona, multiplier);
}

async function simulateHumanBehavior(sock, sender, timing) {
    const jid = sender.includes('@') ? sender : `${sender}@s.whatsapp.net`;
    if (timing.readDelay > 0) await sleep(timing.readDelay);
    try { sock.sendPresenceUpdate('available'); } catch {}
    if (timing.typingDelay > 0) await sleep(timing.typingDelay);
    try { sock.sendPresenceUpdate('composing', jid); } catch {}
    if (timing.sendDelay > 0) await sleep(timing.sendDelay);
}

async function sendReply(sock, sender, reply, ctx, timing) {
    const { sessionId, cfg, features, persona, content, now, profile } = ctx;
    const jid = sender.includes('@') ? sender : `${sender}@s.whatsapp.net`;
    const messageId = crypto.randomUUID();
    db.prepareInsertMessage.run(messageId, sessionId, sender, 'text', JSON.stringify({ text: reply }), now);

    try {
        await sock.sendMessage(jid, { text: reply });
        db.prepareUpdateMessageStatus.run('sent', 'sent', null, now, messageId);
        db.prepareIncrementMsgSent.run(now, sessionId);
        db.prepareIncrementMsgSentUser.run(now, sender, sessionId);
    } catch (e) {
        db.prepareUpdateMessageStatus.run('failed', null, e.message, null, messageId);
        return;
    }

    diversityEngine.record(sender, reply);
    db.prepareInsertBehaviorOutbox.run(crypto.randomUUID(), sessionId, sender, simpleHash(reply), reply.slice(0, 100), content.source, cfg.ai_provider, cfg.ai_model, persona, timing.readDelay + timing.typingDelay + timing.sendDelay, now);
    db.prepareIncrementMsgReceived.run(now, timingEngine.update(profile.avg_response_time, profile.last_reply_at ? now - profile.last_reply_at : 0), JSON.stringify(features), now, sender, sessionId);
}

// ── Main pipeline ────────────────────────────────────────────────────────
export async function processIncomingMessage(sessionId, sender, rawText, sock) {
    const text = rawText?.trim();
    if (!text || !sender) return;
    const ctx = loadContext(sessionId, sender);
    if (!ctx) return;
    storeIncoming(sessionId, sender, text);
    detectPersona(ctx, text);
    if (!volumeControl(ctx, sender)) return;
    if (!safetyCheck(ctx, sender)) return;
    const reply = await generateContent(ctx, text);
    if (reply) {
        const timing = humanizeTiming(ctx.persona, ctx.cfg.timing_multiplier || 1.0);
        await simulateHumanBehavior(sock, sender, timing);
        await sendReply(sock, sender, reply, ctx, timing);
    }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
