# Drone Ops Cohesion Batch 1 — Vehicle launchpad + route hygiene

## Why this batch

The Vehicle Lab already has good telemetry, bridge, checklist, and artifact primitives, but the drone workflow is still fragmented:

- generic `drone` chat intent can route to the wrong surface
- Vehicle Lab does not yet provide one clear operator path into compliance, memory, and archive
- the drone compliance panel still behaves like a one-off form instead of a protected local workbench surface

That makes the app feel less coherent than the underlying vehicle foundation already is.

## Goals

1. Make drone- and F450-specific intent route into the Vehicle Lab by default instead of the wrong tab.
2. Add one clear Vehicle Lab launchpad that ties together benching, bridge posture, compliance, and archive flow.
3. Harden the drone compliance panel so it uses the authenticated local fetch path and retains useful results on transient failure.
4. Re-verify code, runtime, and live browser reachability at the end.

## Implementation plan

### DOC1 — Publish plan and backlog
- Record the drone-ops cohesion findings in `tasks/todo.md`.

### DOC2 — Fix route cohesion for drone intent
- Move generic drone/F450/Pixhawk/MAVLink/bench intent toward `/internal/vehicle`.
- Keep compliance-specific legal/FAA/airspace prompts routed to CYBER’s drone lane.

### DOC3 — Add a Vehicle Lab drone launchpad
- Add a new launchpad component that summarizes:
  - bench checklist progress
  - current bridge posture
  - next recommended operator action
  - quick links into compliance, COMMAND memory, and VAULT
- Add a copyable operator brief so the current drone posture can leave the page cleanly.

### DOC4 — Harden the drone compliance lane
- Move `DroneCompliancePanel` to `apiFetch(...)`.
- Preserve the last successful result on transient failures instead of clearing the panel.
- Support prefilled query params so Vehicle Lab links can land in a useful state.

### DOC5 — Re-verify code + runtime + browser reachability
- `npm run type-check`
- `npm run verify`
- `npm run auth:e2e`
- live reachability:
  - `http://127.0.0.1:3000`
  - `http://127.0.0.1:3000/vehicle`
  - `http://127.0.0.1:3000/cyber?view=drone`
