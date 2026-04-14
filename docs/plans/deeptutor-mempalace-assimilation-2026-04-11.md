# DeepTutor + MemPalace Assimilation — Batch 1 (2026-04-11)

## Summary

This batch assimilates the strongest Nexus-fit ideas from DeepTutor and MemPalace without adding new GA tabs:

- guided learning now runs inside the existing HQ assistant flow
- local-first memory mining now feeds HQ and VAULT through shared durable contracts
- study artifacts compound inside VAULT instead of spinning up a parallel tutor product

The result is assistant-first tutoring plus passive memory reuse, both grounded in existing exact-session, continuity, and promotion systems.

## Implemented

### 1. Shared learning and memory-mining contracts

- Added [lib/learningMissions.ts](https://github.com/mad818/personal/blob/main/lib/learningMissions.ts) with:
  - `LearningMissionMode`
  - `TutorProfileId`
  - `TutorProfile`
  - `LearningMission`
  - guided-learning prompt detection and compact mission prompt blocks
- Added [lib/memoryMining.ts](https://github.com/mad818/personal/blob/main/lib/memoryMining.ts) with:
  - `MemoryCompartment`
  - `MinedMemory`
  - compartment detection for `project`, `conversation`, and `general`
  - continuity-aware local memory mining and prompt blocks
- Added [app/api/memory/mine/route.ts](https://github.com/mad818/personal/blob/main/app/api/memory/mine/route.ts) as the local-only mined-memory route backed by the memory spine.

### 2. HQ guided-learning behavior

- [components/home/office/hqAnswerStyle.ts](https://github.com/mad818/personal/blob/main/components/home/office/hqAnswerStyle.ts) now detects a dedicated `learning` answer style.
- [components/home/office/hqAssistantContext.ts](https://github.com/mad818/personal/blob/main/components/home/office/hqAssistantContext.ts) now:
  - detects learning missions
  - selects tutor-backed prepared workspaces
  - emits compact study guidance
- [components/home/office/OfficeCommandCenter.tsx](https://github.com/mad818/personal/blob/main/components/home/office/OfficeCommandCenter.tsx) now:
  - mines local memory for learning and recall turns
  - injects guided-learning and mined-memory blocks into the assistant prompt
  - classifies study/memory continuations for unfinished-session reuse

### 3. VAULT study artifacts and memory-palace lanes

- [lib/artifactContinuity.ts](https://github.com/mad818/personal/blob/main/lib/artifactContinuity.ts) now supports:
  - `learning_note`
  - `study_brief`
  - `review_sheet`
  - `quiz_set`
  - memory compartment + learning mission metadata
- [lib/artifactPromotion.ts](https://github.com/mad818/personal/blob/main/lib/artifactPromotion.ts) now promotes learning notes into duplicate-safe study briefs using deterministic rules.
- [lib/memoryPagesStore.ts](https://github.com/mad818/personal/blob/main/lib/memoryPagesStore.ts) and [app/api/memory/pages/route.ts](https://github.com/mad818/personal/blob/main/app/api/memory/pages/route.ts) now persist learning/tutor/compartment metadata through the durable page path.
- [components/vault/CompiledMemoryPagesPanel.tsx](https://github.com/mad818/personal/blob/main/components/vault/CompiledMemoryPagesPanel.tsx) now recognizes and presents the new study artifact classes.
- Added [components/vault/MemoryPalacePanel.tsx](https://github.com/mad818/personal/blob/main/components/vault/MemoryPalacePanel.tsx), and [app/vault/page.tsx](https://github.com/mad818/personal/blob/main/app/vault/page.tsx) now exposes focused `project`, `conversation`, and `general` memory compartments inside the existing VAULT shell.

### 4. Resources and Skills control plane

- [components/resources/StudyWorkbenchConsole.tsx](https://github.com/mad818/personal/blob/main/components/resources/StudyWorkbenchConsole.tsx) adds guided-learning entrypoints in Resources.
- [components/resources/ResourcesWorkbench.tsx](https://github.com/mad818/personal/blob/main/components/resources/ResourcesWorkbench.tsx), [app/resources/page.tsx](https://github.com/mad818/personal/blob/main/app/resources/page.tsx), and [lib/surfaceRedesignRegistry.ts](https://github.com/mad818/personal/blob/main/lib/surfaceRedesignRegistry.ts) now support the `study` workbench view.
- [app/skills/page.tsx](https://github.com/mad818/personal/blob/main/app/skills/page.tsx) now exposes guided-learning controls and direct memory-compartment openings in the existing internal Skills surface.

### 5. Canonical routing and continuity alignment

- [lib/assistantCapabilityRegistry.ts](https://github.com/mad818/personal/blob/main/lib/assistantCapabilityRegistry.ts), [lib/assistantSessionRegistry.ts](https://github.com/mad818/personal/blob/main/lib/assistantSessionRegistry.ts), [lib/assistantSessionMemory.ts](https://github.com/mad818/personal/blob/main/lib/assistantSessionMemory.ts), and [lib/assistantCanonicalRegistry.ts](https://github.com/mad818/personal/blob/main/lib/assistantCanonicalRegistry.ts) now treat guided learning and memory-palace flows as first-class assistant capabilities and exact sessions.
- [lib/secondBrainExport.ts](https://github.com/mad818/personal/blob/main/lib/secondBrainExport.ts) now exports study continuity alongside existing archive continuity.

## Tests Added

- [__tests__/learningMissions.test.ts](https://github.com/mad818/personal/blob/main/__tests__/learningMissions.test.ts)
- [__tests__/memoryMining.test.ts](https://github.com/mad818/personal/blob/main/__tests__/memoryMining.test.ts)
- [__tests__/artifactContinuity.test.ts](https://github.com/mad818/personal/blob/main/__tests__/artifactContinuity.test.ts)
- [__tests__/artifactPromotion.test.ts](https://github.com/mad818/personal/blob/main/__tests__/artifactPromotion.test.ts)
- [tests/e2e/hq-shell.spec.ts](https://github.com/mad818/personal/blob/main/tests/e2e/hq-shell.spec.ts) now includes guided-learning UI coverage
- [tests/e2e/route-contract.spec.ts](https://github.com/mad818/personal/blob/main/tests/e2e/route-contract.spec.ts) now includes memory-palace exact-session coverage
- [tests/e2e/tab-surfaces.spec.ts](https://github.com/mad818/personal/blob/main/tests/e2e/tab-surfaces.spec.ts) now includes the Resources study lane and VAULT project-memory lane

## Verification

Passed:

- `npm run type-check`
- `npm run verify`

Attempted but still blocked here by the current auth/toprail browser baseline:

- `npm run hq:e2e`
- `npm run route:e2e`
- `npm run tabs:e2e`

The new learning/memory assertions were added successfully, but the suites are still failing before they reach most app assertions because the browser lands without the expected authenticated shell chrome (`toprail-brand`) and several route tests still fall into `/auth/connect`. That blocker predates this assimilation batch and keeps `DTM5` open until the Playwright auth shell is green again.

## Notes

- No public routes, tabs, or query params were added.
- All AI calls remain routed through the existing Nexus AI boundary.
- Guided learning stays capability-backed and assistant-first rather than becoming a separate classroom UI.
- Memory mining stays local-first and compartmented rather than turning into a manual memory-management workflow.
