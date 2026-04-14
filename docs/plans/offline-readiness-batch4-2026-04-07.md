# Offline Readiness Batch 4 — 2026-04-07

## Goal
Close the next critical offline/local-first trust gap after flights, weather, and ops layers: world/news and prediction-market panels still do not consistently show whether they are fresh remote data or last-known local state.

## Why this batch
- News Feed already has article freshness in store, but the surface itself still reads like “loading” versus “done” rather than “fresh” versus “local copy.”
- Conflict Feed and Geo Heatmap rely on live `/api/conflict` plus local `gdeltEvents` fallback, but they do not expose that fallback posture clearly and one server-error path skips the fallback entirely.
- Polymarket preserves local state implicitly on fetch failure, but it does not tell the operator that this is what happened.

## Scope
1. Extend shared feed-status coverage to `conflict` and `polymarket`.
2. Add compact fresh/local-copy posture to News Feed, Conflict Feed, Geo Heatmap, and Polymarket Feed.
3. Fix any server-error path that bypasses a valid last-known local fallback.
4. Disable manual refresh buttons while the browser is offline for these remote-only surfaces.

## Security constraints
- No new public routes.
- No secrets in UI or status text.
- No backend persistence expansion.
- Only already-visible client/runtime state may be summarized.

## Acceptance criteria
- News Feed, Conflict Feed, Geo Heatmap, and Polymarket Feed all show whether they are fresh or using last-known local data.
- Conflict Feed no longer drops its valid local fallback on the server-error-with-no-articles path.
- Offline sessions do not encourage pointless manual refreshes for remote-only feeds.
- `npm run type-check`, `npm run verify`, and `npm run handoff:write` pass.
