# Release Support Matrix

## Current policy

- **Deployment lane:** dual-track (`web` + `desktop`)
- **Supported surface policy:** `ga-only`
- **Business invariant:** Nexus remains free to use, does not charge users, and keeps paid integrations optional as BYOK only

## Supported GA surfaces

| Surface | Route | Track | Notes |
|---|---|---|---|
| HQ | `/home` | web, desktop | Primary operator surface |
| COMMAND | `/command` | web, desktop | Scheduler, mission control, ops |
| INTEL | `/intel` | web, desktop | News, strategy, world intelligence |
| ALPHA | `/alpha` | web, desktop | Markets and decision support |
| CYBER | `/cyber` | web, desktop | Cyber triage and threat monitoring |
| RECON | `/recon` | web, desktop | Free-first OSINT workflows |
| VAULT | `/vault` | web, desktop | Local archive and artifact store |
| Resources | `/resources` | web, desktop | Field manual and reference content |

## Beta surfaces

| Surface | Route | Notes |
|---|---|---|
| Signals | `/signals` | Experimental or not yet promoted to GA support |
| Ops | `/ops` | Extended ops visualization beyond supported nav |
| Security | `/security` | Supplemental security workbench |

## Internal surfaces

| Surface | Route | Notes |
|---|---|---|
| IoT | `/iot` | Internal/future-facing surface |
| Vehicle | `/vehicle` | Internal/future-facing surface |
| Skills | `/skills` | Internal skill workbench |
| Reset | `/reset` | Internal recovery utility |

## Connector policy

### Free/public defaults
- News, GDELT, conflict, CISA KEV, CVEs, prices, metals, commodities, FX, Fear & Greed, DeFi, Polymarket, weather, earthquakes, fires, Hacker News, headers

### Optional BYOK connectors
- Threat intel / OTX
- maritime / AISStream
- geo-scan enhancements
- optional upgraded market/search/AI providers

Missing optional keys must never make the supported GA product unusable.

## Runtime truth sources

These values are exposed in:
- `/api/status`
- `/api/diagnostics`
- `/api/settings`
- `components/nav/Nav.tsx`
- `scripts/release-smoke.mjs`

The canonical source of record is:
- `lib/release-matrix.json`
- `lib/releaseMatrix.ts`
