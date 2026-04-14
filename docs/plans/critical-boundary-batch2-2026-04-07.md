# Critical Boundary Batch 2 — COMMAND Network Checks + Session-Only Local Auth

## Why this batch

Two high-signal trust gaps are still open after the first cross-sector boundary pass:

- `components/command/NetworkHealth.tsx` still performs browser-direct network checks against arbitrary external targets.
- `components/settings/SettingsDrawer.tsx` still presents `localApiKey` like a normal persisted local setting even though the browser persistence layer now strips it for safety.

These are important because they affect:

- protected route / browser boundary consistency
- SSRF / arbitrary-target fetch posture
- degraded/offline trust in COMMAND
- settings UX honesty after the client-secret hygiene rollout

## Goals

1. Move COMMAND network checks behind a protected local route.
2. Validate and normalize custom targets so the panel self-heals duplicates and malformed input instead of drifting.
3. Keep local route checks working cleanly while the browser is offline, while making external target posture explicit.
4. Make `localApiKey` clearly session-only in Settings so the UI matches the actual persistence/safety model.

## Implementation plan

### CBB2.1 — Publish plan and backlog
- Record the audit findings and batch scope.

### CBB2.2 — Add a protected network-check route
- Add `app/api/network-health/check/route.ts`.
- Validate external URLs through the shared network guard layer.
- Allow local `/api/*` route checks through internal auth headers only.
- Apply rate limiting and protected-cache headers.

### CBB2.3 — Move NetworkHealth to the local route and self-heal target input
- Route all checks through `/api/network-health/check`.
- Normalize new targets before adding them.
- Reject duplicates and malformed targets with inline feedback.
- When offline, keep local route checks usable and preserve retained external snapshots.

### CBB2.4 — Fix session-only local auth UX in Settings
- Mark `localApiKey` as session-only.
- Surface a short explanation that it stays in memory only and clears on reload.
- Keep the free-first/local lane intact without pretending that key persistence exists.

### CBB2.5 — Re-verify code + runtime + browser reachability
- `npm run type-check`
- `npm run verify`
- `npm run auth:e2e`
- live reachability:
  - `http://127.0.0.1:3000`
  - `http://127.0.0.1:3000/command`

## Constraints

- No browser-direct third-party checks from COMMAND after this batch.
- No private-network external target probing through the new route.
- Keep custom target support useful, but bounded to safe public URLs or local `/api/*` paths.
- Do not widen the route beyond read-only health checks.
