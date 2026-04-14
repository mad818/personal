# Render Assimilation Batch 2 — local render brief generator

## Why this batch

The first render-inspired batch made Vehicle session bundles 3D-artifact-ready. The next useful
step is to generate a clean local design brief for future part/model work so Nexus can hand off a
good request to later tools without requiring those tools today.

This keeps the repo honest:

- no drone is required yet
- no CAD service is required yet
- but the workflow for future mounts/enclosures/brackets becomes much clearer

## Goals

1. Add one shared helper that turns current vehicle readiness context into a part-design brief.
2. Support likely first hardware targets such as:
   - camera mount
   - companion enclosure
   - telemetry mast
   - battery restraint bracket
   - landing gear accessory
3. Surface that brief generator in Vehicle Lab with copy/download actions.

## Implementation shape

### Shared helper

Add a helper in `lib/vehicle/hardwareReadiness.ts` that:

- defines the target ids and labels
- builds a markdown brief using:
  - airframe / autopilot / connector profile
  - current bench + first-hardware-day posture
  - the reserved 3D artifact outputs from the existing bundle contract
- stays deterministic and local-only

### Vehicle Lab UI

Extend `VehicleArtifactManifestCard.tsx` with:

- a small target selector
- an optional operator goal/constraint input
- `Copy render brief`
- `Download render brief`

The UI should make it explicit that this is for later local model/render tools, not an active live
bridge or flight feature.

## Guardrails

- No external dependency
- No cloud rendering
- No Python requirement
- No suggestion that real hardware or model assets already exist

## Verification

- `npm run type-check`
- `npm run verify`
- `npm run handoff:write`
- live checks:
  - `http://127.0.0.1:3000`
  - `http://127.0.0.1:3000/vehicle`
  - `http://127.0.0.1:3000/vault`
