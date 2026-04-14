# Assistant-First Batch 1 — HQ Context Resolver + Prepared Workspaces

## Goal

Land the first real implementation slice of the Assistant-First Nexus Plan without adding more control clutter:

- HQ should answer like the primary product surface
- internal Resources intelligence should work through chat quietly
- the next best workspace should be staged in the background instead of hard-routed mid-turn
- stale or broad assistant-prepared launches should self-heal to the strongest exact session

## Scope

1. Extend HQ intent handling beyond answer-style alone so the shell can distinguish:
   - conversation
   - product help
   - repo work
   - live/current
   - research
   - workspace action
   - memory recall
   - workflow
2. Add a ranked assistant context resolver over:
   - Surfaces
   - System Design
   - Specs
   - Playbooks
   - Impact
3. Add prepared-workspace state to store and use it from HQ replies instead of forcing broad route jumps.
4. Add a shared prepared-workspace self-heal so route opens normalize into the staged exact session.
5. Keep the visible UX light:
   - no new permanent dashboard rows
   - one strongest continuation when HQ is confident
   - internal reasoning still hidden

## Planned touch points

- `components/home/office/hqAnswerStyle.ts`
- `components/home/office/OfficeCommandCenter.tsx`
- `components/home/office/HQTerminalSection.tsx`
- `components/home/office/types.ts`
- `store/useStore.ts`
- `lib/exactSessionLinks.ts`
- `lib/resourceSessionRegistry.ts`
- `lib/engineeringPlaybooks.ts`
- `lib/specDrivenDevelopment.ts`
- `lib/systemDesignMaps.ts`
- `lib/surfaceCapabilities.ts`
- new assistant-context / prepared-session helpers
- route-level prepared-session self-heal component

## Acceptance

- Simple HQ prompts still answer directly with no audit-console framing.
- Repo-help and product-help turns can pull the strongest internal context without the user opening Resources manually.
- HQ can stage one strongest workspace after a reply without forcing a route change.
- Opening a broad prepared route heals to the staged exact session automatically.
- Prepared-session links remain canonical and safe under stale alias/focus conditions.
- Existing focus strips, mission continuity, and route auto-heals continue to work.
