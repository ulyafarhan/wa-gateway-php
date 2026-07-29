// ponytail: MCP Server — Streamable HTTP transport untuk AI agents
// Tools: sessions, messages, contacts, groups — read-only by default

const MCP_TOOLS = [
  { name: 'list_sessions', description: 'List all WhatsApp sessions', inputSchema: { type: 'object', properties: {} } },
  { name: 'get_session_status', description: 'Get session status', inputSchema: { type: 'object', properties: { session_id: { type: 'string' } }, required: ['session_id'] } },
  { name: 'send_text', description: 'Send text message', inputSchema: { type: 'object', properties: { session_id: { type: 'string' }, chat_id: { type: 'string' }, text: { type: 'string' } }, required: ['session_id', 'chat_id', 'text'] } },
  { name: 'list_contacts', description: 'List contacts for a session', inputSchema: { type: 'object', properties: { session_id: { type: 'string' } }, required: ['session_id'] } },
  { name: 'list_groups', description: 'List contact groups', inputSchema: { type: 'object', properties: { session_id: { type: 'string' } }, required: ['session_id'] } },
  { name: 'get_session_qr', description: 'Get QR code for session (returns QR string)', inputSchema: { type: 'object', properties: { session_id: { type: 'string' } }, required: ['session_id'] } },
  { name: 'get_health', description: 'Get system health', inputSchema: { type: 'object', properties: {} } },
];

export function handleMcpRequest(req, res) {
  if (req.method !== 'POST' || req.path !== '/mcp') return false;

  const { method, params } = req.body || {};

  if (method === 'initialize') {
    return res.json({
      jsonrpc: '2.0',
      result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'waaceh-mcp', version: '1.0.0' }
      },
      id: req.body.id
    });
  }

  if (method === 'tools/list') {
    return res.json({ jsonrpc: '2.0', result: { tools: MCP_TOOLS }, id: req.body.id });
  }

  if (method === 'tools/call') {
    return handleToolCall(req, res);
  }

  res.json({ status: 'ok', server: 'waaceh-mcp' });
  return true;
}

async function handleToolCall(req, res) {
  const { params } = req.body;
  const tool = params?.name;
  const args = params?.arguments || {};

  try {
    const result = await executeTool(tool, args);
    return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: JSON.stringify(result) }] }, id: req.body.id });
  } catch (e) {
    return res.json({ jsonrpc: '2.0', error: { code: -32603, message: e.message }, id: req.body.id });
  }
}

async function executeTool(tool, args) {
  switch (tool) {
    case 'list_sessions': {
      const { sessions } = await import('./session.js');
      return Array.from(sessions.entries()).map(([id, s]) => ({ session_id: id, status: s.status }));
    }
    case 'get_session_status': {
      const { getSessionStatus } = await import('./session.js');
      return getSessionStatus(args.session_id);
    }
    case 'send_text': {
      const { enqueueMessage } = await import('./session.js');
      return { message_id: enqueueMessage(args.session_id, { chatId: args.chat_id, text: args.text }) };
    }
    case 'list_contacts': {
      const { default: db } = await import('./db.js');
      return db.prepare('SELECT user_id, persona, last_reply_at FROM user_profiles WHERE session_id = ? ORDER BY updated_at DESC LIMIT 50').all(args.session_id);
    }
    case 'list_groups': {
      const { default: db } = await import('./db.js');
      return db.prepare('SELECT * FROM contact_groups WHERE session_id = ? ORDER BY name').all(args.session_id);
    }
    case 'get_session_qr': {
      const { sessions } = await import('./session.js');
      const s = sessions.get(args.session_id);
      return { qr: s?.qr || null, status: s?.status || 'not_found' };
    }
    case 'get_health': {
      const { default: db } = await import('./db.js');
      return { status: 'ok', uptime: Math.round(process.uptime()), sessions: db.prepare('SELECT COUNT(*) as c FROM sessions').get().c };
    }
    default:
      throw new Error(`Unknown tool: ${tool}`);
  }
}
