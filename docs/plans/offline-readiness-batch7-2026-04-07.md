# Offline Readiness Batch 7 — 2026-04-07

## Goal
Close the next critical degraded-connectivity gap across RECON lookup surfaces: useful audit/lookup results should remain visible locally when a rerun fails or the browser is offline, and the UI should say so clearly instead of reading like a fresh live result.

## Why this batch
- `HeadersAudit` currently clears the last successful audit before every rerun, so a transient failure or offline retry destroys useful local context.
- `PassiveDnsPanel` does the same for passive DNS and reverse-IP results, which is especially rough for a local-first operator workflow.
- RECON is one of the most failure-prone parts of the app because it depends on live external lookups, so preserving trust and clarity here matters disproportionately.

## Scope
1. Make `HeadersAudit` internet-aware with explicit offline/degraded messaging.
2. Preserve the last successful header-audit result across transient failures and offline reruns.
3. Make `PassiveDnsPanel` internet-aware with explicit offline/degraded messaging.
4. Preserve the last successful passive-DNS / reverse-IP result across transient failures and offline reruns.
5. Keep the boundary local-first: no new routes, no backend persistence expansion, no secret exposure.

## Security constraints
- No new public routes or external dependencies.
- No secrets in RECON status text or diagnostics.
- Only already-visible operator state may be summarized as retained local results.
- Offline posture must not imply successful live refreshes when the network is unavailable.

## Acceptance criteria
- `HeadersAudit` and `PassiveDnsPanel` both preserve useful last-successful results across failed reruns.
- Both panels clearly explain when they are showing retained local results during offline or degraded sessions.
- Lookup/audit actions disable while the browser is offline.
- `npm run type-check`, `npm run verify`, and `npm run handoff:write` pass.
