# Offline Readiness Batch 2 — 2026-04-07

## Goal
Close the next critical local-first gap after offline polling pause/resume: operators still cannot easily tell whether remote-backed data is fresh or whether they are looking at last-known local state.

## Why this batch
- COMMAND, CYBER, and INTEL all depend on remote-backed feeds.
- When the internet is down, the app now pauses polling correctly, but the UI still leaves freshness ambiguous.
- AI Briefing also needs to distinguish “internet down but local runtime available” from “local runtime unavailable.”

## Scope
1. Add a small shared feed-status contract in Zustand.
2. Update the highest-value remote-backed loaders to record success/failure timestamps.
3. Surface compact freshness hints in COMMAND, CYBER, and INTEL.
4. Make AI Briefing runtime-aware in local-only sessions.

## Security constraints
- No new public routes.
- No secrets in status UI.
- No backend persistence expansion.
- Only surface status derived from already-visible client/runtime behavior.

## Acceptance criteria
- Operators can tell when COMMAND/CYBER/INTEL are showing fresh remote data versus last-known local state.
- Feed failures preserve useful local data instead of forcing unnecessary blank states.
- AI Briefing stays available in local-only mode when the runtime works, and disables only when the runtime itself is unavailable.
- `npm run type-check`, `npm run verify`, and `npm run handoff:write` pass.
