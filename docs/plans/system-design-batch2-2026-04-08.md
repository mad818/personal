# System Design Batch 2 — Performance, Micro-Optimization, and Security Audit Posture

## Why this batch

The first system-design lane explains ownership and boundaries, but the next useful layer for real engineering work is:

- where performance risk concentrates
- what small optimizations are actually worth doing
- which security checks matter for that subsystem

Without those, the architecture console still stops short of helping with everyday decisions.

## Goals

1. Extend subsystem maps with performance and security posture.
2. Keep the console compact and operational, not essay-shaped.
3. Capture the workflow lesson that long-running sessions need refreshed handoff context before reasoning quality drifts.

## Implementation plan

### SD6 — Plan + tracking

- Publish this plan.
- Track the batch in `tasks/todo.md`.

### SD7 — Shared subsystem audit fields

- Extend the system design map contract with:
  - performance hotspots
  - micro-optimization levers
  - security audit checks

### SD8 — Console updates

- Add compact sections for the new audit posture.
- Keep them skimmable and avoid turning the page into another dense manual.

### SD9 — Session-quality rule

- Record the long-context / refresh-handoff rule in `tasks/lessons.md` so it becomes part of normal repo discipline.

### SD10 — Verification

- Run:
  - `npm run type-check`
  - `npm run verify`
  - `npm run handoff:write`
- Confirm:
  - `http://127.0.0.1:3000`
  - `http://127.0.0.1:3000/resources`

## Constraints

- No new service
- No new dependency
- No giant architecture essay UI
- Must stay useful for daily code changes, not just documentation

## Follow-on

If this lands well, the next pass should add:

- degraded/offline posture per subsystem
- route ownership maps
- a copyable audit brief for code reviews and handoffs
