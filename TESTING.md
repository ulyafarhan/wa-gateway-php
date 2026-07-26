# Testing

Framework: **Node.js `node:test`** + `node:assert` — zero dependencies.

## Run

```bash
npm test              # All tests
node --test test/unit/auth.test.mjs      # Single file
node --experimental-test-coverage --test test/   # With coverage (Node 22+)
```

## Struktur

```
test/
├── unit/                     # Unit tests (pure logic, zero dep)
│   ├── auth.test.mjs         # 15 — JWT, bcrypt, RBAC, permissions
│   ├── cache.test.mjs        # 10 — TTL, expiry, wildcard delete
│   ├── webhook.test.mjs      # 9 — deliver, retry, URL resolution
│   └── behavior/
│       ├── persona.test.mjs  # 11 — Online K-Means predict/fit
│       ├── timing.test.mjs   # 11 — Delays, EMA update, multiplier
│       ├── volume.test.mjs   # 10 — Token bucket, rate limit, adjust
│       ├── anti-ban.test.mjs # 17 — Safety hours, burst, diversity
│       └── content.test.mjs  # 19 — Intent, FAQ, Levenshtein, hash
│
├── auth-flow.test.mjs        # Integration: login/refresh/me/register
├── api-security.test.mjs     # Integration: headers, body limit, bypass
├── landing-flow.test.mjs     # Integration: user flow E2E
├── auth.test.mjs             # Unit: legacy auth bypass
├── broadcast.test.mjs        # Unit: broadcast enqueue + scheduler
└── helpers/db.js             # In-memory SQLite helper
```

Total: **114+ unit test**, semua pass.
