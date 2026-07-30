# Multi-Phase Agent Hardening Sprint

## Goal
Execute beyond Phase A by implementing concrete slices of:
- Phase B: mandatory verification on write-impact runs
- Phase C: context-budget controls and composition reporting
- Phase D: groundwork for measurable run quality signals

## Scope
- `lib/agent.ts`
  - Add per-run diagnostics (`runId`, phase timing, failure cause).
  - Detect write-impact tool runs and require verification before finalizing success.
  - Emit verification result details into runtime state.
- `app/api/verify/route.ts` (new)
  - Verification adapters:
    - `typecheck` -> `npx tsc --noEmit`
    - `lint` -> `npm run lint -- --max-warnings=0`
    - `route_smoke` -> checks `/api/health`, `/api/status`, `/api/project?section=tree`
  - Return structured results.
- `store/useStore.ts`
  - Add `agentRuntime` state shape for run diagnostics + verification status.
- `components/home/office/HQTerminalSection.tsx`
  - Surface verified or degraded runtime outcomes in the HQ chronicle.
- `lib/liveContext.ts`
  - Add context budget policy and composition report helper.

## Non-goals
- No feature removals.
- No destructive behavior changes to existing chat tools.
- No CI merge gating changes in this sprint (only runtime foundation).

## Acceptance criteria
1. Write-impact runs can only finish as fully successful when verification passes.
2. Runtime state includes run id, current status, and failure cause when relevant.
3. HQ telemetry visibly indicates degraded vs verified run outcomes.
4. Live context builder supports budget-aware compaction and report output.
5. `npx tsc --noEmit` passes after changes.
