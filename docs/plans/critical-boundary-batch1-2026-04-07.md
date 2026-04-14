# Critical Boundary Batch 1 — RECON + SIGNALS + OPS + Client Secret Hygiene

## Why this batch

The app has several older lanes that still bypass the intended local-first boundary:

- `components/recon/ReconLookup.tsx` still performs multiple public third-party lookups directly from the browser.
- `hooks/useArticles.ts` still calls the Guardian API directly from the browser when a legacy `guardianKey` exists in persisted settings.
- `components/ops/MarketRates.tsx` still calls FRED directly from the browser when a legacy `fredKey` exists in persisted settings.
- `store/useStore.ts` still persists legacy sensitive key fields inside `nexus-settings`, which conflicts with the newer server-side-only secret model.

These are high-signal issues because they affect:

- secret hygiene
- offline/degraded trust posture
- CSP / browser-boundary consistency
- post-login resilience when stale persisted settings exist

## Goals

1. Move remaining RECON browser lookups behind the protected local route layer.
2. Keep Guardian and FRED key usage server-side only.
3. Strip legacy sensitive keys from browser-persisted settings and auto-heal old local state.
4. Preserve the free-first default path and keep the site working live after the batch.

## Implementation plan

### CBB1 — Publish batch plan and backlog
- Record the audit findings and batch scope.

### CBB2 — Add shared helpers for server env + client settings sanitization
- Create a shared server-env helper for routes that need `.env.local` values without relying on stale process env.
- Create a shared client-settings sanitization helper that removes sensitive key fields from persisted settings.

### CBB3 — Finish RECON browser-boundary hardening
- Extend `app/api/recon/lookup/route.ts` to support the remaining public lookup panels:
  - RDAP domain / IP
  - DNS
  - certificate transparency
  - IP / domain geo
  - subdomain enumeration
  - DNS security
  - email reputation
  - username OSINT
- Update `components/recon/ReconLookup.tsx` so all third-party network calls go through the protected local route instead of the browser.

### CBB4 — Remove legacy browser-side Guardian / FRED key usage
- Update `app/api/news/route.ts` to optionally include Guardian results using server-side key access.
- Update `hooks/useArticles.ts` to rely on `/api/news` instead of browser-direct Guardian fetches.
- Update `app/api/commodities/route.ts` to read `FRED_KEY` through the shared server-env helper.
- Update `components/ops/MarketRates.tsx` to stop reading `settings.fredKey` and render based on server-returned energy quotes instead.

### CBB5 — Enforce client secret hygiene and self-heal
- Sanitize persisted Zustand settings before writing to local storage.
- Sanitize legacy persisted settings during migration.
- Extend boot-time shell-state repair to strip legacy secret fields from stale `nexus-settings` payloads.

### CBB6 — Verify code + runtime + browser reachability
- `npm run type-check`
- `npm run verify`
- `npm run auth:e2e`
- live reachability:
  - `http://127.0.0.1:3000`
  - `http://127.0.0.1:3000/hq`
  - `http://127.0.0.1:3000/recon`

## Constraints

- No direct provider calls from the client.
- No raw secret values returned to the browser.
- Keep changes surgical; do not widen route scope beyond the touched boundary lanes.
- Do not touch the existing merge-state blocker.
