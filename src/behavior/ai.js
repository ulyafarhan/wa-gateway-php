// ponytail: Multi-provider AI adapter — tries providers in order, caches responses
import { cacheGet, cacheSet } from '../cache.js';
import { simpleHash } from './content.js';

const PROVIDERS = {
  openai: {
    buildRequest: (msgs, model, sys, cfg) => ({
      url: cfg.ai_api_url || 'https://api.openai.com/v1/chat/completions',
      headers: { Authorization: `Bearer ${cfg.ai_api_key}` },
      body: { model: model || 'gpt-4o-mini', messages: [{ role: 'system', content: sys }, ...msgs], temperature: cfg.ai_temperature || 0.7, max_tokens: cfg.ai_max_tokens || 500 },
    }),
    extract: (raw) => raw.choices?.[0]?.message?.content || '',
  },
  anthropic: {
    buildRequest: (msgs, model, sys, cfg) => ({
      url: cfg.ai_api_url || 'https://api.anthropic.com/v1/messages',
      headers: { 'x-api-key': cfg.ai_api_key, 'anthropic-version': '2023-06-01' },
      body: { model: model || 'claude-3-haiku-20240307', max_tokens: cfg.ai_max_tokens || 1024, system: sys, messages: msgs },
    }),
    extract: (raw) => raw.content?.[0]?.text || '',
  },
  openai_compatible: {
    buildRequest: (msgs, model, sys, cfg) => ({
      url: cfg.ai_api_url ? `${cfg.ai_api_url}/chat/completions` : '',
      headers: { Authorization: `Bearer ${cfg.ai_api_key}` },
      body: { model: model || 'gpt-4o-mini', messages: [{ role: 'system', content: sys }, ...msgs], temperature: cfg.ai_temperature || 0.7, max_tokens: cfg.ai_max_tokens || 500 },
    }),
    extract: (raw) => raw.choices?.[0]?.message?.content || '',
  },
};

const FALLBACK_ORDER = ['openai', 'anthropic', 'openai_compatible'];

async function tryProvider(provider, msgs, sysPrompt, cfg) {
  const p = PROVIDERS[provider];
  if (!p) return null;
  const { url, headers, body } = p.buildRequest(msgs, cfg.ai_model, sysPrompt, cfg);
  if (!url || !cfg.ai_api_key) return null;
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body), signal: AbortSignal.timeout(30000) });
    if (!res.ok) return null;
    return p.extract(await res.json());
  } catch { return null; }
}

export async function callAI(userMessage, context, cfg) {
  const sysPrompt = cfg.ai_system_prompt || 'Anda adalah asisten yang ramah dan membantu.';
  const msgs = [...(context.conversation || []), { role: 'user', content: userMessage }];

  // Cache hit? Only for simple queries without conversation history
  const cacheKey = !context.conversation?.length ? `ai:${simpleHash(userMessage)}:${cfg.ai_model || ''}:${simpleHash(sysPrompt)}` : null;
  if (cacheKey) { const hit = cacheGet(cacheKey); if (hit) return hit; }

  // Try configured provider first, then fallbacks
  const providers = [cfg.ai_provider, ...FALLBACK_ORDER.filter(p => p !== cfg.ai_provider)];
  for (const p of providers) {
    const result = await tryProvider(p, msgs, sysPrompt, cfg);
    if (result) {
      if (cacheKey) cacheSet(cacheKey, result, 120000);
      return result;
    }
  }
  return null;
}
