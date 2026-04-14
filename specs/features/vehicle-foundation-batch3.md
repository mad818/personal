# Nexus Prime — Vehicle Foundation Batch 3

**Date:** 2026-04-06  
**Status:** implementation batch  
**Scope:** establish the first passive telemetry bridge contract for Pixhawk / ArduPilot style integrations without giving Nexus any flight-critical authority.

---

## Goal

Land the minimum real bridge foundation:

1. protected local-only vehicle telemetry ingest route
2. normalized bridge snapshot readout
3. Vehicle Lab preference for fresh bridge frames over simulated frames
4. explicit bridge health / passive observer UI

This batch is still read-only from Nexus toward the aircraft. It does not send flight commands.

---

## Deliverables

### 1. Protected bridge route

Create a new internal route:

- `GET /api/vehicle/telemetry`
- `POST /api/vehicle/telemetry`

Requirements:

- route is `local_only`
- protected by existing auth middleware
- rate-limited
- no-store/private headers through the shared protected response contract
- validates body shape
- accepts partial normalized telemetry payloads and merges them onto a known-safe baseline

### 2. Passive bridge state

Add a server-side in-memory bridge store:

- latest normalized frame
- last ingest timestamp
- bridge id / bridge label
- ingest count
- freshness / health posture

### 3. Client bridge preference

Update the Vehicle Lab telemetry hook so that:

- it polls the protected bridge route
- if a fresh bridge frame exists, Vehicle Lab uses it as the active frame
- replay still wins when replay mode is enabled
- if no fresh bridge frame exists, the UI cleanly falls back to simulation

### 4. Vehicle bridge status card

Add a Vehicle Lab card that shows:

- passive observer boundary
- current source (`simulation` or `live_bridge`)
- last bridge ingest age
- bridge identifier
- operator-facing example payload path

---

## Explicitly Not In Scope

- MAVLink parsing
- serial/UDP connection handling
- command transmission
- autopilot control surfaces
- long-term persistence of bridge frames

---

## Acceptance Criteria

- Vehicle Lab can switch from simulation to a fresh bridge frame without page reload.
- The bridge route is local-only, protected, and rate-limited.
- Bridge frames are merged into the canonical vehicle contract before the UI sees them.
- Replay mode still functions when bridge data is present.
- `npm run type-check`, `npm run lint`, and `npm run verify` pass.
