# Web Operator Runbook

## Purpose

This is the operator-facing runbook for the canonical web deployment lane:
- Docker
- Coolify / VPS
- self-hosted TLS endpoint

## 1) Deployment profile

Recommended defaults for production web self-hosting:

```env
NEXUS_DEPLOYMENT_PROFILE=web-self-hosted
NEXUS_NETWORK_MODE=connected
NEXUS_ENABLE_HIGH_RISK_TOOLS=false
NEXUS_ALLOW_PAID_APIS=false
```

Only opt in to high-risk routes or paid providers when the use case is explicit and approved.

## 2) Build and run

### Local runtime auto-heal

If the browser shows `ERR_CONNECTION_REFUSED` against `127.0.0.1:3000`, use the supported healer instead of opening a dead URL repeatedly:

```bash
npm run runtime:heal
```

To heal the local runtime and open HQ only after `/api/health` is live:

```bash
npm run hq:open
```

The healer will:
- reuse a healthy runtime if one is already up
- start the standalone runtime in the background if a build already exists
- rebuild and retry once when the local build is missing or stale
- refuse to replace a different process that is already occupying port `3000`

### Local release-candidate proof

If the worktree is intentionally dirty, capture that exact local boundary first:

```bash
npm run release:boundary:capture
```

Then confirm the local tree still matches that explicit boundary:

```bash
npm run release:boundary
```

If the tree is already clean, the boundary check will pass without any snapshot file.

### Local release-candidate proof

```bash
npm run launch:gate
```

### Local container smoke

```bash
docker build -t nexus-prime .
docker run --rm -p 3000:3000 --env-file .env.local nexus-prime
```

If Docker is unavailable on the operator machine, use the first staging host as the artifact-proof vehicle instead of claiming local container proof. In that case, the exact staged host must pass:

```bash
npm run launch:gate:target
```

### Coolify

Follow:
- [`coolify.md`](./coolify.md)

Use the repo-root `Dockerfile` and expose port `3000`.
For the current first remote artifact proof, point the Coolify app at branch `codex/preserve-main-2026-04-11`.
This repo intentionally does not commit a real staging hostname or Coolify app identifier, so replace every placeholder host with the operator's actual staged domain before running the target-runtime gate.
Preferred local operator setup: add that real staged domain to repo-root `.env.local` as `NEXUS_RELEASE_BASE_URL=https://...`.

## 3) Required environment contract

Minimum:

```env
NEXUS_TOKEN=<replace-with-long-random-local-token>
NEXUS_DEPLOYMENT_PROFILE=web-self-hosted
```

Optional:
- AI provider keys
- data connector keys
- connector policy JSON

Source of truth:
- [`.env.example`](../../.env.example)

## 4) Post-deploy smoke

Run against the deployed host:

```bash
npm run release:smoke
```

Or run the full grouped target-runtime gate:

```bash
npm run launch:gate:target
```

That grouped target-runtime gate is the required proof when the first staging host is standing in for unavailable local Docker proof, and it now auto-loads `NEXUS_RELEASE_BASE_URL` plus `NEXUS_TOKEN` from repo-root `.env.local`.
`NEXUS_RELEASE_BASE_URL` must still point at the real staged Coolify hostname, not any placeholder value from this repo.

For local release proof against an intentionally started local runtime, set:

```bash
NEXUS_ASSUME_LOCAL_RUNTIME=true npm run route:integrity
NEXUS_ASSUME_LOCAL_RUNTIME=true NEXUS_TOKEN=<set-in-local-env-only> npm run auth:regression
```

Then manually verify:
- `/api/health`
- `/api/status`
- `/api/diagnostics`
- HQ, COMMAND, INTEL, ALPHA, CYBER, RECON, VAULT, Resources

## 5) Connector and network policy

- `isolated`: no outbound connector routes
- `internal`: intranet-safe or limited connector posture
- `connected`: approved external connectors

If a connector must be disabled without code changes, use:

```env
NEXUS_CONNECTOR_POLICY_JSON={"news":true,"flights":false}
```

## 6) Recovery and rollback

If the deployment degrades:

1. Capture `/api/diagnostics`
2. Revert env profile to the last known-good config
3. Redeploy the previous known-good image or commit
4. Re-run `npm run release:smoke`

Keep the previous artifact available before every promotion.
