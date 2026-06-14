# Vehicle and IoT Bundle Isolation

## Goal

Reduce initial JavaScript parsing and execution on Vehicle and IoT without removing panels, changing the approved layout, or weakening live operational behavior.

## Design

- Keep Vehicle bridge status, connector onboarding, telemetry contract, and page-level telemetry hook immediate.
- Dynamically load Vehicle sensor visualization, flight operations, launch/archive, checklist, and first-hardware-day panels.
- Keep IoT MQTT status and sensor gauges immediate.
- Dynamically load IoT weather, device status, sensor dashboard, registry, and automation panels.
- Isolate all route-owned Recharts consumers from initial Vehicle and IoT route bundles.

## Contract

- Existing routes, focus links, telemetry behavior, device behavior, and control posture remain unchanged.
- Existing shell panels remain the loading boundaries; no new visible loading UI is added.
- Every deferred panel still mounts automatically and remains available through normal route use.
- HQ and RPG code remain untouched.

## Acceptance

- The source performance gate rejects static imports for selected deferred panels.
- Focused browser acceptance proves representative Vehicle and IoT deferred panels render.
- Fresh production output shows smaller Vehicle and IoT first-load JavaScript and route-owned app chunks.
- Achieved production route-owned app chunk sizes receive enforceable budgets.
- Fast verification, full verification, production build, handoff check, and diff check pass.

## Result

- Vehicle first-load JS: about 458 KB to 305 KB.
- IoT first-load JS: about 419 KB to 293 KB.
- Route-owned production chunks: Vehicle 36.6 KB and IoT 9.8 KB.
- Enforced route-owned budgets: Vehicle 55 KB and IoT 25 KB.
- Production browser acceptance rendered representative deferred panels with zero page errors.
