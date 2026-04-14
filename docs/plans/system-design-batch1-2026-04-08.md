# System Design Batch 1 — Architecture Console Inside Resources

## Why this batch

Nexus now has a useful local file-impact helper, but operators still need the layer above it:

- what subsystem owns this behavior
- where data comes from
- what can fail
- which files matter first
- which boundaries must not be broken

The right fit for Nexus is not a generic “system design interview prep” page. It is an internal architecture console that explains the real product we are building.

## Goals

1. Add a `System Design` lane to Resources.
2. Model the most important real Nexus subsystems with compact architecture maps.
3. Link those maps directly into the new `Impact` lane.
4. Keep the experience local-first, fast, and understandable on first read.

## Subsystems for batch 1

- HQ shell and mission flow
- AI runtime and provider boundary
- Memory spine and compiled pages
- Scheduler and automation governance
- RECON protected-route boundary
- Vehicle passive bridge and future hardware prep

## Implementation plan

### SD1 — Plan + tracking

- Publish this plan.
- Track the batch in `tasks/todo.md`.

### SD2 — Shared subsystem map contract

- Add a shared static contract describing:
  - summary
  - ownership posture
  - entry points
  - dependencies
  - failure modes
  - change risk
  - impact seed files
  - important local-first / free-first constraints

### SD3 — Resources system design console

- Add a new `System Design` tab in the Resources workbench.
- Add a compact console for selecting one subsystem and reading:
  - what it does
  - where it starts
  - what it depends on
  - where it fails
  - what to read first

### SD4 — System design -> impact handoff

- Let the architecture console open the existing `Impact` lane with a prefilled target file.
- Teach the impact console to honor a routed `file` query param and auto-run on arrival.

### SD5 — Verification

- Run:
  - `npm run type-check`
  - `npm run verify`
  - `npm run handoff:write`
- Confirm the local app still responds on:
  - `http://127.0.0.1:3000`
  - `http://127.0.0.1:3000/resources`

## Constraints

- No new dependency
- No external architecture tool
- No documentation-only dead end
- No removal of existing Resources lanes

## Follow-on

If this batch works well, the next step is a second architecture batch:

- route ownership maps
- state ownership maps
- degraded-mode / offline posture callouts
- direct links into review packs or HQ internal diagnostics
