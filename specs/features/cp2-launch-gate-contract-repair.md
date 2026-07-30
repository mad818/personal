# CP2.4 Launch Gate Contract Repair

## Goal

Restore the missing executable CP2.4 final-launch contract so the documented release checklist has one honest command instead of referring to an npm script that does not exist.

## Scope

- Add `npm run cp2:launch:gate` as a fixed-command, fail-fast release orchestrator.
- Default static mode runs the existing full `release:gate` and the agent-runtime evaluation. The release gate owns `verify`, which already owns type-check and lint.
- Explicit `--live` mode additionally runs route integrity, release smoke, and auth E2E against one configured operator-managed runtime.
- Require `NEXUS_RELEASE_BASE_URL` and `NEXUS_TOKEN` for live mode, validate the URL, and prove `/api/health` is reachable before expensive checks begin.
- Keep Playwright from starting its own server when the CP2 gate is using an explicitly managed external runtime.
- Add focused static and runtime validators and wire them into canonical verification.
- Restore compatibility aliases used by the existing CP2 operator scripts and current release documentation.

## Guardrails

- No runtime or service auto-start from `cp2:launch:gate`.
- No file, artifact, branch, remote, pull-request, environment-file, or secret mutation.
- No token value in command arguments, reports, logs, JSON, or persisted evidence.
- No provider call, package install, dependency change, new route, application-state change, or RPG file change.
- Static mode never claims live-target acceptance.
- Live mode fails closed when target configuration, health, or any required check is missing.
- Remote CI, staged-host promotion, signing, rollback evidence, and physical-device acceptance remain separate explicit blockers.

## Acceptance

- The pre-fix `npm run cp2:local:launch-gate` missing-script failure is covered by restored compatibility wiring.
- Static validation proves exact ordered checks, shell-free npm execution, environment boundaries, no-mutation constraints, package wiring, and canonical verify coverage.
- Runtime fixtures prove argument handling, invalid-target rejection, static-pass classification, live-pass classification, and first-failure behavior without calling a target.
- `npm run cp2:launch:check`, `npx tsc --noEmit`, canonical verification, production build, handoff checks, and diff checks pass.
- A real `--live` result is reported only if an operator-managed runtime and token are actually available; otherwise CP2.4 remains open with the exact external/manual blocker.
