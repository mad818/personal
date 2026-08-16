# Release Readiness Checklist

Use this checklist for both deployment lanes before promoting a release.

Readiness is wave-specific: deferred Phone/PWA and Desktop evidence cannot
block the active web candidate. The stable lane key is `webCandidate`; its
current label is `Web candidate (v1.0.0-rc.2)`. Stop for explicit approval before provisioning, DNS/TLS or
secret changes, the first external deployment, production promotion, tagging,
or release publication. Current evidence overwrites stable `*-latest.json`
paths; missing or expired proof is never green.

## One-command CP2.4 gate

- `npm run cp2:launch:gate` runs the complete local release gate plus the agent-runtime evaluation without calling a target.
- With an already-running target, set `NEXUS_RELEASE_BASE_URL` and `NEXUS_TOKEN`, then run `npm run cp2:launch:gate -- --live` to add route integrity, release smoke, and auth E2E.
- The live gate fails before expensive checks when the target health endpoint is unreachable, never starts its own runtime, never writes evidence, and never prints the token value.
- A static pass is not live acceptance. A live pass still requires remote CI confirmation plus staged promotion and rollback records.

## Shared baseline

- [ ] `npm run type-check`
- [ ] `npm run lint`
- [ ] `npm run check:path-collisions`
- [ ] `npm run security-scan`
- [ ] `npm run security:tauri`
- [ ] `npm run eval:agent-runtime:ci`
- [ ] `npm run release:smoke` against the target runtime
- [ ] `NEXUS_EVIDENCE_KEY` is private, at least 128 bits, distinct from the rotatable auth token, and understood as shared operator/runtime HMAC trust rather than independent server provenance
- [ ] `npm run release:diagnostics:capture -- --require-staged` records bounded route, HTTPS/header, immutable identity, and prerequisite posture without persisting the hostname or trusting editable JSON/runtime strings as independent provenance
- [ ] `npm run readiness:rollup` reports independent `webCandidate`, Desktop, and Phone/PWA lanes
- [ ] `npm run runtime:consistency` reports one coherent runtime boot identity
- [ ] `npm run runtime:fresh-proof` passes on an isolated clean runtime
- [ ] Build, Playwright, and fresh-runtime lanes are run serially when they share the same local `.next` workspace

## Scope and support

- [ ] GA surface matches the 7-tab nav contract plus `/resources`
- [ ] Beta/internal routes are not presented as supported product surfaces
- [ ] `/api/status` and `/api/diagnostics` expose release profile, build metadata, surface counts, and connector readiness
- [ ] connector policy and network mode are documented for the target environment

## Runtime and auth

- [ ] `/api/health` is green
- [ ] `/api/token` auth flow behaves correctly
- [ ] `npm run auth:regression` passes against the target runtime
- [ ] `npm run auth:e2e` passes against the target runtime
- [ ] `npm run hq:e2e` and `npm run route:e2e` are available for focused reruns when the full auth/browser lane fails
- [ ] `/api/status` returns authenticated release/readiness payload
- [ ] scheduler and non-interactive mission path run without duplicate dispatch
- [ ] runtime eval is fresh and above thresholds

## Regression memory

- [ ] auth regression suite is green (valid token, invalid token, stale session recovery, logout/reset)
- [ ] no stale-runtime or stale-bundle symptoms were observed during target-runtime testing
- [ ] no hydration mismatch warnings on HQ or always-mounted UI surfaces
- [ ] no hidden overlay, backdrop, or decorative layer steals pointer/focus access
- [ ] root and alias routes resolve to canonical surfaces correctly
- [ ] cinematic shell is visually consistent across all GA tabs for the target release

## Domain validation

- [ ] INTEL shows provenance-aware content and graceful empty/degraded states
- [ ] ALPHA remains usable without paid providers
- [ ] CYBER remains advisory/read-only and displays clear source provenance
- [ ] RECON defaults to free/public connectors and gracefully degrades when BYOK is missing
- [ ] VAULT persists locally and exports/imports without backend requirements

## Web lane

- [ ] published `v1.0.0-rc.1` remains unchanged at `5160ac9863725a10230a51c4d45c4cb0be218540`
- [ ] the exact verified RC2 candidate commit is recorded; candidate naming is not represented as tag, release, merge, or deployment approval
- [ ] [`fd2-release-runbook.md`](./fd2-release-runbook.md) has been followed for local proof, staged proof, and rollback prep
- [ ] Docker build succeeds
- [ ] Coolify/VPS deploy succeeds
- [ ] TLS is enabled
- [ ] protected routes require bearer auth
- [ ] CSP works in production

## Desktop lane

- [ ] `npm run desktop:build-runtime`
- [ ] `npm run desktop:start-runtime`
- [ ] `npm run desktop:tauri:dev` or packaged build launches cleanly
- [ ] `npm run desktop:isolation:status` passes statically; rerun with `--live` against the operator-managed desktop-secure runtime
- [ ] isolated mode blocks outbound connectors by default
- [ ] capability lockdown checks pass
- [ ] checksums are generated for the target build
- [ ] signing/SBOM status is recorded for the release
- [ ] `npm run desktop:trust-chain` records checksum, signing, and SBOM posture for the target artifact directory

## Rollback

- [ ] previous known-good artifact or image tag is available
- [ ] stable `docs/metrics/release-diagnostics-latest.json` captured before promotion
- [ ] one temporary QA receipt exists for the exact run ID used by the approved cleanup action
- [ ] cleanup completed after diagnostics with desktop step-up, explicit `REMOVE_TEMPORARY_QA_RECEIPTS` confirmation, and separate approval
- [ ] `npm run staging:protected-action:proof -- --run-id=<approved-run-id>` captured the signed receipt before final assurance
- [ ] stable `docs/metrics/web-staging-assurance-latest.json` is fresh and ready
- [ ] stable `docs/metrics/known-good-deployment-latest.json` is HMAC-authenticated, non-overwriteable without separate approved rotation, and records the exact source, image digest, sanitized deployment id, schema, boot identity, and bound source evidence
- [ ] known-good and rollback-chain inputs are no more than 24 hours old and declare expiry horizons no longer than 24 hours after capture
- [ ] real platform rollback restored the recorded full commit or image digest, with the action explicitly operator-confirmed rather than represented as direct provider API attestation
- [ ] post-rollback health, auth, routes, feeds, Capability Assurance, and protected-action checks pass
- [ ] stable `docs/metrics/rollback-proof-latest.json` records restoration truth and recovery duration
