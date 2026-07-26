// ponytail: wa-gateway Node.js SDK — simple, lazy integration
// Usage:
//   import WaGateway from 'wa-gateway-sdk';
//   const client = new WaGateway({ apiKey: 'sk_live_xxx', baseUrl: 'https://wa.gampong.web.id' });
//   await client.sendText('session-1', '6281234567890', 'Hello!');

class WaGateway {
    constructor({ apiKey, baseUrl = 'http://localhost:2785', timeout = 30000 }) {
        if (!apiKey) throw new Error('apiKey required');
        this.apiKey = apiKey;
        this.baseUrl = baseUrl.replace(/\/$/, '');
        this.timeout = timeout;
        this._handlers = new Map();
    }

    // ── Internal: HTTP request ────────────────────────────────────────
    async _request(method, path, body = null) {
        const url = `${this.baseUrl}${path}`;
        const headers = {
            'Content-Type': 'application/json',
            'X-Api-Key': this.apiKey,
        };
        const opts = { method, headers, signal: AbortSignal.timeout(this.timeout) };
        if (body) opts.body = JSON.stringify(body);

        const res = await fetch(url, opts);
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            const err = new Error(data.error || `HTTP ${res.status}`);
            err.status = res.status;
            err.data = data;
            throw err;
        }
        return data;
    }

    // ── Health ────────────────────────────────────────────────────────
    async health() {
        return this._request('GET', '/api/health');
    }

    // ── Sessions ──────────────────────────────────────────────────────
    async getSessions() {
        return this._request('GET', '/api/sessions');
    }

    async createSession(sessionId, { webhook_url, webhook_secret, session_type, tenant_id } = {}) {
        return this._request('POST', '/api/sessions', { session_id: sessionId, webhook_url, webhook_secret, session_type, tenant_id });
    }

    async getSessionStatus(sessionId) {
        return this._request('GET', `/api/sessions/${sessionId}/status`);
    }

    async getQR(sessionId, format = 'json') {
        return this._request('GET', `/api/sessions/${sessionId}/qr?format=${format}`);
    }

    async updateSession(sessionId, updates) {
        return this._request('PUT', `/api/sessions/${sessionId}`, updates);
    }

    async deleteSession(sessionId) {
        return this._request('DELETE', `/api/sessions/${sessionId}`);
    }

    // ── Messages ──────────────────────────────────────────────────────
    async sendText(sessionId, chatId, text, priority = 'normal') {
        return this._request('POST', `/api/sessions/${sessionId}/messages`, {
            type: 'text', chatId, text, priority,
        });
    }

    async sendImage(sessionId, chatId, imageUrl, caption = '') {
        return this._request('POST', `/api/sessions/${sessionId}/messages`, {
            type: 'image', chatId, imageUrl, caption,
        });
    }

    async sendDocument(sessionId, chatId, documentUrl, fileName = 'file') {
        return this._request('POST', `/api/sessions/${sessionId}/messages`, {
            type: 'document', chatId, documentUrl, fileName,
        });
    }

    async getMessages(sessionId) {
        return this._request('GET', `/api/sessions/${sessionId}/messages`);
    }

    async getIncoming(sessionId) {
        return this._request('GET', `/api/sessions/${sessionId}/incoming`);
    }

    // ── Broadcast ─────────────────────────────────────────────────────
    async sendBroadcast(sessionId, numbers, message, { priority, schedule_at } = {}) {
        return this._request('POST', `/api/sessions/${sessionId}/broadcast`, {
            numbers, message, priority, schedule_at,
        });
    }

    // ── Behavior Config ───────────────────────────────────────────────
    async getBehaviorConfig(sessionId) {
        return this._request('GET', `/api/sessions/${sessionId}/behavior`);
    }

    async setBehaviorConfig(sessionId, config) {
        return this._request('POST', `/api/sessions/${sessionId}/behavior`, config);
    }

    // ── FAQ ───────────────────────────────────────────────────────────
    async getFAQs(sessionId) {
        return this._request('GET', `/api/sessions/${sessionId}/faq`);
    }

    async addFAQ(sessionId, { question, answer, keywords, intent }) {
        return this._request('POST', `/api/sessions/${sessionId}/faq`, { question, answer, keywords, intent });
    }

    async deleteFAQ(sessionId, faqId) {
        return this._request('DELETE', `/api/sessions/${sessionId}/faq/${faqId}`);
    }

    // ── Templates ─────────────────────────────────────────────────────
    async getTemplates(sessionId) {
        return this._request('GET', `/api/sessions/${sessionId}/templates`);
    }

    async addTemplate(sessionId, { intent, templates }) {
        return this._request('POST', `/api/sessions/${sessionId}/templates`, { intent, templates });
    }

    async updateTemplate(sessionId, templateId, { intent, templates }) {
        return this._request('PUT', `/api/sessions/${sessionId}/templates/${templateId}`, { intent, templates });
    }

    async deleteTemplate(sessionId, templateId) {
        return this._request('DELETE', `/api/sessions/${sessionId}/templates/${templateId}`);
    }

    // ── Analytics ─────────────────────────────────────────────────────
    async getAnalyticsSummary(sessionId) {
        return this._request('GET', `/api/sessions/${sessionId}/analytics/summary`);
    }

    async getAnalyticsVolume(sessionId, days = 7) {
        return this._request('GET', `/api/sessions/${sessionId}/analytics/volume?days=${days}`);
    }

    async getAnalyticsExport(sessionId) {
        return this._request('GET', `/api/sessions/${sessionId}/analytics/export.csv`);
    }

    // ── Contacts / User Profiles ──────────────────────────────────────
    async getUsers(sessionId) {
        return this._request('GET', `/api/sessions/${sessionId}/users`);
    }

    async getUserProfile(sessionId, userId) {
        return this._request('GET', `/api/sessions/${sessionId}/users/${userId}`);
    }

    async setUserPersona(sessionId, userId, persona) {
        return this._request('PUT', `/api/sessions/${sessionId}/users/${userId}/persona`, { persona });
    }

    // ── Webhook event handling (client-side, for reference) ───────────
    on(event, handler) {
        if (!this._handlers.has(event)) this._handlers.set(event, []);
        this._handlers.get(event).push(handler);
        return this; // chainable
    }

    // ── Convenience: ensure session exists and is connected ───────────
    async ensureSession(sessionId, options = {}) {
        try {
            const status = await this.getSessionStatus(sessionId);
            if (status.status === 'not_found') {
                return this.createSession(sessionId, options);
            }
            return status;
        } catch (e) {
            if (e.status === 404) {
                return this.createSession(sessionId, options);
            }
            throw e;
        }
    }

    // ── Convenience: send text with auto-retry ────────────────────────
    async sendTextWithRetry(sessionId, chatId, text, { retries = 3, delay = 1000 } = {}) {
        for (let i = 0; i < retries; i++) {
            try {
                return await this.sendText(sessionId, chatId, text);
            } catch (e) {
                if (i === retries - 1) throw e;
                await new Promise(r => setTimeout(r, delay * (i + 1)));
            }
        }
    }
}

export default WaGateway;
export { WaGateway };
