# Shell State Guard Batch 2 — 2026-04-07

## Summary

Shell Health Batch 1 added a render-time watchdog for authenticated shells that stall or lose styling after login. The next critical gap is earlier in the boot path: reused browser profiles can carry malformed or stale persisted local state, and that state can poison the shell before the user gets a stable view.

## Critical Findings

1. The app persists shell-affecting local state in browser storage:
   - `nexus-settings`
   - `nexus:vault-graph-filters:v1`
   - `nexus:scheduler-audit-filters:v1`
   - `nexus:scheduler-audit-views:v1`
   - `nexus_hq_split_drag_locked`
2. Those keys are validated when individual surfaces hydrate, but there is no single pre-hydration repair step.
3. A malformed or wildly stale persisted value can survive across sessions and keep a reused browser profile unstable even when the server, CSS bundle, and clean-browser tests are healthy.

## Goals

1. Repair or clear malformed browser state before the authenticated shell hydrates.
2. Clamp high-risk persisted shell values back to safe defaults.
3. Preserve operator trust by surfacing a compact recovery notice when a local repair happens.
4. Add a regression test that injects bad local state and proves the shell still boots cleanly.

## Implementation

1. Add a boot-time persisted-shell-state repair script that runs before interactive hydration.
2. Repair `nexus-settings` by:
   - normalizing `aiProvider`
   - clamping split height and motion values
   - coercing known enum-backed shell settings
   - falling back safely if the payload is malformed
3. Remove or sanitize invalid local-only filter caches for VAULT and scheduler audit views.
4. Show a compact local recovery notice after repair so the operator is not left guessing.
5. Extend auth/browser coverage to inject malformed persisted state and assert a clean styled HQ shell after login.

## Verification

1. `npm run type-check`
2. `npm run verify`
3. `npm run auth:e2e`
4. Live runtime proof on `http://127.0.0.1:3000` and `http://127.0.0.1:3000/hq`
