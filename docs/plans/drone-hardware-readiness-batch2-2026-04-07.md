# Drone Hardware Readiness Batch 2 — 2026-04-07

## Why this batch

We do not own the Pixhawk / ArduPilot hardware yet. That means Vehicle Lab should optimize for
arrival-day readiness, not fake live-drone authority. The missing pieces were:

- connector onboarding UX for the future Pixhawk / ArduPilot arrival
- a concrete passive bridge process stub plus setup docs
- real local import / export for future flight-session bundles
- a dedicated first-hardware-day checklist and recovery lane

## Scope

1. Add a persistent, self-healing connector profile in Vehicle Lab.
2. Ship a repo-local passive bridge stub and deployment doc that target the existing
   `/api/vehicle/telemetry` contract.
3. Upgrade the artifact convention card into a real local session bundle import/export surface with
   Vault filing.
4. Add a first-hardware-day checklist plus recovery flows, still observer-first and props-off.
5. Re-verify code health and live browser reachability after the batch.

## Guardrails

- Nexus stays non-flight-critical.
- The bridge remains read-only / advisory only.
- Everything stays local-first and free-first by default.
- No feature should imply the drone already exists.
- Imported bundles must stay local and validate before filing into Vault.

## Expected outcome

When the hardware arrives, the operator should already have:

- a saved connector profile
- a copyable bridge stub command
- a documented setup path
- a first-day bring-up and recovery checklist
- a clean JSON export/import path for the first real session
