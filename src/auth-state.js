// ponytail: custom SQLite-backed auth state — replaces Baileys' useMultiFileAuthState
// Baileys docs: "DO NOT rely on useMultiFileAuthState in prod. It is very inefficient."
import crypto from 'crypto';
import { initAuthCreds } from '@whiskeysockets/baileys';
import db from './db.js';

const cache = new Map();

const ENC_KEY_HEX = process.env.ENCRYPTION_KEY?.trim();
if (!ENC_KEY_HEX) {
    console.error('[auth-state] FATAL: ENCRYPTION_KEY not set in .env. Generate one: node -e "console.log(require(\"crypto\").randomBytes(32).toString(\"hex\"))"');
    process.exit(1);
}
if (!/^[0-9a-f]{64}$/i.test(ENC_KEY_HEX)) {
    console.error('[auth-state] FATAL: ENCRYPTION_KEY must be 64 hex characters (32 bytes). Got:', ENC_KEY_HEX.length, 'chars');
    process.exit(1);
}
const ENC_KEY = Buffer.from(ENC_KEY_HEX, 'hex');

function encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', ENC_KEY, iv);
    let enc = cipher.update(text, 'utf8', 'hex');
    enc += cipher.final('hex');
    return { iv: iv.toString('hex'), tag: cipher.getAuthTag().toString('hex'), data: enc };
}

function decrypt(enc) {
    const d = crypto.createDecipheriv('aes-256-gcm', ENC_KEY, Buffer.from(enc.iv, 'hex'));
    d.setAuthTag(Buffer.from(enc.tag, 'hex'));
    let text = d.update(enc.data, 'hex', 'utf8');
    text += d.final('utf8');
    return text;
}

function encryptJSON(obj) {
    return JSON.stringify(encrypt(JSON.stringify(obj)));
}

function decryptJSON(str) {
    if (!str) return null;
    try {
        const parsed = JSON.parse(str);
        if (parsed && typeof parsed === 'object' && parsed.iv && parsed.tag && parsed.data !== undefined) {
            return JSON.parse(decrypt(parsed), (k, v) => v?.type === 'Buffer' && Array.isArray(v?.data) ? Buffer.from(v.data) : v);
        }
        return JSON.parse(str, (k, v) => v?.type === 'Buffer' && Array.isArray(v?.data) ? Buffer.from(v.data) : v);
    } catch (e) {
        console.error(`[auth-state] decryptJSON failed for session. ENCRYPTION_KEY mismatch?`, e.message);
        return null;
    }
}

export function useSQLiteAuthState(sessionId) {
    if (!cache.has(sessionId)) {
        loadFromDB(sessionId);
    }
    return cache.get(sessionId) || null;
}

function loadFromDB(sessionId) {
    const row = db.prepareGetAuthState.get(sessionId);
    if (!row) {
        const fresh = initAuthCreds();
        db.prepareUpsertAuthState.run(sessionId, encryptJSON(fresh), encryptJSON({}), Date.now());
        return cache.set(sessionId, { creds: fresh, keys: {} });
    }

    const state = {
        creds: decryptJSON(row.creds_data),
        keys: decryptJSON(row.keys_data),
    };
    cache.set(sessionId, state);
}

export function saveAuthCreds(sessionId, creds) {
    const entry = cache.get(sessionId);
    if (!entry) return;
    Object.assign(entry.creds, creds);
    cache.set(sessionId, entry);

    db.prepareUpsertAuthState.run(
        sessionId,
        encryptJSON(entry.creds),
        encryptJSON(entry.keys || {}),
        Date.now()
    );
}

export function saveAuthKeys(sessionId, keys) {
    const entry = cache.get(sessionId) || { creds: null, keys: null };
    entry.keys = keys;
    cache.set(sessionId, entry);

    db.prepareUpsertAuthState.run(
        sessionId,
        encryptJSON(entry.creds || {}),
        encryptJSON(keys),
        Date.now()
    );
}

export function deleteAuthState(sessionId) {
    cache.delete(sessionId);
    db.prepareDeleteAuthState.run(sessionId);
}

export function getAuthStateForBaileys(sessionId) {
    const entry = useSQLiteAuthState(sessionId);
    if (!entry || !entry.creds) {
        const fresh = initAuthCreds();
        return {
            state: {
                creds: fresh,
                keys: makeKeyStore(sessionId, {}),
                saveCreds: (creds) => saveAuthCreds(sessionId, creds),
            },
            saveCreds: (creds) => saveAuthCreds(sessionId, creds),
        };
    }

    const state = {
        creds: entry.creds,
        keys: makeKeyStore(sessionId, entry.keys || {}),
        saveCreds: (creds) => saveAuthCreds(sessionId, creds),
    };

    function saveCreds(creds) {
        saveAuthCreds(sessionId, creds);
    }

    return { state, saveCreds };
}

function makeKeyStore(sessionId, data) {
    return {
        get: async (type, ids) => {
            const bucket = data[type] || {};
            const result = {};
            for (const id of ids) {
                if (bucket[id]) result[id] = bucket[id];
            }
            return result;
        },
        set: async (entries) => {
            for (const [type, items] of Object.entries(entries)) {
                if (!data[type]) data[type] = {};
                Object.assign(data[type], items);
            }
            const entry = cache.get(sessionId);
            if (entry) {
                entry.keys = data;
                db.prepareUpsertAuthState.run(
                    sessionId,
                    encryptJSON(entry.creds || {}),
                    encryptJSON(data),
                    Date.now()
                );
            }
        },
    };
}

function tryParse(str) {
    if (!str) return null;
    try { return JSON.parse(str, (k, v) => v?.type === 'Buffer' && Array.isArray(v?.data) ? Buffer.from(v.data) : v); } catch { return null; }
}
