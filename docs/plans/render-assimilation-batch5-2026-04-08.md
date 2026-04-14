# Render Assimilation Batch 5 — VAULT artifact identity

## Why this batch

Vehicle render briefs can now be filed into VAULT, but they still look like ordinary compiled pages.
That weakens the point of the feature: future hardware prep should feel like a distinct, reusable
artifact lane.

The next useful step is to give those pages a small but clear identity in the archive itself.

## Goals

1. Detect vehicle render briefs from the existing local page contract.
2. Give them a stronger visual identity than a generic compiled note.
3. Keep the result compact and consistent with the current VAULT card language.

## Implementation shape

### Compiled page presentation

Extend `components/vault/CompiledMemoryPagesPanel.tsx` with:

- a tiny artifact-kind detector based on tags/topic/route
- a presentation helper for accent/background/badges
- a compact “future hardware render brief” cue for those pages

### Guardrails

- No new backend contract
- No special-case route or page type required
- Keep the copy concise and action-first
- Do not imply live aircraft authority

## Verification

- `npm run type-check`
- `npm run verify`
- `npm run handoff:write`
- live checks:
  - `http://127.0.0.1:3000`
  - `http://127.0.0.1:3000/hq`
  - `http://127.0.0.1:3000/vault`
  - `http://127.0.0.1:3000/internal/vehicle`
