# Render Assimilation Batch 1 — vehicle 3D artifact readiness

## Source signal

Reference repo: `mfranzon/render`

The strongest useful idea is not “embed a CAD generator into Nexus right now.” The useful idea is
to make Nexus ready for local-first 3D artifact workflows so future part previews, mounts,
enclosures, and airframe-related model outputs have a clean contract before real hardware arrives.

## Why this fits Nexus

Nexus already has:

- a future-drone readiness lane in Vehicle Lab
- local-only session bundle export/import
- VAULT conventions for durable artifacts
- a 3D-forward product identity

What is missing is a clear place in the artifact contract for:

- a previewable model asset
- a parametric source file
- the operator explanation that these are future-ready local artifacts, not required now

## Batch goals

1. Extend vehicle artifact manifests with optional 3D preview and parametric-source file slots.
2. Surface a compact “3D artifact readiness” lane in Vehicle Lab so operators understand where
   future model outputs belong.
3. Keep this free-first and local-first: no Python, no cloud rendering, no new required service.

## Scope

### Contract

Extend the vehicle artifact file kind union with:

- `preview_3d`
- `parametric_source`

Use these in the default future bundle file list so exported session manifests already reserve a
home for future:

- `.glb` or similar preview assets
- `.py` / script / source files for parametric generation

### Vehicle Lab UI

Add one compact block to the existing artifact manifest card that explains:

- 3D preview files are optional future attachments
- they are intended for mounts, brackets, enclosure fit, or airframe-related planning
- they remain local artifacts that can later be bundled or filed into VAULT

This should make “arrival day” and “future hardware iteration” feel connected without pretending a
drone or model files already exist.

## Guardrails

- Do not add `render` as a dependency.
- Do not require Python or any external service.
- Do not imply the aircraft or CAD assets already exist.
- Preserve the current bundle format and import/export flow.

## Verification

- `npm run type-check`
- `npm run verify`
- `npm run handoff:write`
- live checks:
  - `http://127.0.0.1:3000`
  - `http://127.0.0.1:3000/vehicle`
  - `http://127.0.0.1:3000/vault`
