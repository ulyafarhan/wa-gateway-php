// ponytail: Content engine — conversational context → FAQ → Template → AI → Fallback
import db from '../db.js';
import { callAI } from './ai.js';

function buildConversation(sessionId, sender, limit = 6) {
  const msgs = db.prepare(`SELECT chat_id as user_id, payload, status, created_at FROM messages WHERE session_id = ? AND chat_id = ? ORDER BY created_at DESC LIMIT ?`).all(sessionId, sender, limit);
  return msgs.reverse().map(r => ({
    role: r.status === 'received' ? 'user' : 'assistant',
    content: (() => { try { return JSON.parse(r.payload)?.text || r.payload; } catch { return r.payload; } })(),
  }));
}

export async function getContent(userMessage, context, cfg) {
    // Build conversation context from SQLite history
    const conversation = buildConversation(cfg.session_id || context.sessionId, context.userName);
    conversation.push({ role: 'user', content: userMessage });

    // 1. FAQ
    if (cfg.faq_enabled && context.faqs?.length) {
        const match = faqMatch(userMessage, context.faqs);
        if (match) return { text: match.answer, source: 'faq', faqId: match.id };
    }

    // 2. Template
    if (cfg.template_enabled && context.templates?.length) {
        const intent = detectIntent(userMessage);
        const tpls = context.templates.filter(t => t.intent === intent);
        if (tpls.length) {
            const tList = tryParse(tpls[0].templates) || [tpls[0].templates];
            const prev = context.recentHashes || [];
            for (const t of tList) {
                if (!prev.some(h => simpleHash(t) === h)) {
                    return { text: applyContext(t, context), source: 'template', intent };
                }
            }
            return { text: applyContext(tList[0], context), source: 'template', intent };
        }
    }

    // 3. AI with conversation context
    if (cfg.ai_enabled && cfg.ai_api_key) {
        const aiText = await callAI(userMessage, { ...context, conversation }, cfg);
        if (aiText) return { text: aiText, source: 'ai', provider: cfg.ai_provider, model: cfg.ai_model };
    }

    // 4. Fallback
    const fb = ['Terima kasih, pesan Anda sudah kami terima.', 'Baik, kami catat pesan Anda.', 'Pesan Anda diterima, akan segera ditindaklanjuti.'];
    return { text: fb[Math.floor(Math.random() * fb.length)], source: 'fallback' };
}

export function faqMatch(msg, faqs) {
    const n = msg.toLowerCase().trim();
    for (const f of faqs) {
        const kw = tryParse(f.keywords) || [];
        if (kw.length && kw.some(k => n.includes(k.toLowerCase()))) return f;
        if (f.question && sim(n, f.question.toLowerCase()) > 0.75) return f;
    }
    return null;
}

export function detectIntent(msg) {
    const n = msg.toLowerCase();
    const intents = [
        [['halo','hai','pagi','siang','malam','hi','helo'], 'greeting'],
        [['siapa','apa itu','jelaskan','info','definisi'], 'information'],
        [['tolong','bantu','mohon','butuh','minta'], 'help'],
        [['kapan','berapa','dimana','bagaimana','kenapa','mengapa'], 'question'],
        [['terima kasih','makasih','thanks','thank','trims'], 'thanks'],
        [['selesai','sudah','oke','ok','baik','iya','ya'], 'acknowledge'],
    ];
    for (const [kw, intent] of intents) if (kw.some(k => n.includes(k))) return intent;
    return 'unknown';
}

function applyContext(tpl, ctx) {
    return tpl.replace(/{name}/g, ctx.userName || '')
              .replace(/{persona}/g, ctx.persona || '');
}

export function sim(a, b) {
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

export function simpleHash(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i), h |= 0;
    return Math.abs(h).toString(16);
}

function tryParse(s) { try { return JSON.parse(s); } catch { return s; } }
