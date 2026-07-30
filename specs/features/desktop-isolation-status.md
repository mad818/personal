# Desktop Isolation Status

## What it does

Adds one read-only operator command that separates provable Nexus application isolation from the packaged desktop and OS-level no-outbound evidence still required to close CP2.2.

## Surface and data

- Operator CLI: `npm run desktop:isolation:status`.
- Machine-readable output: add `--json`.
- Optional live application proof: add `--live` with `NEXUS_RELEASE_BASE_URL` and `NEXUS_TOKEN` configured for an already-running runtime.
- Static evidence comes from `buildSecureRuntimeProfile`, the complete `ROUTE_POLICIES` inventory, and `isRouteAllowedInMode`.
- Live evidence reads only public `/api/health` and protected `/api/status`; it does not call connector, provider, mutation, or high-risk routes.
- No application route, component, Zustand state, dependency, or durable evidence store is added.

## Static proof

- Local secure profile binds loopback, selects isolated mode, blocks paid APIs and high-risk tools, and requires review for high-risk writes.
- Every declared `connector_opt_in` and `high_risk` route policy is denied in isolated mode.
- Every declared `local_only` route policy remains available at the policy layer.
- The command reports policy counts and a deterministic static verdict without reading `.env.local` or calling a target.

## Live application proof

- Live mode requires an explicit HTTP(S) origin and configured token, then proves health before reading protected status.
- Protected status must report the `desktop-secure` deployment profile, isolated network mode, paid APIs disabled, high-risk routes disabled, token configured, and approval required for high-risk writes.
- Playbook output labels this only as application-level isolation evidence.

## Guardrails

- No service start, connector request, provider call, package install, file/artifact/env mutation, remote write, or secret output.
- No packet inspection, firewall mutation, VPN/proxy behavior, or claim that application policy proves OS-level no-outbound behavior.
- No packaged-desktop claim from a plain Next.js runtime.
- No RPG file change or RPG-specific command.
- Missing or contradictory static/live evidence fails closed.

## Acceptance

- Focused runtime fixtures prove complete policy inventory handling, secure-profile posture, static-only classification, live-pass classification, live-failure classification, and invalid-target rejection without network calls.
- Static validation proves command wiring, fixed read-only endpoints, no-mutation constraints, docs/task linkage, and canonical verify coverage.
- `npm run desktop:isolation:status`, `npm run desktop:isolation:check`, `npx tsc --noEmit`, canonical verification, production build, handoff checks, publication safety, and diff checks pass.
- CP2.2 stays open with explicit `packaged_desktop_shell_evidence_required` and `os_no_outbound_capture_required` blockers until those external/manual proofs exist.
