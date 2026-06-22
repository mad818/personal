# Nexus Ideas Assimilation Wave 4

Status: active execution map  
Date: 2026-06-20

Closes the remaining intake-queue ideas after Waves 2–3.

## Baseline (post Wave 3)

- Shipped: homelable, geodeep, lightrag, claude-mem, context-optimizer, aeon
- Parity: 24 matrices, 0 pending
- Gate: `npm run assimilation:wave3:check`

## Wave 4 scope — close the intake queue

| ID | Lane | Deliverable |
|----|------|-------------|
| **mcporter** | MIS-2 MCP bridge | Descriptor-only mcporter-aligned contract + COMMAND status card |
| **openevolve** | AP-2 eval improver | Bounded variant keep/reject UX on runtime experiment lane |
| **geocoding-playground** | OPS-4 geo | `/api/geocode` proxy + RECON geocoding playground card |
| **trafficlab-3d** | OPS-4 dual view | Tactical/overview dual panel + trajectory metrics on INTEL map |
| **gnhf** | MIS-1 overnight | Overnight mission handoff brief on COMMAND |

## Required output per item

1. `docs/ideas/source-parity/<slug>.json` → `complete`
2. Focused lib + UI slice in existing seams
3. `scripts/validate-*-assimilation.mjs`
4. `npm run assimilation:wave4:check` under `npm run verify`
5. Intake queue item → `shipped`

## Explicit exclusions

- No generic `/api/mcp` execution surface
- No autonomous self-modifying production runtime (openevolve)
- No DuckDB-WASM / Overture Parquet bundling (geocoding-playground)
- No CCTV/YOLO homography pipeline (trafficlab-3d)
- No unbounded overnight agents without mission review contract (gnhf)

## After Wave 4

- WAVE-1 remainder: correction memory provenance UX, privacy receipts UI, Memento cycle
- WAVE-3 remainder: papers tooling, repo assimilation briefs
- WAVE-7/8: design tokens, GA runtime proof per route
