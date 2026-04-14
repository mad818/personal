# Render Assimilation Batch 3 — Vault render brief filing

## Why this batch

The render-brief generator is useful, but right now it stops at copy/download. That makes it easy
to lose the brief or leave it outside the rest of Nexus memory. The next sensible step is to let
Vehicle Lab file that brief into VAULT as a compiled memory page so future hardware design work has
the same durable local-first trail as session summaries.

This keeps the lane honest:

- still no drone is required
- still no CAD or render service is required
- but future part-design intent becomes reusable and searchable inside Nexus

## Goals

1. Add one shared helper that turns the current render brief into a clean VAULT draft.
2. Keep the artifact framed as future-hardware prep, not live-flight authority.
3. Extend Vehicle Lab so the operator can file the brief locally with clear status feedback.

## Implementation shape

### Shared helper

Extend `lib/vehicle/hardwareReadiness.ts` with a builder that:

- accepts the current session bundle, selected target, and optional operator goal
- produces title, summary, content, and tags for `/api/memory/pages`
- keeps the artifact local-first and explicitly future-facing

### Vehicle Lab UI

Extend `components/vehicle/VehicleArtifactManifestCard.tsx` with:

- a dedicated render-brief filing status
- `File render brief to Vault`
- refresh signaling for VAULT surfaces after a successful write

## Guardrails

- No new dependency
- No external render/CAD service
- No claim that hardware already exists
- Keep requested visibility at least `internal`

## Verification

- `npm run type-check`
- `npm run verify`
- `npm run handoff:write`
- live checks:
  - `http://127.0.0.1:3000`
  - `http://127.0.0.1:3000/vehicle`
  - `http://127.0.0.1:3000/vault`
