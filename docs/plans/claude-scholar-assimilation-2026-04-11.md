# Claude Scholar Assimilation — 2026-04-11

## Summary

Assimilated the strongest Claude Scholar ideas into Nexus as an operator-general research workflow layer, not a separate academic product. The shipped tranche extends the existing DeepTutor/MemPalace foundation with workflow-pack research stages, repo-bound project memory, source-aware artifact metadata, and study/research exact sessions under the current assistant-first shell.

## Landed

- `lib/learningMissions.ts` now supports research workflow-pack stages (`ideate`, `source-review`, `evidence-analysis`, `synthesis`, `writing`, `review-response`), new capability-backed profiles (`research-analyst`, `literature-reviewer`, `evidence-synthesizer`, `study-coach`), preferred memory compartments, and source-aware prompt guidance.
- `lib/researchSources.ts` adds the shared internal contract for workflow packs, research source types, evidence strength, and source refs so research/study features stop inventing metadata ad hoc.
- `lib/memoryMining.ts`, `app/api/memory/mine/route.ts`, `components/vault/MemoryPalacePanel.tsx`, `app/vault/page.tsx`, `lib/assistantCanonicalRegistry.ts`, and `lib/assistantSessionRegistry.ts` now support `research` and `study` compartments plus the new VAULT exact sessions `vault-memory-research` and `vault-memory-study`.
- `lib/projectMemory.ts` and `lib/memorySpineStore.ts` now maintain `.nexus/project-memory/registry.json`, `.nexus/project-memory/current.md`, `.nexus/project-memory/daily/YYYY-MM-DD.md`, `.nexus/project-memory/source-inventory.md`, and `.nexus/project-memory/synthesis-map.md`, then fold those repo-bound notes back into the existing memory spine.
- `lib/artifactContinuity.ts`, `lib/memoryPagesStore.ts`, `app/api/memory/pages/route.ts`, `components/vault/DocumentIntakePanel.tsx`, and `components/home/office/officeCommandCenterPostRun.ts` now preserve workflow-pack, repo-memory, source-type, and evidence-strength hints so research and study artifacts promote/reopen on richer deterministic continuity than plain tags alone.
- `components/home/office/OfficeCommandCenter.tsx` and `components/home/office/hqAssistantContext.ts` now route research-style learning turns into the right memory compartment and keep the resulting continuation compact and assistant-first.
- `components/resources/StudyWorkbenchConsole.tsx` and `app/skills/page.tsx` now expose the new operator jobs: frame the question, review sources, synthesize evidence, and open the exact study workspace.

## Verification

- `npm run type-check`
- `npm run verify`
- `npm run route:e2e`
- `npm run hq:e2e`
- `npm run tabs:e2e`

## Notes

- The repo-bound memory files are generated and refreshed through the local memory spine read path. They stay Nexus-native under `.nexus/project-memory/` and do not replace VAULT as the visible archive substrate.
- This tranche is adapter-only for external research sources. It ships the internal source contract and local/VAULT/document pathways first; first-class Zotero integration remains future work.
