// ponytail: custom SQLite-backed auth state — replaces Baileys' useMultiFileAuthState
// Baileys docs: "DO NOT rely on useMultiFileAuthState in prod. It is very inefficient."
import crypto from 'crypto';
import { initAuthCreds } from '@whiskeysockets/baileys';
import db from './db.js';

// ponytail: minimal in-memory cache to avoid SQLite reads on every credential check
const cache = new Map();

export function useSQLiteAuthState(sessionId) {
    if (!cache.has(sessionId)) {
        loadFromDB(sessionId);
    }
    return cache.get(sessionId) || null;
}

function loadFromDB(sessionId) {
    const row = db.prepareGetAuthState.get(sessionId);
    if (!row) {
        // New session — create initial auth creds and persist
        const fresh = initAuthCreds();
        db.prepareUpsertAuthState.run(sessionId, JSON.stringify(fresh), JSON.stringify({}), Date.now());
        return cache.set(sessionId, { creds: fresh, keys: {} });
    }

    const state = {
        creds: tryParse(row.creds_data),
        keys: tryParse(row.keys_data),
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
        JSON.stringify(entry.creds),
        JSON.stringify(entry.keys || {}),
        Date.now()
    );
}

export function saveAuthKeys(sessionId, keys) {
    const entry = cache.get(sessionId) || { creds: null, keys: null };
    entry.keys = keys;
    cache.set(sessionId, entry);

    db.prepareUpsertAuthState.run(
        sessionId,
        JSON.stringify(entry.creds || {}),
        JSON.stringify(keys),
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
            // Persist to DB
            const entry = cache.get(sessionId);
            if (entry) {
                entry.keys = data;
                db.prepareUpsertAuthState.run(
                    sessionId,
                    JSON.stringify(entry.creds || {}),
                    JSON.stringify(data),
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
