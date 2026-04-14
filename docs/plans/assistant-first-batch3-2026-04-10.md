# Assistant-First Batch 3 — 2026-04-10

## Goal

Land the first Phase 3 assistant-first behavior batch without adding new top-level UI:

- canonical assistant capability routing
- indexed internal retrieval over existing Nexus resources
- protected live-query verification for HQ latest/current turns
- quieter HQ chronicle rendering and reduced composer clutter
- stronger static harness coverage for assistant-first drift

## Shipped

1. Added `lib/assistantCapabilityRegistry.ts` as the canonical assistant-facing registry for:
   - route aliases
   - segmented exact-session view mappings
   - capability-to-surface/system/spec/playbook associations
   - default exact workspace targets per capability

2. Added `lib/assistantIndexedRetrieval.ts` so HQ context attachment is now driven by indexed capability documents across:
   - Surfaces
   - System Design
   - Playbooks
   - Specs
   - Impact

3. Added `app/api/assistant/retrieve/route.ts` plus `lib/assistantLiveRetrieval.ts`:
   - internal feed-first verification for markets, news, and cyber
   - degraded open-web fallback for otherwise unhandled current/live queries
   - explicit unverified fallback contract instead of fabricated certainty

4. Wired the new behavior through HQ:
   - `hqAnswerStyle.ts` now distinguishes `assistant` / `evidence` / `workflow`
   - `OfficeCommandCenter.tsx` preflights live retrieval for current/latest turns
   - `hqAssistantContext.ts` now uses indexed retrieval + canonical capabilities
   - `HQTerminalSection.tsx` hides repeated prompt/workflow rows once chat is active and suppresses persisted tool trace on assistant-first replies

5. Extended guardrails:
   - `exactSessionLinks.ts` now consumes canonical route/session mappings from the capability registry
   - `scripts/eval-agent-runtime.js` now checks the new assistant response, registry, and retrieval layers

## Verification target

- `npm run type-check`
- `npm run verify`
- `npm run route:e2e`
- `npm run hq:e2e`
- `npm run build`
- `npm run handoff:write`
