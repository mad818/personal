---
description: Security rules — what never to do, env handling, API key safety, destructive command prevention
---

# Security Rules

## Never do these things
- Never commit `.env` or `.env.local` — they are gitignored for a reason
- Never log API keys, tokens, or secrets to the console
- Never hardcode API keys in source files — always read from `process.env` or the settings store
- Never run `rm -rf` on any path outside the project's working directory
- Never `curl | bash` or pipe remote content to a shell
- Never install packages with `--ignore-scripts` disabled on untrusted packages
- Never expose `app/api/` routes without validating input — all params must be sanitised
- Never include stack traces or internal paths in API responses sent to the client

## Environment variables
All secrets in `.env.local` (gitignored). Pattern:
```
NEXT_PUBLIC_*   — safe to expose to the browser
(no prefix)     — server-only, never in client bundles
```
Access server-side only in `app/api/` route handlers via `process.env.KEY`.
Never import `process.env` in client components.

## API key safety
User-supplied keys (Anthropic, CoinGecko, Finnhub, etc.) are stored in Zustand `settings`,
persisted to `localStorage` by the store.

Provider calls for LLMs route through `app/api/ai/route.ts` (server-side proxy).
Sensitive key writes/status checks route through `app/api/settings/route.ts`.

This means:
- Browser clients should call `/api/ai` and `/api/settings` (not provider URLs directly)
- API keys stay server-side for proxied providers when env-backed
- Never log request bodies/headers that may include secrets

## Destructive command prevention
`.claude/settings.json` PreToolUse hook blocks these patterns automatically:
`rm -rf`, `rm -r /`, `format c:`, `drop table`, `drop database`, `truncate table`,
`delete from ... where 1`, fork bombs, and similar.
If a destructive command is genuinely needed, Mario must confirm it explicitly in chat first.

## Dependency hygiene
- Pin versions in `package.json` — no `*` or loose ranges for security-sensitive packages
- Run `npm audit` before adding new dependencies
- Prefer packages with active maintenance and clear security track records
- Avoid packages with post-install scripts from unknown publishers

## OSINT / external data safety
The dashboard fetches data from many external sources. Rules:
- All external fetch calls are wrapped in `try/catch` — no unhandled rejections
- API responses are never eval'd or injected into `innerHTML` without sanitisation
- User-supplied watchlist items are escaped with `esc()` before rendering
- WebSocket connections (aisstream.io) are read-only — never send user data to them
