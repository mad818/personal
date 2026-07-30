# Ops Map Synchronized Flight View

## Outcome

Complete the feasible TrafficLab-inspired dual-view capability through the active INTEL Ops Map using one truthful flight snapshot shared by synchronized overview and tactical panels.

## Existing Nexus seam

- `components/ops/OpsMap.tsx` is the reachable INTEL live-map surface.
- `/api/flights` already returns bounded OpenSky flight positions through the server boundary.
- The current flight layer already displays heading-aware markers plus live speed and heading tooltips.
- `components/intel/IntelDeferredSegment.tsx` lazy-loads the map on the active INTEL route.

## Contract

1. Offer an explicit dual-flight-view toggle only when the live Flights layer is active.
2. Keep the existing map as the overview with every active layer.
3. Render the tactical map from the exact same fetched flight snapshot; do not issue a second flight-data request.
4. Synchronize center and zoom in both directions with a fixed two-level tactical zoom offset and non-animated updates.
5. Preserve heading-aware markers and speed/heading tooltips in both panels.
6. Remove the tactical map and listeners cleanly when the toggle, Flights layer, or component is closed.
7. Label the adaptation as synchronized 2D overview/tactical maps, not CCTV, homography, computer vision, or a 3D globe.

## Benefits

- Lets an operator keep global context while inspecting movement detail.
- Guarantees both panels describe the same bounded source snapshot.
- Reuses the existing route, provider, map, and movement evidence without adding dependencies.
- Completes the useful TrafficLab pattern without reviving the retired synthetic detached panel.

## Verification

- Pure runtime fixtures for overview/tactical zoom translation and bounded view normalization.
- Static active-surface, shared-snapshot, listener-cleanup, source-parity, and canonical-script wiring checks.
- `npm run source:parity:check`.
- `npm run source:reachability:check`.
- `npm run type-check`.
- `npm run lint`.
- `npm run verify`.
- `npm run handoff:write` and `npm run handoff:check`.
- `git diff --check`.
