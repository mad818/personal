# Offline Readiness Batch 1 — 2026-04-07

## Goal
Move Nexus closer to reliable offline/local-only usage by fixing the first obvious failure mode: internet-backed surfaces keep behaving like the network is always available, even though the product is designed to remain useful locally.

## Why this matters
- Nexus is already local-first in architecture, but not yet consistent in runtime behavior.
- Operators need to know the difference between:
  - local runtime unavailable
  - internet unavailable
  - full connectivity available
- When the browser is offline, internet-backed background polling should pause instead of repeatedly firing doomed requests.

## Scope
1. Add a shared browser/runtime readiness layer.
2. Teach internet-backed polling helpers to pause while offline and resume on reconnect.
3. Mount compact local-first readiness guidance in HQ, COMMAND, and VAULT.

## Security constraints
- No new secrets.
- No new public routes.
- No external dependency.
- No hidden-state exposure beyond local connectivity posture.

## Acceptance criteria
- HQ, COMMAND, and VAULT clearly show what still works in local-only mode.
- Internet-backed loaders stop polling while the browser is offline.
- Reconnect resumes those loaders without a full reload.
- `npm run type-check`, `npm run verify`, and `npm run handoff:write` pass.
