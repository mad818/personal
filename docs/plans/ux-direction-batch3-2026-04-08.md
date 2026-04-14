# UX Direction Batch 3 — Mission Handoff Continuity

Date: 2026-04-08
Owner: Codex

## Why this batch

HQ now has a mission-oriented entry rail, but the intent mostly disappears after the first click.
That makes the app feel like a collection of tabs again instead of one continuous operator workflow.

The goal of this batch is to preserve that intent across route changes without replacing the current
tab model or adding a second navigation system.

## Problems to fix

1. HQ can launch a mission, but destination surfaces do not acknowledge why the operator arrived there.
2. Route transitions lose continuity, so the first screen on the next page feels cold and generic.
3. The app already has strong panels and deep surfaces, but not enough lightweight “you are here for this”
   framing once the operator leaves HQ.

## Approach

1. Add one shared mission handoff contract/helper for:
   - mission intent (`observe`, `investigate`, `archive`, `launch`)
   - origin (`hq`)
   - optional source/front context (`cyber`, `intel`)
2. Use that helper to build HQ route targets so mission params are added consistently.
3. Add one reusable mission handoff strip component with:
   - compact title and summary
   - surface-specific next-step guidance
   - a direct return-to-HQ affordance
4. Mount the strip at the top of destination surfaces:
   - COMMAND
   - INTEL
   - CYBER
   - VAULT
   - VEHICLE

## Constraints

- Keep the current tabs and route model intact.
- Do not introduce a second top-level IA.
- Keep the UI compact; avoid another wall of text.
- Preserve free-first and local-first behavior.
- Make the strip disappear automatically when no valid mission handoff is present.

## Success criteria

- Mission launches from HQ carry intent into the destination route.
- Destination pages clearly explain the active mission in one compact block.
- The strip is reusable and centralized instead of page-specific copy duplication.
- HQ continues to pass `hq:e2e`, and live routes still respond after the change.
