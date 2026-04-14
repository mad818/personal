# Offline Readiness Batch 5 — 2026-04-07

## Goal
Close the next critical degraded-connectivity gap across OPS and CYBER detail panels: the top-level trust signals are improving, but some operator-facing detail feeds still do not clearly say whether they are fresh remote data or last-known local state.

## Why this batch
- `MarketRates` is a high-signal OPS surface, but it still behaves like a black box under degraded connectivity.
- `CISAFeed` is a key CYBER detail surface and still lacks the same freshness/offline posture used elsewhere.
- `CVEFeed` already benefits from the shared CVE feed-status contract indirectly, but the detailed panel itself does not surface that trust signal.

## Scope
1. Extend shared feed-status coverage to `marketRates` and `cisaKev`.
2. Add freshness pills, offline refresh gating, and last-known-local messaging to `MarketRates` and `CISAFeed`.
3. Surface the existing CVE freshness signal directly in `CVEFeed`.
4. Preserve current local-first behavior: no new routes, no new persistence, no secret exposure.

## Security constraints
- No new public routes.
- No secrets in UI or diagnostics text.
- No backend persistence expansion.
- Only already-visible operator state may be summarized.

## Acceptance criteria
- `MarketRates`, `CISAFeed`, and `CVEFeed` all clearly distinguish fresh remote state from last-known local state.
- Remote-only refresh buttons disable while the browser is offline.
- Existing last-known data is preserved across transient failures.
- `npm run type-check`, `npm run verify`, and `npm run handoff:write` pass.
