# Assistant-First Batch 6 — Shared Guidance, Canonical Registry, and Continuity Metadata

Date: 2026-04-10

## Why this batch existed

The previous assistant-first batches left three seams partially fragmented:

1. HQ still stored and rendered separate cue fields (`continuity`, `archive`, `execution`, `scope drift`) instead of one shared guidance contract.
2. Route aliases, resource id repairs, and exact-session normalization still depended on a few scattered constant sets instead of one canonical assistant registry layer.
3. Durable archive artifacts still relied on route-specific heuristics for continuity and promotion, especially outside the existing reverse-engineering lane.

This batch closes those seams without adding more top-level UI.

## What changed

### 1. Shared assistant guidance contract

- Added [`lib/assistantGuidance.ts`](../../lib/assistantGuidance.ts) to normalize, de-duplicate, and priority-sort assistant guidance items.
- Replaced separate HQ cue fields with `assistantGuidance[]` in [`components/home/office/types.ts`](../../components/home/office/types.ts).
- Updated [`components/home/office/hqAssistantContext.ts`](../../components/home/office/hqAssistantContext.ts) to merge continuation, archive, execution, and scope-drift signals into one sorted guidance list.
- Updated [`components/home/office/OfficeCommandCenter.tsx`](../../components/home/office/OfficeCommandCenter.tsx) to persist the shared guidance contract on agent replies.
- Updated [`components/home/office/HQTerminalSection.tsx`](../../components/home/office/HQTerminalSection.tsx) to render guidance generically instead of carrying four separate UI branches.

### 2. Canonical assistant/session registry sweep

- Added [`lib/assistantCanonicalRegistry.ts`](../../lib/assistantCanonicalRegistry.ts) as the canonical registry layer for:
  - route aliases
  - segmented `focus/view` ownership
  - Resources view aliases and id normalization
  - VAULT focus/filter normalization
- Updated [`lib/assistantCapabilityRegistry.ts`](../../lib/assistantCapabilityRegistry.ts) to consume and re-export the canonical route rules instead of defining its own copy.
- Updated [`lib/exactSessionLinks.ts`](../../lib/exactSessionLinks.ts) so Resources and VAULT normalization now flow through the canonical registry helpers.
- Updated [`lib/assistantSessionRecovery.ts`](../../lib/assistantSessionRecovery.ts) to use canonical route-path normalization during prepared/unfinished/default session recovery.

### 3. Passive archive continuity metadata

- Added [`lib/artifactContinuity.ts`](../../lib/artifactContinuity.ts) with one passive metadata shape for durable artifacts:
  - `artifactClass`
  - `continuityId`
  - `continuityTag`
  - `sourceQuery`
  - `capability`
  - `promotionKind`
  - `qualitySignals`
- Updated [`lib/memoryPagesStore.ts`](../../lib/memoryPagesStore.ts) so compiled memory pages now derive and persist continuity metadata automatically, including continuity tags for later reopening/linking.
- Updated [`components/vault/vaultGraphPageUtils.ts`](../../components/vault/vaultGraphPageUtils.ts) and [`components/vault/CompiledMemoryPagesPanel.tsx`](../../components/vault/CompiledMemoryPagesPanel.tsx) to carry that continuity metadata through VAULT.
- Reverse-engineering brief promotion is now duplicate-safer by matching continuity identity before creating a new higher-order artifact.

### 4. Harness coverage

- Added [`__tests__/assistantGuidance.test.ts`](../../__tests__/assistantGuidance.test.ts) for shared guidance priority/dedupe.
- Added [`__tests__/assistantCanonicalRegistry.test.ts`](../../__tests__/assistantCanonicalRegistry.test.ts) for resource/vault normalization.
- Added [`__tests__/artifactContinuity.test.ts`](../../__tests__/artifactContinuity.test.ts) for RE and research continuity metadata.
- Extended [`__tests__/assistantExecutionSignals.test.ts`](../../__tests__/assistantExecutionSignals.test.ts) with guidance-kind assertions.
- Extended [`tests/e2e/route-contract.spec.ts`](../../tests/e2e/route-contract.spec.ts) with stale resource alias normalization cases.
- Updated [`scripts/eval-agent-runtime.js`](../../scripts/eval-agent-runtime.js) so the assistant runtime eval now checks the shared guidance contract and canonical registry layer directly.

## Verification

Passed:

- `npm run type-check`
- `npm run verify`
- `npm run route:e2e`
- `npm run hq:e2e`
- `npm run eval:agent-runtime:ci`
- `npm run build`
- `npm run handoff:write`

## Follow-on work

1. Reuse the shared `assistantGuidance[]` contract in more heavy surfaces so degraded posture and archive cues stop being HQ-only.
2. Extend passive continuity metadata into non-compiled durable notes and second-brain export so archive linking is broader than the compiled-memory lane.
3. Continue collapsing any remaining helper-specific normalization into the canonical assistant registry layer until route/session repair has one true path everywhere.
