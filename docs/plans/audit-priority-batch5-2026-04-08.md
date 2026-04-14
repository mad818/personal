# Audit Priority Batch 5 — Vehicle Session JSON Hot-Path Cleanup

## Why this batch

With the build/auth boundary stabilized again, the next highest-value cleanup is hot-path JSON work in the future-drone lane.

`components/vehicle/VehicleArtifactManifestCard.tsx` was eagerly serializing the full vehicle session bundle during render:

- the bundle includes the current telemetry history
- the history grows as a session continues
- most operators will never click copy/download on every render

That means the cost of `JSON.stringify(bundle, null, 2)` was growing in the exact path that updates most often.

## Goals

1. Remove large session-bundle serialization from the steady-state render path.
2. Keep copy/download behavior unchanged.
3. Re-verify the vehicle surface and keep live browser reachability explicit.

## Implementation plan

### AP5.1 — Move bundle JSON generation off render
- Replace render-time `useMemo(() => JSON.stringify(bundle, null, 2), [bundle])`.
- Generate the bundle JSON only inside copy/download handlers.

### AP5.2 — Keep imported-bundle export behavior explicit
- Preserve imported bundle copy behavior, but keep serialization inside the click path.

### AP5.3 — Re-verify
- `npm run type-check`
- `npm run verify`
- live reachability:
  - `http://127.0.0.1:3000`
  - `http://127.0.0.1:3000/vehicle`
