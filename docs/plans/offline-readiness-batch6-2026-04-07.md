# Offline Readiness Batch 6 — 2026-04-07

## Goal
Close the next critical degraded-connectivity gap across COMMAND operator-trust surfaces: the app now preserves last-known remote data well, but `NetworkHealth` and the system footer still risk reading as "live" when the browser is offline or when a refresh was only requested, not completed.

## Why this batch
- `NetworkHealth` retains check results, but it does not clearly label them as last-run snapshots during offline or degraded sessions.
- `SystemStatusFooter` currently marks refresh completion on a timer instead of the actual `nexus-data-refreshed` event, which can mislead operators after offline clicks or failed refreshes.
- These are high-visibility trust surfaces, so small accuracy issues here undermine the broader local-first posture.

## Scope
1. Make `NetworkHealth` internet-aware with explicit local/offline guidance while preserving useful local-route checks.
2. Surface retained last-run timestamps inside `NetworkHealth` so stale checks read as retained snapshots instead of implied live status.
3. Make `SystemStatusFooter` internet-aware and event-driven for refresh completion, including clearer offline/local-copy language in the footer indicators.
4. Preserve current constraints: no new routes, no backend persistence changes, no secret exposure.

## Security constraints
- No new public routes or backend persistence.
- No secrets in UI text, footer status, or diagnostics.
- Only already-visible local operator state may be summarized.
- Offline posture must not hide local-only utility or imply remote success without actual completion.

## Acceptance criteria
- `NetworkHealth` clearly explains when results are retained last-run snapshots during offline/degraded connectivity.
- `NetworkHealth` surfaces last-check timing per target without blocking useful local Nexus route checks.
- `SystemStatusFooter` only updates `Last refresh` on a real `nexus-data-refreshed` completion event.
- `SystemStatusFooter` clearly distinguishes online-connected state from offline local-copy posture and disables pointless manual refresh while offline.
- `npm run type-check`, `npm run verify`, and `npm run handoff:write` pass.
