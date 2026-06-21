# Nexus GA Runtime Proof Wave 8

Status: shipped  
Date: 2026-06-20

Closes **WAVE-8-GA-RUNTIME-PROOF** — structural runtime hardening proofs per GA tab, wired through `npm run ga:surfaces:check`.

## Map (improve what already exists)

| ID | Surface | Smoke proof | Degraded proof |
|----|---------|-------------|----------------|
| **GA-1** | `/hq`, `/home` | HQ shell, AuthGate, Memento + provenance strips | `OfficeCommandCenter` try/catch fetch guards |
| **GA-2** | `/command` | Network health, privacy receipt, overnight handoff | `NetworkHealth` timeout + silent catch |
| **GA-3** | `/intel` | Deferred segment, density alerts, papers lane | `FearGreedLoader` `fg.value` + `fg.label`; panel try/catch |
| **GA-4** | `/alpha` | Prices loader, signal chambers | `BuyBot` provider-unavailable copy; `ForecastLabCard` degraded quality |
| **GA-5** | `/cyber` | Triage + deferred chamber + AI exposure | `TriageView` try/catch; advisory boundary in spec |
| **GA-6** | `/recon` | OSINT + passive DNS + assimilation cards | `ReconLookup` per-panel catch + BYOK tags |
| **GA-7** | `/vault` | Compiled pages + memory ask + intake | `MemoryAskPanel` unavailable message; panel try/catch |
| **GA-8** | `/resources` | Workbench + impact console | `ProjectImpactConsole` unavailable / retry copy |

## Gate

```bash
npm run ga:surfaces:check          # spec contracts + runtime structural proofs
npm run assimilation:wave8:check   # wave7 + ga surfaces
```

## Explicit exclusions

- No live HTTP smoke (that stays `cp2:local:launch-gate` with managed runtime + token)
- No new tabs or feature scope
- No RPG (`/hq` ARPG), phone/LAN, or staged-host release proof

## After Wave 8

- WAVE-1 sandbox adapter depth
- WAVE-3 repo compare briefs / deeper RAG
- WAVE-5 VAULT retrieval polish
- Operational: Dependabot, CP2.4 live gate, signing
