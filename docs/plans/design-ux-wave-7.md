# Nexus Design UX Wave 7

Status: shipped; verification closure corrected 2026-07-14
Date: 2026-06-20

Closes **WAVE-7-DESIGN-UX** — design-token cleanup and taste-contract audit for assimilation slices.

## Map

| ID       | Lane        | Deliverable                                                                        |
| -------- | ----------- | ---------------------------------------------------------------------------------- |
| **UX-1** | `DESIGN.md` | Wire unused semantic colors into component recipes (0 design:lint color warnings)  |
| **UX-2** | Runtime     | `lib/designTokens.ts` — semantic CSS var helpers for status/severity tones         |
| **UX-3** | Gate        | `npm run design:taste:check` through `npm run design:check` under `npm run verify` |

## Migrated surfaces (assimilation waves 3–5)

Wave 3–5 cards that used drift hex (`#10b981`, `#ef4444`, `#f59e0b`, `#60a5fa`, `#818cf8`, `#fff`) now import `lib/designTokens.ts`:

- `OpsDensityAlertStrip`, `OpsDualViewPanel`, `NetworkTopologyPanel`
- `MementoCycleStrip`, `CorrectionMemoryProvenanceStrip` (already token-clean)
- `PrivacyShieldReceiptCard`, `OvernightMissionCard`, `McpBridgeStatusCard`
- `PapersResearchPanel`, `GeocodingPlaygroundCard`, `RepoAssimilationQueueCard`
- `lib/networkTopology.ts` (`topologyStatusColor`)

## Explicit exclusions

- No global palette redesign or tab shell rewrite
- Pixel-art agent palette (`components/home/office/palette.tsx`) stays isolated
- Legacy panels outside the assimilation slice are out of scope for this wave

## Gate

```bash
npm run design:taste:check   # semantic-token usage + zero-warning taste audit
npm run design:check         # generated-output sync + design:taste:check
npm run verify               # starts with design:check
```

The historical `assimilation:wave7:check` alias was removed as the assimilation chain advanced. The current canonical gate is `design:check`, which preserves the same Wave 7 design contract inside the full verification lane.

## After Wave 7

- WAVE-8 GA runtime proof per route
- Operational: Dependabot, CP2.4 live gate, signing
