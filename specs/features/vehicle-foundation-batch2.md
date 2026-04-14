# Nexus Prime — Vehicle Foundation Batch 2

**Date:** 2026-04-06  
**Status:** implementation batch  
**Scope:** convert the Vehicle Lab from “sim telemetry only” into a more serious readiness surface by adding F450 bench discipline and concrete Vault artifact conventions.

---

## Goal

Land the next practical readiness slice after the shared telemetry foundation:

1. a persisted props-off bench bring-up checklist for the F450
2. a canonical preview of how future flight sessions should be packaged into Vault artifacts

This batch still avoids live autopilot I/O. It exists to make hardware onboarding and post-flight archival explicit before the passive bridge arrives.

---

## Deliverables

### 1. Bench bring-up checklist

Add a grouped checklist covering:

- power and frame safety
- orientation / compass / IMU
- RC and mode mapping
- GPS and home-lock posture
- failsafe validation

Requirements:

- persisted in the main store settings
- resettable
- copyable as markdown
- clearly labeled as props-off validation only

### 2. Vault artifact manifest preview

Add a canonical manifest for future flight-session artifacts:

- session summary
- telemetry replay log
- incident timeline
- sensor / camera bundle

Requirements:

- generated from the shared telemetry source
- shows filenames, tags, and payload summary
- copyable as JSON
- uses vendor-neutral language so future Pixhawk / Jetson bridges can emit the same shape

---

## Explicitly Not In Scope

- writing artifacts into VAULT storage
- flight log import/export
- passive telemetry bridge
- real hardware commands
- map playback

---

## Acceptance Criteria

- Vehicle Lab includes a persisted F450 bench checklist.
- Vehicle Lab includes a future Vault artifact manifest preview driven by live sim data.
- The checklist survives reloads because it is store-backed.
- The artifact manifest makes future V0.3 work more concrete without pretending archival already exists.
- `npm run type-check`, `npm run lint`, and `npm run verify` pass.
