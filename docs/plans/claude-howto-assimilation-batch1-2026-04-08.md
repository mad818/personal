# Claude Howto Assimilation Batch 1 — Local Engineering Playbooks

## Why this batch

The strongest useful idea in `claude-howto` is not tool-by-tool reference material. It is the workflow discipline:

- combine features intentionally
- follow a progressive path
- use reusable templates instead of improvising every time

For Nexus, the best translation is a local engineering playbook lane that helps with real repo work:

- code review
- refactors
- security audits
- release hardening
- subsystem onboarding

## Goals

1. Add a compact, actionable playbook lane to Resources.
2. Keep the content specific to Nexus, not Claude-only and not generic.
3. Connect playbooks directly to the existing `System Design` and `Impact` lanes.

## Implementation plan

### CH1 — Plan + tracking

- Publish this plan.
- Track the batch in `tasks/todo.md`.

### CH2 — Shared playbook contract

- Add a local static contract describing:
  - objective
  - when to use it
  - start route
  - core steps
  - verification
  - linked subsystem map
  - impact seed file

### CH3 — Resources playbooks console

- Add a `Playbooks` tab to the Resources workbench.
- Show compact cards for the highest-value engineering flows.

### CH4 — Cross-lane continuity

- Link playbooks into:
  - `System Design`
  - `Impact`
- Keep those jumps lightweight and query-param based.

### CH5 — Verification

- Run:
  - `npm run type-check`
  - `npm run verify`
  - `npm run handoff:write`
- Confirm:
  - `http://127.0.0.1:3000`
  - `http://127.0.0.1:3000/resources`

## Constraints

- No new dependency
- No cloud feature
- No Claude-vendor lock-in
- Must remain useful even if the user never installs external agent tooling

## Follow-on

If this works, the next playbook batch should add:

- copy/export playbook brief
- route-specific checklists
- quick links into runtime eval / status / scheduler audit surfaces
