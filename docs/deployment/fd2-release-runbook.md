# FD2 Release Runbook

FD2 is the first staged web release proof for Homefront/Nexus Prime. It remains blocked until the real Coolify/VPS target exists, but the proof path below is the exact lane to run once the operator supplies the missing host and token.

## Prerequisites

- Real staged hostname in repo-root `.env.local` as `NEXUS_RELEASE_BASE_URL`.
- Valid `NEXUS_TOKEN` for the staged host.
- Docker available for local container proof.
- Coolify app points at the repo-root `Dockerfile`, exposes port `3000`, and has TLS enabled.
- Web profile is conservative by default:

```env
NEXUS_DEPLOYMENT_PROFILE=web-self-hosted
NEXUS_NETWORK_MODE=internal
NEXUS_ENABLE_HIGH_RISK_TOOLS=false
NEXUS_HIGH_RISK_WRITES_REQUIRE_APPROVAL=true
NEXUS_ALLOW_PAID_APIS=false
```

## Local Proof

Run this before touching the staged host:

```powershell
npm run type-check
npm run verify
npm run build
npm run runtime:proof:3100 -- --routes=/,/hq?focus=hq-chronicle,/command,/resources,/vehicle
```

If `npm run build` fails on Windows with a `.next` lock, stop the managed runtime first:

```powershell
npm run runtime:stop:3100
npm run build
```

## Staged Proof

Once `.env.local` has the real staged base URL and token:

```powershell
npm run release:smoke
npm run release:diagnostics:capture
```

If you need to prove a different host without editing `.env.local`, run:

```powershell
$env:NEXUS_RELEASE_BASE_URL="https://your-host.example"
$env:NEXUS_TOKEN="your-token"
npm run release:smoke
npm run release:diagnostics:capture
```

The diagnostics capture writes a timestamped JSON artifact under `docs/metrics/`. It records route status, whether the real release base URL and token were present, whether Docker CLI was available, and which prerequisites are still blocked. It must not be treated as production proof while the artifact still reports blocked prerequisites.

## Required Route Proof

At minimum, the staged capture must include:

- `/api/health`
- `/`
- `/hq?focus=hq-chronicle`
- `/command`
- `/resources`
- `/vehicle` or `/internal/vehicle`
- `/api/status`
- `/api/diagnostics`

Protected diagnostics may return `401` or `403` only when the run intentionally lacks `NEXUS_TOKEN`. With a token, `/api/status` and `/api/diagnostics` must return `2xx`.

## Rollback

Before promotion:

- Record the deployed commit SHA, Coolify deployment id, image/tag if available, and the previous known-good deployment.
- Capture diagnostics before promotion with `npm run release:diagnostics:capture`.
- Keep the previous deployment available in Coolify.

If the deployment degrades:

1. Restore the previous deployment in Coolify.
2. Revert env changes to the last known-good values.
3. Re-run `/api/health`, `/`, `/hq?focus=hq-chronicle`, and `/command`.
4. Re-run `npm run release:smoke`.
5. Capture a fresh `npm run release:diagnostics:capture` artifact and label it as rollback proof.

## Acceptance

FD2 can move from blocked to proven only when:

- Local proof passed.
- Coolify/VPS deployed from the repo-root `Dockerfile`.
- TLS is enabled on the real host.
- `npm run release:smoke` passed against the real host.
- `npm run release:diagnostics:capture` artifact shows `hasReleaseBaseUrl`, `hasToken`, route health, and no blocked staged-host prerequisite.
- Rollback target is documented before promotion.
