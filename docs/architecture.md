# Nexus Prime — Current Architecture

## Overview

Nexus Prime is a **Next.js 14 App Router application** with a **local-first desktop shell** via Tauri and a **self-hosted web deployment** path via Docker/Coolify.

This repo is no longer a single-file browser artifact. The historical `nexus-final.html` remains as legacy reference only. The active architecture is:
- `app/` for routes and API handlers,
- `components/` for UI,
- `lib/` for runtime logic and policies,
- `store/useStore.ts` for persisted client state,
- `desktop/src-tauri/` for the desktop host.

## Product surface policy

Release scope for the current cycle is intentionally narrower than the full repo route inventory.

### Supported GA surfaces
- `/home` — HQ
- `/command` — COMMAND
- `/intel` — INTEL
- `/alpha` — ALPHA
- `/cyber` — CYBER
- `/recon` — RECON
- `/vault` — VAULT
- `/resources` — field manual and operator references

### Beta / internal surfaces
- Beta: `/signals`, `/ops`, `/security`
- Internal: `/iot`, `/vehicle`, `/skills`, `/reset`

These routes may exist and function, but they are **not** part of the current GA support contract unless explicitly promoted.

## Delivery lanes

Nexus currently ships through two aligned deployment lanes:

1. **Web self-hosted**
   - Docker and Coolify/VPS deployment
   - Next.js standalone server
   - protected `/api/*` routes behind `NEXUS_TOKEN`

2. **Desktop secure**
   - Tauri shell
   - local standalone runtime bound to `127.0.0.1`
   - route-policy and network-mode controls

Both lanes share the same release baseline:
- auth/token behavior,
- runtime eval gates,
- route-policy enforcement,
- diagnostics payloads,
- connector governance,
- rollback documentation.

## Runtime layers

| Layer | Responsibility |
|---|---|
| `app/*` | Supported app routes and route-local UI composition |
| `app/api/*` | Gateway for AI, tools, diagnostics, feeds, verification, and settings |
| `lib/agent.ts` | Agent orchestration, tool risk policy, run artifacts |
| `lib/ai.ts` | AI provider calls, prompt building, non-interactive mission path |
| `lib/security/*` | route policy, connector policy, secure runtime controls |
| `lib/releaseMatrix.ts` | canonical release surface and connector metadata |
| `store/useStore.ts` | persisted UI/runtime settings and app state |
| `desktop/src-tauri/*` | desktop host shell, capability config, secure command boundary |

## API gateway model

### Protected control plane
- `/api/token`
- `/api/health`
- `/api/status`
- `/api/diagnostics`
- `/api/settings`
- `/api/project`
- `/api/verify`

### Runtime / agent plane
- `/api/ai`
- `/api/tools`
- `/api/agent-reach`
- `/api/mqtt`
- `/api/telegram`

### Connector plane
- `/api/news`
- `/api/gdelt`
- `/api/conflict`
- `/api/cves`
- `/api/cisa-kev`
- `/api/threat-intel`
- `/api/sec-filings`
- `/api/prices`
- `/api/metals`
- `/api/commodities`
- `/api/fx`
- `/api/fear-greed`
- `/api/defi`
- `/api/polymarket`
- `/api/weather`
- `/api/earthquakes`
- `/api/fires`
- `/api/flights`
- `/api/maritime`
- `/api/geo-scan`
- `/api/hacker-news`
- `/api/headers`

## Security and policy model

### Network modes
- `isolated`
- `internal`
- `connected`

### Route classes
- `local_only`
- `connector_opt_in`
- `high_risk`

### Enforcement
- `middleware.ts` enforces auth and route-policy decisions for `/api/*`
- `lib/security/routePolicy.ts` classifies route prefixes
- `lib/security/connectorPolicy.ts` enables/disables individual connectors
- `NEXUS_ALLOW_PAID_APIS=false` keeps the product in free-first posture unless explicitly opted in

## State model

### Client-side persisted state
- user profile and preferences
- watchlist and vault state
- scheduler settings
- office UI preferences
- deployment lane and surface-visibility preferences

### Server-side persisted config
- protected keys in `.env.local`
- network mode
- high-risk route enablement
- paid API opt-in
- connector policy JSON
- deployment profile

## Release and observability

Release metadata now flows from one canonical source into:
- `Nav` (GA tabs only)
- `/api/status`
- `/api/diagnostics`
- `/api/settings`
- deployment smoke tooling

The runtime baseline is monitored through:
- `docs/metrics/agent-runtime-latest.json`
- `docs/metrics/agent-runtime-history.jsonl`
- `/api/metrics/runtime-eval*`
- Settings runtime eval panel
- HQ telemetry surfaces

## Current stage

Nexus Prime is **post-migration and pre-GA hardening**.

What is already in place:
- active Next.js app
- working self-hosted web path
- Tauri desktop bootstrap
- runtime eval tooling
- route-policy enforcement
- connector policy controls
- deployment runbooks and security checklists

What remains before a cleaner GA baseline:
- final deployment and release smoke discipline
- desktop signing and trusted release verification
- broader isolation test coverage
- remaining runtime hardening items and rollout cleanup
