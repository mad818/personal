# Render Assimilation Batch 4 — post-file continuity

## Why this batch

Vehicle Lab can now file both session summaries and render briefs into VAULT, but the interaction
still ends at a simple `Filed` state. The next step is to keep the operator moving by showing a few
compact, relevant follow-up actions once the artifact exists.

This fits the current Nexus UX direction:

- less dead-end status
- more continuity between surfaces
- no extra control wall

## Goals

1. Add compact continuation actions after successful Vehicle Lab filing actions.
2. Let those actions reuse the shared mission-continuation model instead of inventing a one-off lane.
3. Keep the context honest: this is future-hardware planning, not live-flight authority.

## Implementation shape

### Vehicle Lab continuity

Extend `VehicleArtifactManifestCard.tsx` so:

- successful session-summary filing can jump into VAULT, memory, or back into VEHICLE
- successful render-brief filing can do the same with a render-brief-specific memory query
- imported bundle filing gets the same treatment

### Shared behavior

Reuse `components/ui/MissionContinuationActions.tsx` and the mission handoff helpers already used in
HQ / VAULT / scheduler, instead of building a new navigation pattern.

## Guardrails

- Keep the copy short and action-first
- No claim that hardware already exists
- No live-flight or control implication
- Free-first/local-first unchanged

## Verification

- `npm run type-check`
- `npm run verify`
- `npm run handoff:write`
- live checks:
  - `http://127.0.0.1:3000`
  - `http://127.0.0.1:3000/hq`
  - `http://127.0.0.1:3000/vehicle`
  - `http://127.0.0.1:3000/vault`
