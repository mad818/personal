# Nexus Prime — Vehicle Foundation Batch 1

**Date:** 2026-04-06  
**Status:** implementation batch  
**Scope:** establish the first real hardware-readiness foundation for the Vehicle Lab without pretending Nexus is a flight controller.

---

## Goal

Land the smallest serious slice that moves the project toward seamless ArduPilot / Pixhawk / Jetson integration:

1. define one canonical vehicle telemetry contract
2. create one shared simulation source with retained history
3. refactor the Vehicle Lab to read that shared source instead of per-widget demo timers

This batch is intentionally **read-only / simulation-first**. It does not add live bridge I/O, autopilot commands, or flight-critical logic.

---

## Constraints

- Nexus stays an operator console, not the flight controller.
- All current controls must clearly read as `simulation-only`, `advisory`, or `read-only`.
- The telemetry contract must be vendor-neutral enough to support future Pixhawk / ArduPilot and companion-compute bridges.
- Replay support in this batch means retained history + shared replay cursor, not full log import/export yet.
- `tsc --noEmit` must pass after the batch.

---

## Deliverables

### 1. Canonical contract

Create `lib/vehicle/types.ts` with shared interfaces for:

- heartbeat / online posture
- flight mode / arming state
- position / GPS / heading / speed / altitude
- battery and link quality
- mission progress
- failsafe posture
- sensors
- cameras
- companion-compute health
- detections and pipeline latency
- overall snapshot / replay posture

Also export the contract field list used by the Vehicle Lab shell copy so the UI stops duplicating schema language by hand.

### 2. Shared simulation source

Create `lib/vehicle/simTelemetry.ts`:

- singleton simulation state
- 1-second tick
- retained history buffer
- live vs replay cursor
- future-friendly control posture metadata
- helper actions for simulation-only mode changes, speed cap, waypoint count, companion connectivity, and sensor toggles

This module becomes the single source of truth for the Vehicle Lab.

### 3. Vehicle hook

Create `hooks/useVehicleTelemetry.ts`:

- `useSyncExternalStore` wrapper over the simulation source
- returns the active frame, history, replay state, and simulation control helpers

### 4. Vehicle Lab refactor

Refactor the existing vehicle components to consume the shared contract:

- `TelemetryPanel`
- `TelemetryChart`
- `SensorHealthRadial`
- `SensorFusion`
- `ControlPanel`
- `CameraArray`
- `app/vehicle/page.tsx` contract chips

Outcomes:

- all panels reflect the same frame
- replay cursor affects every telemetry-driven panel
- controls no longer imply real hardware authority

---

## Explicitly Not In Scope

- live MAVLink / MAVSDK bridge
- Jetson service registration
- Vault archival of flight artifacts
- map route review
- command-capable real hardware actions
- autonomous mission logic

---

## Acceptance Criteria

- Vehicle Lab uses one shared telemetry source.
- Replay mode can scrub retained history and updates all telemetry-driven panels.
- Control surface is labeled as simulation-first / non-flight-critical.
- Contract field names are centralized and reused by the page copy.
- No existing public HTTP contracts change.
- `npm run type-check` passes.

---

## Follow-On Batch

Batch 2 should build on this foundation with:

1. passive telemetry bridge contract for ArduPilot / Pixhawk
2. Vault flight-session artifact shape
3. bench bring-up checklist
4. Jetson companion registration metadata
