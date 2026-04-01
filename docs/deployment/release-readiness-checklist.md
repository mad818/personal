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

## Scope and support

- [ ] GA surface matches the 7-tab nav contract plus `/resources`
- [ ] Beta/internal routes are not presented as supported product surfaces
- [ ] `/api/status` and `/api/diagnostics` expose release profile, build metadata, surface counts, and connector readiness
- [ ] connector policy and network mode are documented for the target environment

## Runtime and auth

- [ ] `/api/health` is green
- [ ] `/api/token` auth flow behaves correctly
- [ ] `/api/status` returns authenticated release/readiness payload
- [ ] scheduler and non-interactive mission path run without duplicate dispatch
- [ ] runtime eval is fresh and above thresholds

## Domain validation

- [ ] INTEL shows provenance-aware content and graceful empty/degraded states
- [ ] ALPHA remains usable without paid providers
- [ ] CYBER remains advisory/read-only and displays clear source provenance
- [ ] RECON defaults to free/public connectors and gracefully degrades when BYOK is missing
- [ ] VAULT persists locally and exports/imports without backend requirements

## Web lane

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

## Rollback

- [ ] previous known-good artifact or image tag is available
- [ ] diagnostics snapshot captured before promotion
- [ ] rollback steps tested and documented for the target lane
