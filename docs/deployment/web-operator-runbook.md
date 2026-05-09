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
NEXUS_NETWORK_MODE=internal
NEXUS_ENABLE_HIGH_RISK_TOOLS=false
NEXUS_HIGH_RISK_WRITES_REQUIRE_APPROVAL=true
NEXUS_ALLOW_PAID_APIS=false
```

Only opt in to high-risk routes or paid providers when the use case is explicit and approved. For phone access while the desktop is off, use [`phone-access-coolify.md`](./phone-access-coolify.md).

## 2) Build and run

### Local container smoke

```bash
docker build -t nexus-prime .
docker run --rm -p 3000:3000 --env-file .env.local nexus-prime
```

### Coolify

Follow:
- [`coolify.md`](./coolify.md)
- [`fd2-release-runbook.md`](./fd2-release-runbook.md)

Use the repo-root `Dockerfile` and expose port `3000`.

## 3) Required environment contract

Minimum:

```env
NEXUS_TOKEN=...
NEXUS_DEPLOYMENT_PROFILE=web-self-hosted
```

Optional:
- one free/BYOK AI provider key for phone use while desktop Ollama is off
- data connector keys
- connector policy JSON

Source of truth:
- [`.env.example`](../../.env.example)

## 4) Post-deploy smoke

Run against the deployed host:

```powershell
$env:NEXUS_RELEASE_BASE_URL="https://your-host.example"
$env:NEXUS_TOKEN="your-token"
npm run release:smoke
npm run release:diagnostics:capture
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

1. Capture `npm run release:diagnostics:capture`
2. Revert env profile to the last known-good config
3. Redeploy the previous known-good image or commit
4. Re-run `npm run release:smoke`

Keep the previous artifact available before every promotion.
