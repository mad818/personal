# Operational Profiles: War Room and Night Ops

## Objective
Convert scene presets into operational behavior profiles so mode changes influence system execution, visibility, and alerting logic.

## Why
Current presets mainly alter 3D appearance and movement. Users need mode changes to affect mission behavior in meaningful ways.

## Behavior Contract

### War Room
- Profile: high urgency, active monitoring.
- Effects:
  - preferred route focus: `cyber` and `ops`
  - scheduler cadence: faster checks
  - notifications: include low/medium/high/critical scheduler events
  - run-level framing: tasks tagged as active ops

### Night Ops
- Profile: low-noise, after-hours watch.
- Effects:
  - preferred route focus: `security` and `cyber`
  - scheduler cadence: standard checks
  - notifications: suppress low-noise completions; surface high-risk/error only
  - run-level framing: anomaly-first monitoring

### Focus/Default
- Profile: balanced daytime operations.
- Effects:
  - standard route behavior
  - standard scheduler cadence
  - standard notification policy

## Implementation Plan (Extensive)

### Phase 1 — State and Profile Modeling
1. Add `officeOperationalMode` in global settings (`normal | war | nightOps`).
2. Add mode metadata in office constants for:
   - label
   - focus tabs
   - scheduler tick interval
   - alert noise policy
3. Keep profile defaults explicit and conservative.

### Phase 2 — Office Preset Wiring
1. When applying `WAR ROOM` preset, set `officeOperationalMode = 'war'`.
2. When applying `NIGHT OPS` preset, set `officeOperationalMode = 'nightOps'`.
3. When applying `FOCUS`, set `officeOperationalMode = 'normal'`.
4. Keep existing scene/layout behavior unchanged.

### Phase 3 — Runtime Behavior Integration
1. Scheduler runner reads operational mode each tick.
2. Use profile cadence to adjust poll interval.
3. Apply profile notification rules:
   - war: verbose run notifications
   - nightOps: quiet success, loud failure/anomaly
4. Prefix scheduled prompts with profile context to align model output style.

### Phase 4 — UX Surface and Explainability
1. Show active profile and policy in UI controls.
2. Add profile hint in system footer/status surface.
3. Ensure users understand "why this alert appeared" under each mode.

### Phase 5 — Validation and Safety
1. Verify all profile transitions are idempotent.
2. Ensure no mode can bypass auth/rate limiter/circuit breaker behavior.
3. Run type check and lint.
4. Confirm no regression in scheduler persistence.

## Security and Safety Notes
- No direct privilege expansion by mode.
- Mode only changes orchestration policy, not authentication or secret access.
- Night Ops suppression only affects low-priority noise; error and high-risk alerts remain visible.

## Acceptance Criteria
- War Room and Night Ops visibly change scheduler/alert behavior in addition to visuals.
- Mode label is visible in UI.
- Existing presets still apply layout/scene controls correctly.
- `npx tsc --noEmit` passes.
