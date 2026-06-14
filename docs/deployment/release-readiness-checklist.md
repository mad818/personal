# Release Readiness Checklist

Use this checklist for both deployment lanes before promoting a release.

## Shared baseline

- [ ] `npm run type-check`
- [ ] `npm run lint`
- [ ] `npm run check:path-collisions`
- [ ] `npm run security-scan`
- [ ] `npm run security:tauri`
- [ ] `npm run eval:agent-runtime:ci`
- [ ] `npm run release:smoke` against the target runtime
- [ ] `npm run release:diagnostics:capture` records route status and prerequisite posture
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
- [ ] isolated mode blocks outbound connectors by default
- [ ] capability lockdown checks pass
- [ ] checksums are generated for the target build
- [ ] signing/SBOM status is recorded for the release
- [ ] `npm run desktop:trust-chain` records checksum, signing, and SBOM posture for the target artifact directory

## Rollback

- [ ] previous known-good artifact or image tag is available
- [ ] diagnostics snapshot captured before promotion
- [ ] timestamped `docs/metrics/release-diagnostics-*.json` artifact is attached to the release record
- [ ] rollback steps tested and documented for the target lane
