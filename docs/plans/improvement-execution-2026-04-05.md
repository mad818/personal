# Nexus Prime — Improvement Execution Slice
**Date:** 2026-04-05
**Scope:** Protected control-plane hardening inside the broader April improvement program
**Primary lanes touched:** security, API contracts, internal workbench, verification

## Why this slice now
- The repo already has a broad all-aspects roadmap in `docs/plans/improvement-plan-2026-04.md`, but several protected local-only routes still rely on route-by-route cache handling.
- Internal workbench responses are standardized for payload shape, but not yet uniformly standardized for protected response headers.
- The safest high-leverage improvement is to harden one shared response contract and add a guardrail so future Claude-era routes cannot silently drift.

## This batch
1. Record the execution slice in `tasks/todo.md` so the work is tracked in-repo.
2. Add one shared helper for protected JSON responses:
   - force `no-store`
   - add auth-aware `Vary` headers
   - keep route code small and consistent
3. Apply that helper to the protected local-only control-plane routes:
   - status / diagnostics / project / settings / verify
   - provider and usage health
   - agent health and learnings
   - runtime eval routes
   - internal workbench helper so workflows, registry, model lab, security, sweeps, and geo-delta inherit the same policy
4. Add a repo-native verification script that fails if a protected local-only route is cacheable or lacks an approved protected-response signal.
5. Re-run the new guardrail and `type-check`.

## Success criteria
- Protected local-only routes no longer emit ad-hoc cache behavior.
- Internal workbench routes inherit protected headers from their shared helper, not from repeated per-route code.
- `npm run verify` and `npm run health` both include the new guardrail.
- `npm run check:protected-cache` passes.
- `npm run type-check` passes.

## Non-goals for this slice
- Browser auth E2E reruns
- Vitest recovery or dependency repair
- Broad UI, performance, or agent-behavior refactors
- High-risk route caching redesign for streaming/action endpoints like `/api/ai` and `/api/tools`

## Next slices after this one
- GA shell/degraded-state convergence across the public tabs
- input-validation and rate-limit hardening on older connector routes
- targeted performance pass on HQ polling and heavy client bundles
- restored unit/integration test execution once the local Vitest/tooling gap is fixed
