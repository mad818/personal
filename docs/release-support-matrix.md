# Release Support Matrix

## Current policy

- **Deployment lane:** dual-track (`web` + `desktop`)
- **Supported surface policy:** `ga-only`
- **Default entrypoint:** `/hq`
- **UI shell version:** `cinematic-ia-v1`
- **Business invariant:** Nexus remains free to use, does not charge users, and keeps paid integrations optional as BYOK only

## Supported GA surfaces

| Surface | Route | Track | Notes |
|---|---|---|---|
| HQ | `/hq` | web, desktop | Primary operator surface |
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
| Signals | `/labs/signals` | Experimental or not yet promoted to GA support |
| Ops | `/labs/ops` | Extended ops visualization beyond supported nav |
| Security | `/labs/security` | Supplemental security workbench |

## Internal surfaces

| Surface | Route | Notes |
|---|---|---|
| IoT | `/internal/iot` | Internal/future-facing surface |
| Vehicle | `/internal/vehicle` | Internal/future-facing surface |
| Skills | `/internal/skills` | Internal skill workbench |
| Reset | `/internal/reset` | Internal recovery utility |

## Internal workbench additions

- Workflow Forge, Registry Console, Blacksite Lab, Security Doctrine, Sweep Engine, and Geo Delta are intentionally available for operator use but are not part of the GA support promise.
- Some of those surfaces are locally persisted while others still expose seeded or derived/simulated outputs; see `docs/plans/claude-era-convergence-matrix.md` for the current truth model.
- Any route powering those workbenches should identify itself as `internal` and should not be described as GA-ready unless the convergence matrix is updated first.

## Legacy aliases

- `/home` -> `/hq`
- `/signals` -> `/labs/signals`
- `/ops` -> `/labs/ops`
- `/security` -> `/labs/security`
- `/iot` -> `/internal/iot`
- `/vehicle` -> `/internal/vehicle`
- `/skills` -> `/internal/skills`
- `/reset` -> `/internal/reset`

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
- `scripts/route-integrity.mjs`

The canonical source of record is:
- `lib/release-matrix.json`
- `lib/releaseMatrix.ts`
