# Post-Redesign Behavior Cleanup Batch 1 — 2026-04-10

## What shipped

- Expanded durable artifact continuity in `lib/artifactContinuity.ts` so compiled artifacts now carry route origin, workflow class, mission hints, related-link seeds, and a shared related-artifact ranking function.
- Added shared deterministic promotion rules in `lib/artifactPromotion.ts` for reverse-engineering and research artifacts, including duplicate-safe reopen behavior before creating a higher-order brief.
- Reworked `lib/secondBrainExport.ts`, `app/vault/page.tsx`, and `components/vault/VaultExport.tsx` so second-brain export consumes compiled durable artifacts, continuity-first related-note ranking, and research / reverse-engineering continuity indexes.
- Moved VAULT durable-page promotion in `components/vault/CompiledMemoryPagesPanel.tsx` onto the shared promotion service, broadened it from RE-only logic to RE + research, and added continuity-ranked related-note reopen cues in the page detail view.
- Finished the final density cleanup:
  - `components/ui/ActionSessionCluster.tsx` now supports compact button-only primary rendering.
  - Dense session clusters in Resources and VAULT now hide primary detail cards by default.
  - `components/resources/PlaybooksConsole.tsx` and `components/resources/SpecDrivenConsole.tsx` moved copy/download helpers behind `Use outside Nexus`.
  - `components/ui/CronSchedulerJobsSection.tsx` now keeps one visible operational state control and moves destructive/export actions under `Manage job`.
  - `components/home/office/HQTerminalSection.tsx` removed the last standing composer helper row that duplicated chronicle guidance.

## Verification

- `npm run type-check`
- `npm run verify`
- `npm run build`
- `npm run route:e2e`
- `npm run hq:e2e`
- `npm run tabs:e2e`

## Known environment note

- `npm run test:unit` could not run in this machine state because the local `vitest` executable is missing from `node_modules/.bin`, even though the new unit files were added. Browser, type, lint, route, and build verification were used as the authoritative proof for this batch.
