// ponytail: WebSocket — real-time event stream for inbox
import { WebSocketServer } from 'ws';

let wss = null;
const clients = new Set();
globalThis.__wsClients = clients;

export function startWebSocketServer(server) {
    if (wss) return;
    wss = new WebSocketServer({ server, path: '/ws' });

    wss.on('connection', (ws, req) => {
        const url = new URL(req.url, 'http://localhost');
        const apiKey = url.searchParams.get('api_key');
        if (!apiKey) { ws.close(4001, 'API key required'); return; }

        ws.apiKey = apiKey;
        clients.add(ws);

        ws.on('close', () => clients.delete(ws));
        ws.on('error', () => clients.delete(ws));

        ws.send(JSON.stringify({ type: 'connected', message: 'WaAceh WebSocket connected' }));
    });
}

export function broadcastEvent(sessionId, event, data) {
    const msg = JSON.stringify({ type: event, session_id: sessionId, data, timestamp: Date.now() });
    for (const ws of clients) {
        try { ws.send(msg); } catch { clients.delete(ws); }
    }
}
