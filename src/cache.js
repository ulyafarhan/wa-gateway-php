// ponytail: in-memory TTL cache — lost on restart, fine for hot data
const store = new Map();
const timers = new Map();

export function cacheGet(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (entry.expiry && entry.expiry < Date.now()) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

export function cacheSet(key, value, ttlMs = 60000) {
  if (timers.has(key)) clearTimeout(timers.get(key));
  store.set(key, { value, expiry: Date.now() + ttlMs });
  timers.set(key, setTimeout(() => { store.delete(key); timers.delete(key); }, ttlMs).unref());
}

export function cacheDel(pattern) {
  if (!pattern.includes('*')) { store.delete(pattern); timers.delete(pattern); return; }
  const prefix = pattern.replace('*', '');
  for (const k of store.keys()) {
    if (k.startsWith(prefix)) { store.delete(k); if (timers.has(k)) { clearTimeout(timers.get(k)); timers.delete(k); } }
  }
}
