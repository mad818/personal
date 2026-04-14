# Assistant-First Batch 4 — 2026-04-10

## Goal

Push the assistant-first program through the next large behavior chunk without adding more UI: stronger unfinished-session continuity, quieter exact-session launchers, deterministic reverse-engineering promotion, and lightweight spec-drift cues.

## Shipped

### 1. Stronger continuity metadata

- Extended unfinished session memory in `lib/assistantSessionMemory.ts` with:
  - `capability`
  - `artifactClass`
  - `continuationValue`
- Wired those fields through HQ send/runtime flow in:
  - `components/home/office/hqAssistantContext.ts`
  - `components/home/office/OfficeCommandCenter.tsx`
  - `components/home/office/types.ts`
  - `components/home/office/HQTerminalSection.tsx`
- Continuation cues now surface quietly in the chronicle when the current turn is clearly resuming unfinished work.

### 2. Lower action density, one strongest continuation visible

- Added overflow-aware primary/secondary exact-session rendering to `components/ui/ActionSessionCluster.tsx`.
- Reduced visible action density by limiting primary visible exact-session actions to one across major Resources/VAULT surfaces:
  - `components/resources/PlaybooksConsole.tsx`
  - `components/resources/SpecDrivenConsole.tsx`
  - `components/resources/SystemDesignConsole.tsx`
  - `components/resources/SurfaceCapabilitiesConsole.tsx`
  - `components/resources/ProjectImpactConsole.tsx`
  - `components/vault/CompiledMemoryPagesPanel.tsx`
  - `components/vault/VaultGraphFocusPanel.tsx`
  - `components/vault/VaultStewardshipPanel.tsx`
- VAULT stewardship now uses one shared exact-session cluster instead of separate “recommended” and “repair” button rows.

### 3. Deterministic RE continuity and duplicate-safe promotion

- Added deterministic reverse-engineering continuity identity/tag generation in `lib/binaryTriage.ts`.
- `components/vault/CompiledMemoryPagesPanel.tsx` now reopens an existing RE brief by continuity tag before falling back to title matching.
- `lib/secondBrainExport.ts` now includes deterministic related-note sections so exported second-brain notes preserve continuity instead of behaving like isolated files.

### 4. Spec-attached scope drift cues

- Added `scopeSignals` metadata plus `detectSpecScopeDrift(...)` in `lib/specDrivenDevelopment.ts`.
- HQ assistant context now computes and quietly passes scope-drift cues for active spec-attached turns.
- Chronicle rendering now shows scope drift as a compact caution note instead of widening silently.

### 5. Harness coverage

- Added or expanded focused coverage in:
  - `__tests__/assistantSessionMemory.test.ts`
  - `__tests__/specDrivenDevelopment.test.ts`
  - `__tests__/binaryTriage.test.ts`
  - `tests/e2e/route-contract.spec.ts`
- Extended `scripts/eval-agent-runtime.js` to check:
  - assistant continuity memory
  - reverse-engineering continuity
  - spec drift cues

## Verification

- `npm run type-check`
- `npm run verify`
- `npm run route:e2e`
- `npm run hq:e2e`
- `npm run build`
- `npm run eval:agent-runtime:ci`

All passed when run serially.

## Follow-on

- Finish `BF2C`: harden exact-session transport across more manual-to-assistant pivots and auth refresh recovery.
- Keep reducing visible action density where continuity is already strong, especially scheduler and remaining VAULT repair/detail cards.
- Extend spec-attached execution from drift cues into stronger automatic risky-work attachment for Impact/System/Playbooks during HQ repo-help turns.
