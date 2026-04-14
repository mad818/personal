# Offline Readiness Batch 3 — 2026-04-07

## Goal
Close the next critical offline/local-first gap after shared freshness hints: several remote-heavy surfaces still either drop useful local state on refresh failure or leave operators guessing whether they are seeing fresh remote data or last-known local state.

## Why this batch
- INTEL Flight Tracker still clears useful flight state on refresh failure.
- OPS Map repaints active layers from failed fetches and can silently replace good data with empty overlays.
- Weather-backed IoT and security panels still lack the same compact freshness language used elsewhere.
- The app should keep behaving like a trustworthy local-first tool even when remote connectors are intermittent.

## Scope
1. Extend the shared feed-status contract to the next highest-value remote feeds: `weather` and `flights`.
2. Preserve last-known local state in Flight Tracker and weather-backed panels on transient failures.
3. Add local layer freshness/error tracking in Ops Map so failed refreshes do not clobber active layers.
4. Surface compact freshness / local-copy hints across INTEL, OPS, IOT, and SECURITY.

## Security constraints
- No new public routes.
- No secrets in UI, exports, or status text.
- No new cloud/backend persistence.
- Restricted/private data boundaries remain unchanged; only already-visible operator state is summarized.

## Acceptance criteria
- Flight Tracker keeps the last good flight set when refresh fails and shows whether it is fresh or last-known local data.
- Ops Map does not replace a good active layer with an empty one on transient refresh failure, and it exposes compact per-layer freshness posture.
- Sensor Dashboard and Security Alerts use the same weather freshness language as the rest of the app.
- `npm run type-check`, `npm run verify`, and `npm run handoff:write` pass.
