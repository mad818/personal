# Audit Priority Batch 4 — Edge Auth Boundary Cleanup + Build Gate Recovery

## Why this batch

The audit queue still had an old high-priority note about `next build` failing around `/api/maritime`, but the failure was no longer reproducing after a clean `.next` reset. The build did, however, surface a real boundary problem:

- `middleware.ts` imported `lib/authSession.ts`
- `lib/authSession.ts` imported `applyNoStoreHeaders` from `lib/runtimeIdentity.ts`
- `lib/runtimeIdentity.ts` uses Node-only modules (`crypto`, `fs`, `path`, `process`)

That meant the Edge auth path was carrying Node-only code indirectly, which is exactly the kind of hidden instability that can turn clean builds into later runtime weirdness.

## Goals

1. Remove Node-only runtime identity coupling from the Edge auth path.
2. Re-run the full build/auth verification lane to prove the old blocker is gone.
3. Clear the stale blocker note from the audit backlog so priority moves to the real remaining cleanup work.

## Implementation plan

### AP4.1 — Split cache headers from runtime identity
- Move the generic `applyNoStoreHeaders(...)` helper into an edge-safe standalone module.
- Keep `readRuntimeIdentity()` in the Node-only runtime identity module.

### AP4.2 — Repoint auth/protected response helpers
- Update `lib/authSession.ts` to import the edge-safe helper instead of `lib/runtimeIdentity.ts`.
- Update shared response helpers/import sites for consistency.

### AP4.3 — Re-verify the full gate
- `npm run build`
- `npm run type-check`
- `npm run verify`
- `npm run auth:e2e`
- live reachability:
  - `http://127.0.0.1:3000`
  - `http://127.0.0.1:3000/hq`
  - `http://127.0.0.1:3000/command`

### AP4.4 — Refresh the audit queue
- Mark the old `/api/maritime` blocker as resolved.
- Move the next real audit priorities up: `CA1` hot-path churn, `CA2` OfficeCommandCenter split, `CA3` CronSchedulerPanel split.
