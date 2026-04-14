# Surface Focus Batch 1 — deeper panel landing from surface audit

## Why this batch exists

The new `Resources > Surfaces` lane makes Nexus easier to understand, but some of its best links still land at the top of a route instead of the exact working panel. That means the audit is informative, but not yet as execution-friendly as it should be.

The next useful step is to extend the existing focused-session pattern from COMMAND / RECON / VAULT into the next most valuable routes:

- INTEL
- CYBER
- ALPHA
- VEHICLE

## Goals

1. Keep route-level navigation intact while making deep links more precise.
2. Reuse the existing focused-session strip + scroll behavior instead of inventing another pattern.
3. Improve the `Surfaces` audit lane by making its subsection links land closer to real work.
4. Keep the implementation lightweight, static, and local-first.

## Scope

### In
- Add `focus`-aware route landing in INTEL, CYBER, ALPHA, and VEHICLE
- Add scroll targets and compact focus strips on those routes
- Update `lib/surfaceCapabilities.ts` links to use the improved landings

### Out
- No route restructuring
- No new backend/API work
- No tab removals
- No second navigation model

## Implementation plan

1. Add focus target ids and `SurfaceFocusStrip` usage to INTEL.
2. Add the same focused-session pattern to CYBER.
3. Add focused-session support to ALPHA.
4. Add focused-session support to VEHICLE.
5. Update the surface capability audit links to use the better landings.
6. Re-verify code, handoff, and live route reachability.

## Design rules

- Focus strips should explain why the operator landed there, not repeat route copy.
- Scroll targets should be stable ids on the real panel wrappers.
- Only add focused landings where the target panel is genuinely high-signal.
- Preserve the existing segmented-tab model; focus should narrow it, not replace it.

## Verification

- `npm run type-check`
- `npm run verify`
- `npm run handoff:write`
- Live checks on:
  - `/intel`
  - `/intel?view=sweeps&focus=intel-sweeps`
  - `/cyber?view=drone&focus=cyber-drone`
  - `/alpha?view=scanner&focus=alpha-scanner`
  - `/vehicle?focus=vehicle-artifact-convention`
