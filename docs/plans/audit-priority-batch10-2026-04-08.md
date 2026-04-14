# Audit Priority Batch 10 — Safe Build Runtime Guard

## Why this batch

The previous batch stabilized local dev startup and auth, but one real dev-runtime risk still remained:

- running `npm run build` while the dev server was live could still mutate the same `.next` tree the active app was serving from
- that could temporarily produce missing-chunk errors on live routes until the dev server recompiled

This batch puts a hard guard in front of `next build` whenever the live dev runtime is active, so verification work no longer poisons the running app.

## Goals

1. Keep `npm run build` safe while a live dev runtime is using `.next`.
2. Preserve normal `.next` builds when no dev runtime is active.
3. Keep `npm run start` resilient around legacy `.next-build` output if that folder still exists from prior sessions.
4. Re-verify that the build guard prevents live-runtime poisoning, then confirm the site still responds after a clean dev restart.

## Implementation plan

### AP10.1 — Add a safe build runner
- Detect an active local dev runtime from the runtime-identity file plus a live local port probe.
- When active, refuse the build instead of touching a live `.next` tree.
- When inactive, keep the existing `.next` behavior.

### AP10.2 — Make standalone start resilient
- Teach `scripts/start-runtime.mjs` to fall back to `.next-build` when `.next` is absent but a legacy isolated build still exists.
- Keep explicit `NEXUS_NEXT_DIST_DIR` override behavior unchanged.

### AP10.3 — Repoint package scripts
- Route `build` and `desktop:build-runtime` through the new safe build runner.
- Keep command names stable so the rest of the repo does not need to change.

### AP10.4 — Re-verify
- `npm run build`
- `npm run verify`
- `npm run auth:e2e`
- `npm run hq:e2e`
- live reachability after the guarded build refusal and a clean dev restart:
  - `http://127.0.0.1:3000`
  - `http://127.0.0.1:3000/hq`
  - `http://127.0.0.1:3000/vehicle`
