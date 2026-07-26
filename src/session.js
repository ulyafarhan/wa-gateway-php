// ponytail: session manager — Baileys socket per session, SQLite auth state, state machine
import { makeWASocket, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { SocksProxyAgent } from 'socks-proxy-agent';
import pino from 'pino';
import crypto from 'crypto';
import db from './db.js';
import { getAuthStateForBaileys, deleteAuthState } from './auth-state.js';
import { enqueueWebhook } from './webhook.js';
import { init as initBehavior, processIncomingMessage } from './behavior/index.js';

const proxyUrl = process.env.SOCKS5_PROXY;
const agent = proxyUrl ? new SocksProxyAgent(proxyUrl) : undefined;
const logger = pino({ level: process.env.LOG_LEVEL || 'silent' });
const RATE_LIMIT_MS = parseInt(process.env.RATE_LIMIT_MS || '1500', 10);
const MAX_BACKOFF_MS = 300000; // 5 min max backoff

// Session state machine: disconnected → connecting → connected | waiting_qr → loggedOut → reconnecting → connecting
const sessions = new Map();
initBehavior(sessions);

function getOrCreateSession(sessionId) {
    if (!sessions.has(sessionId)) {
        sessions.set(sessionId, {
            sock: null,
            qr: null,
            status: 'disconnected',
            queue: [],
            processing: false,
            backoff: 1000,
            reconnectCount: 0,
            lastReconnectAt: null,
        });
        db.prepareUpsertSession.run(sessionId, 'disconnected', Date.now(), Date.now());
    }
    return sessions.get(sessionId);
}

async function connectSession(sessionId) {
    const session = getOrCreateSession(sessionId);

    if (session.status === 'connected' || session.status === 'connecting') {
        logger.info(`[${sessionId}] Already ${session.status}, skipping`);
        return;
    }

    session.status = 'connecting';
    db.prepareUpdateSessionStatus.run('connecting', Date.now(), sessionId);
    enqueueWebhook(sessionId, 'session.connecting', { reconnectCount: session.reconnectCount });

    try {
        const auth = getAuthStateForBaileys(sessionId);

        const { version } = await fetchLatestBaileysVersion();

        session.sock = makeWASocket({
            version,
            auth: auth.state,
            logger,
            browser: [`SIG-${sessionId}`, 'Chrome', '1.0.0'],
            agent,
            connectTimeout: 30000,
            keepAliveInterval: 25000,
        });

        // ponytail: save creds on every update
        session.sock.ev.on('creds.update', (creds) => {
            if (auth?.saveCreds) auth.saveCreds(creds);
        });

        // Listen for delivery status updates
        session.sock.ev.on('messages.update', (updates) => {
            for (const u of updates) {
                if (u.update.status && u.key?.id) {
                    const status = u.update.status; // sent, delivered, read, played
                    db.prepareUpdateMessageStatus.run('delivered', status, null, Date.now(), u.key.id);
                    enqueueWebhook(sessionId, 'message.status', { message_id: u.key.id, status });
                }
            }
        });

        // Listen for incoming messages (forward to client webhook)
        session.sock.ev.on('messages.upsert', (upsert) => {
            if (upsert.type === 'notify') {
                for (const msg of upsert.messages) {
                    if (!msg.key.fromMe && msg.message) {
                        const sender = msg.key.remoteJid;
                        let text = '';
                        if (msg.message.conversation) text = msg.message.conversation;
                        else if (msg.message.extendedTextMessage?.text) text = msg.message.extendedTextMessage.text;

                        enqueueWebhook(sessionId, 'message.incoming', {
                            sender,
                            text,
                            timestamp: msg.messageTimestamp,
                            wa_message_id: msg.key.id,
                        });

                        // Behavior engine: auto-reply with human-like timing
                        processIncomingMessage(sessionId, sender, text, session.sock).catch(e => {
                            logger.error(`[${sessionId}] Behavior pipeline error: ${e.message}`);
                        });
                    }
                }
            }
        });

        session.sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                session.qr = qr;
                session.status = 'waiting_qr';
                db.prepareUpdateSessionStatus.run('waiting_qr', Date.now(), sessionId);
                enqueueWebhook(sessionId, 'session.qr_received', {});
                logger.info(`[${sessionId}] QR received`);
            }

            if (connection === 'close') {
                const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
                const errMsg = lastDisconnect?.error?.message || '';
                const errorContent = lastDisconnect?.error?.data?.content;
                const isDeviceRemoved = errorContent?.some?.(c => c.attrs?.type === 'device_removed');

                session.status = 'disconnected';
                db.prepareUpdateSessionStatus.run('disconnected', Date.now(), sessionId);
                enqueueWebhook(sessionId, 'session.disconnected', { reason, device_removed: isDeviceRemoved, error: errMsg.slice(0, 200) });

                // ponytail: anti-ban — detect blocked/restricted from WA error message
                const isBlocked = /blocked|restricted|violation|spam/i.test(errMsg);
                if (isBlocked) {
                    logger.error(`[${sessionId}] ⛔ WA BLOCKED/RESTRICTED: ${errMsg.slice(0, 200)}`);
                    enqueueWebhook(sessionId, 'session.blocked', { error: errMsg });
                    deleteAuthState(sessionId);
                    return; // stop reconnecting — user must re-scan
                }

                if (reason === DisconnectReason.loggedOut && !isDeviceRemoved) {
                    logger.warn(`[${sessionId}] Logged out, deleting auth state`);
                    deleteAuthState(sessionId);
                    enqueueWebhook(sessionId, 'session.logged_out', {});
                } else if (isDeviceRemoved) {
                    logger.warn(`[${sessionId}] Device removed (conflict), deleting auth state and reconnecting`);
                    deleteAuthState(sessionId);
                    reconnect(sessionId);
                } else if (reason === DisconnectReason.restartRequired) {
                    logger.info(`[${sessionId}] Restart required, reconnecting immediately`);
                    reconnect(sessionId);
                } else if (session.reconnectCount > 50) {
                    // ponytail: excessive reconnects (>50) = likely banned, stop
                    logger.error(`[${sessionId}] Excessive reconnects (${session.reconnectCount}), likely banned`);
                    enqueueWebhook(sessionId, 'session.banned_suspected', { reconnectCount: session.reconnectCount });
                    deleteAuthState(sessionId);
                } else {
                    reconnect(sessionId);
                }
            }

            if (connection === 'open') {
                session.status = 'connected';
                session.qr = null;
                session.backoff = 1000;
                session.reconnectCount = 0;
                db.prepareUpdateSessionStatus.run('connected', Date.now(), sessionId);
                enqueueWebhook(sessionId, 'session.connected', {});
                logger.info(`[${sessionId}] Connected`);
                processQueue(sessionId);
            }
        });

        session.sock.ev.on('connection.update', () => {});

    } catch (err) {
        logger.error(`[${sessionId}] Connect failed: ${err.message}`);
        session.status = 'disconnected';
        db.prepareUpdateSessionStatus.run('disconnected', Date.now(), sessionId);
        enqueueWebhook(sessionId, 'session.error', { error: err.message });
        reconnect(sessionId);
    }
}

// ponytail: exponential backoff reconnect — 1s → 2s → 4s → 8s → 16s → 30s (cap)
function reconnect(sessionId) {
    const session = sessions.get(sessionId);
    if (!session) return;

    session.reconnectCount++;
    db.prepareIncrementReconnect.run(Date.now(), Date.now(), sessionId);

    const delay = session.backoff;
    session.backoff = Math.min(session.backoff * 2, MAX_BACKOFF_MS);
    session.status = 'reconnecting';
    db.prepareUpdateSessionStatus.run('reconnecting', Date.now(), sessionId);

    logger.warn(`[${sessionId}] Reconnecting in ${delay}ms (attempt ${session.reconnectCount})`);
    enqueueWebhook(sessionId, 'session.reconnecting', { delay, attempt: session.reconnectCount });

    setTimeout(() => connectSession(sessionId), delay);
}

// Ponytail: priority queue — high > normal > low
function dequeueByPriority(queue) {
    // Sort: high first, then normal, then low
    const priority = { high: 0, normal: 1, low: 2 };
    queue.sort((a, b) => (priority[a.priority] || 1) - (priority[b.priority] || 1));
    return queue.shift();
}

async function processQueue(sessionId) {
    const session = sessions.get(sessionId);
    if (!session || session.processing || session.status !== 'connected') return;

    session.processing = true;

    while (session.queue.length > 0 && session.status === 'connected') {
        const msg = dequeueByPriority(session.queue);
        try {
            const jid = msg.chatId.includes('@') ? msg.chatId : `${msg.chatId}@s.whatsapp.net`;
            let result;

            if (msg.type === 'image') {
                result = await session.sock.sendMessage(jid, {
                    image: { url: msg.imageUrl },
                    caption: msg.caption || '',
                });
            } else if (msg.type === 'audio') {
                result = await session.sock.sendMessage(jid, {
                    audio: { url: msg.audioUrl },
                    mimetype: msg.mimetype || 'audio/mp4',
                });
            } else if (msg.type === 'document') {
                result = await session.sock.sendMessage(jid, {
                    document: { url: msg.documentUrl },
                    fileName: msg.fileName || 'file',
                    mimetype: msg.mimetype || 'application/pdf',
                });
            } else {
                result = await session.sock.sendMessage(jid, { text: msg.text });
            }

            db.prepareUpdateMessageStatus.run('sent', 'sent', null, Date.now(), msg.messageId);
            db.prepareIncrementMsgSent.run(Date.now(), sessionId);
            enqueueWebhook(sessionId, 'message.sent', { message_id: msg.messageId, chat_id: msg.chatId });
            logger.info(`[${sessionId}] Sent: ${msg.messageId}`);
        } catch (e) {
            logger.error(`[${sessionId}] Send failed: ${e.message}`);
            db.prepareUpdateMessageStatus.run('failed', null, e.message, null, msg.messageId);
            db.prepareIncrementMsgFailed.run(Date.now(), sessionId);
            enqueueWebhook(sessionId, 'message.failed', { message_id: msg.messageId, error: e.message });
        }

        // Rate limit delay
        await new Promise(r => setTimeout(r, RATE_LIMIT_MS));
    }

    session.processing = false;
}

export function enqueueMessage(sessionId, { chatId, type, text, imageUrl, caption, priority }) {
    const session = getOrCreateSession(sessionId);
    const messageId = crypto.randomUUID();
    const payload = JSON.stringify({ chatId, type, text, imageUrl, caption });

    db.prepareInsertMessage.run(messageId, sessionId, chatId, type, payload, Date.now());
    session.queue.push({ chatId, type, text, imageUrl, caption, messageId, priority: priority || 'normal' });

    if (session.status === 'connected' && !session.processing) {
        processQueue(sessionId);
    }

    return messageId;
}

export function getSessionStatus(sessionId) {
    const session = sessions.get(sessionId);
    if (!session) return { status: 'not_found', qr: null };

    const dbSession = db.prepare('SELECT * FROM sessions WHERE session_id = ?').get(sessionId);

    return {
        status: session.status,
        qr: session.qr,
        reconnect_count: dbSession?.reconnect_count || 0,
        msg_sent: dbSession?.msg_sent || 0,
        msg_failed: dbSession?.msg_failed || 0,
    };
}

export function deleteSession(sessionId) {
    const session = sessions.get(sessionId);
    if (session?.sock) { try { session.sock.end(); } catch (_) {} }
    sessions.delete(sessionId);
    deleteAuthState(sessionId);
    db.prepareDeleteSession.run(sessionId);
    enqueueWebhook(sessionId, 'session.deleted', {});
}

export function setWebhook(sessionId, url, secret) {
    db.prepareUpdateSessionWebhook.run(url || null, secret || null, Date.now(), sessionId);
}

export { sessions, connectSession };
