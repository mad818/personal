# F450 Drone Readiness Plan

**Status:** future program  
**Updated:** 2026-04-02  
**Purpose:** prepare Nexus Prime to become the operator console, telemetry archive, and mission workspace for an `F450` drone program without turning the web app into a flight-critical controller.

---

## 1. Core principle

Nexus does **not** become the real-time flight brain.

The control split should stay:

- **Flight controller / autopilot:** real-time stabilization, failsafes, arming, mode changes
- **Companion computer:** telemetry bridge, camera/vision jobs, future lidar or mapping workloads
- **Nexus Prime:** operator UI, mission planning, telemetry review, alerts, and post-flight archive

That separation protects the aircraft and keeps the web/desktop stack in the role it is actually good at.

---

## 2. Initial airframe posture

The `F450` is a strong first dev platform because it gives us:

- room for a proper flight stack
- room for GPS, telemetry radio, and later companion compute
- a safer path toward future lidar and perception experiments than a cramped FPV frame

For this cycle, we should assume:

- first priority is stable manual + assisted flight
- autonomy comes later
- payload growth happens in stages, not all at once

---

## 3. Future architecture

## A. Flight stack

- flight controller with proven autopilot firmware
- ESC + motor telemetry when available
- GPS + compass
- radio control and a clean failsafe path
- power monitoring and battery health reporting

## B. Companion compute lane

- telemetry bridge service
- camera ingest / recording / detection jobs
- future sensor fusion
- future lidar or mapping adapters

This lane should likely be Python-first later, with Rust only where a bridge or performance boundary really needs it.

## C. Nexus Prime lane

- **`/internal/vehicle`** becomes the live internal drone lab
- `HQ` gets summary health and mission state
- `COMMAND` gets mission queue / alert framing
- `VAULT` stores flight logs, incidents, and replay artifacts

---

## 4. Data model to standardize early

Before the drone arrives, Nexus should already know how to represent:

- heartbeat / online state
- flight mode
- arming state
- GPS lock quality
- battery voltage / percentage / failsafe threshold
- link quality / telemetry latency
- altitude / heading / speed
- mission status
- failsafe / warning events
- sensor health
- camera events / detections

This is the contract we should simulate first and connect to hardware later.

---

## 5. Build phases

## Phase 0 — Before hardware arrives

Ship these in software first:

- a cleaner `Vehicle Lab` surface in Nexus
- a simulated telemetry generator
- a replay mode for stored telemetry
- a mission / health schema that does not depend on a specific autopilot vendor
- flight-log storage conventions for `VAULT`

**Exit criteria**

- Nexus can display believable drone telemetry without any hardware connected.

## Phase 1 — Bench bring-up

When the `F450` arrives:

- document the exact hardware stack
- create an assembly and calibration checklist
- validate power, orientation, GPS, compass, and RC mapping with props off
- prove that Nexus can ingest passive telemetry without sending flight-critical commands

**Exit criteria**

- the aircraft is bench-stable and Nexus is a trusted read-only observer.

## Phase 2 — First flight envelope

- fly in stabilized/manual assisted modes first
- capture telemetry, battery, GPS quality, and event logs
- validate post-flight archive and replay in Nexus
- keep missions simple and geofenced

**Exit criteria**

- first flights produce useful logs and health insight inside Nexus without raising operational risk.

## Phase 3 — Mission tooling

- waypoint / mission state visualization
- route and alert overlays
- operator checklists
- preflight / postflight workflow
- incident review and export

**Exit criteria**

- Nexus becomes a practical operations console, not just a telemetry demo.

## Phase 4 — Sensor expansion

Later, and only after stable flights:

- camera event fusion
- object / obstacle summaries
- lidar experiments
- map / replay overlays
- mission confidence and environment state

**Exit criteria**

- perception features augment pilot awareness without replacing core flight safety systems.

---

## 6. Safety rules

- No flight-critical stabilization logic in Next.js or the desktop UI.
- No autonomous flight tests before stable manual and assisted flight.
- No lidar or heavy payload experiments before the power budget and frame behavior are understood.
- No indoor powered testing with props mounted.
- Every future control surface must define whether it is read-only, advisory, or command-capable.

---

## 7. What Nexus should build next for this future

Short-term software work:

1. finish the cinematic `Vehicle Lab` surface
2. add simulated drone telemetry + replay
3. define the telemetry schema and storage model
4. add mission health / failsafe UI language
5. connect `VAULT` to future flight-log artifacts

Medium-term after the `F450` arrives:

1. bench diagnostics checklist
2. passive telemetry bridge
3. flight log import/export
4. map and mission review tooling
5. later sensor fusion and lidar adapters

---

## 8. Definition of ready-for-hardware

Nexus is ready for the `F450` when:

- the internal `Vehicle Lab` can run in simulation mode
- telemetry and health contracts are stable
- mission and failsafe states have a clear UI language
- logs can be stored and replayed
- no part of the web app is pretending to be the flight controller
