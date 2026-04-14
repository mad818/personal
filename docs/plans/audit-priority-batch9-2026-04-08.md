# Audit Priority Batch 9 — Dev Runtime Self-Heal + Scheduler Auto Ops Extraction

## Why this batch

The previous cleanup pass reduced `CronSchedulerPanel.tsx`, but two practical issues were still slowing local work down:

- local Playwright auth/HQ runs still defaulted to `http://localhost:3100`, which could spin up a second dev server instead of reusing the real local runtime on `127.0.0.1:3000`
- `scripts/dev-server.mjs` still hard-deleted `.next` with no retry or graceful fallback, which made Windows file-lock races more likely after build/e2e cycles

This batch fixes the local-runtime instability first, then keeps the scheduler split moving by extracting the auto-ops preview into its own section.

## Goals

1. Make local Playwright auth/HQ runs reuse the normal `127.0.0.1:3000` dev server by default.
2. Make the local dev launcher tolerant of locked `.next` or runtime-identity cleanup failures instead of crashing or wedging the runtime.
3. Keep shrinking `CronSchedulerPanel.tsx` with one more safe section extraction.
4. Re-verify code, build, e2e, and live local reachability.

## Implementation plan

### AP9.1 — Stabilize local Playwright runtime reuse
- Change the default Playwright auth/HQ base URL to `http://127.0.0.1:3000`.
- Keep `reuseExistingServer` enabled for local runs so auth/HQ suites stop fighting a second dev server.

### AP9.2 — Harden dev-server cleanup
- Wrap `.next` and runtime-identity cleanup in one small helper.
- Use retry-aware removal and continue with a warning if cleanup still fails, instead of hard failing startup.

### AP9.3 — Extract scheduler auto-ops preview
- Move the auto-ops preview block into `CronSchedulerAutoOpsSection.tsx`.
- Keep the parent drawer responsible for state and run-now wiring.

### AP9.4 — Re-verify
- `npm run type-check`
- `npm run verify`
- `npm run build`
- `npm run auth:e2e`
- `npm run hq:e2e`
- live reachability:
  - `http://127.0.0.1:3000`
  - `http://127.0.0.1:3000/hq`
