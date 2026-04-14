# DTM5 Auth/Shell Baseline Recovery

Date: 2026-04-11

## Summary

Closed the DTM5 Playwright blocker by separating real auth-flow coverage from deterministic authenticated-shell coverage, moving browser readiness onto shell sentinels, and isolating the E2E runtime from the operator's normal `.next` tree.

## What Changed

- `playwright.auth.config.ts`
  - switched the DTM5 browser harness to a deterministic built runtime on port `3100`
  - isolated Playwright build output to `.next-e2e` so the suites no longer collide with a live `.next` tree
- `tests/e2e/support/authenticatedShell.ts`
  - added shared authenticated-shell seeding for both `nexus_session_token` cookie and `sessionStorage.nexus_session_token`
  - added `gotoShell(...)`, canonical URL normalization, and shared shell-readiness diagnostics
  - made anchor-text readiness tolerant of repeated module titles by resolving the first visible match
- `tests/e2e/auth.spec.ts`
  - kept the real `/auth/connect` flow in the auth suite
  - stopped requiring a brittle invalid-token redirect URL and instead asserted the real contract: invalid status, auth gate still visible, no shell chrome, and no persisted session token
- `tests/e2e/hq-shell.spec.ts`
  - aligned HQ expectations with canonical shell URLs and shell-heal-safe navigation
- `tests/e2e/route-contract.spec.ts`
  - migrated route checks onto the shared authenticated-shell helpers
  - proved canonical Resources singular/plural repairs and learning/memory exact sessions on the stabilized shell baseline
- `tests/e2e/tab-surfaces.spec.ts`
  - migrated tab coverage onto the shared shell helpers
  - removed stale first-view assumptions that treated legitimate no-data states as auth/shell failures

## Verification

- `npm run type-check`
- `npm run auth:e2e`
- `npm run hq:e2e`
- `npm run route:e2e`
- `npm run tabs:e2e`
- `npm run verify`

All of the above passed after the recovery.

## Outcome

`DTM5`, `DTM5A`, `DTM5B`, `DTM5C`, and `DTM5D` are now complete. The learning/memory browser assertions are no longer masked by the old auth/toprail baseline, so the next major milestone returns to the deployment track starting at `FD1C`.
