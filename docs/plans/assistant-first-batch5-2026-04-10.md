# Assistant-First Batch 5 — 2026-04-10

## Goal

Finish the next assistant-first integrity tranche by unifying exact-session recovery, carrying that same precedence through auth return and Finder, and extending HQ turns with quieter archive and risky-work execution cues.

## Shipped

### 1. Canonical exact-session recovery and auth-safe continuation

- Added `lib/assistantSessionRecovery.ts` as the shared transport contract for:
  - current exact-session validation
  - fresh prepared workspace recovery
  - strongest unfinished exact session recovery
  - canonical route-default exact fallback
- `components/ui/PreparedWorkspaceAutoHeal.tsx` now consumes that shared resolver instead of maintaining its own prepared-vs-unfinished precedence logic, and it clears stale pending redirect state so the same exact-session recovery can fire reliably more than once.
- `components/auth/AuthGate.tsx` now computes the post-auth `next` target through that same resolver, so broad route returns can restore the strongest valid exact session instead of dropping back to the broad shell.
- `components/resources/SessionFinderConsole.tsx` now opens one strongest exact working session by default, with the broader overview route moved behind a low-noise overflow path instead of presenting two equal-weight launch buttons.
- `lib/assistantSessionMemory.ts` now exposes `findStrongestUnfinishedSessionForRoute(...)` so capability-aware route recovery can reuse the same unfinished-session ranking instead of re-scoring it ad hoc.

### 2. Passive archive continuity cues

- Added `lib/assistantExecutionSignals.ts` to centralize:
  - compact archive continuity cues
  - quiet risky-work detection
  - bounded execution-context attachment
- `components/home/office/hqAssistantContext.ts` now uses those signals to surface one compact archive cue only when:
  - the turn clearly resumes prior durable archive or reverse-engineering work, or
  - the assistant has already staged a meaningful archive repair/export lane.
- `components/home/office/HQTerminalSection.tsx` renders the new archive cue as a compact note, keeping archive behavior visible only when it materially helps the turn.

### 3. Automatic spec-attached execution seeding

- `components/home/office/hqAssistantContext.ts` now treats risky/high-blast-radius work as an execution-attached path instead of generic repo-help:
  - risky-work detection combines intent, capability risk, file path, system ownership, and blast-radius language
  - when risky work is detected, prepared workspaces now prefer:
    - Impact seed
    - System map
    - Spec
    - Playbook
    instead of falling back to a generic route default
- `components/home/office/OfficeCommandCenter.tsx` and `components/home/office/types.ts` now preserve these new assistant cues on chronicle messages, while keeping the visible reply natural and compact.

### 4. Harness and regression coverage

- Added unit coverage in:
  - `__tests__/assistantSessionRecovery.test.ts`
  - `__tests__/assistantExecutionSignals.test.ts`
  - expanded `__tests__/assistantSessionMemory.test.ts`
- Added browser coverage in `tests/e2e/route-contract.spec.ts` for auth-return restoration into the strongest exact session.
- Updated `tests/e2e/hq-shell.spec.ts` to assert the newer assistant-first exact-session landing behavior where it is now canonical.
- Extended `scripts/eval-agent-runtime.js` to check:
  - canonical assistant session recovery
  - assistant execution/archive cues
  - richer route-capability continuity matching

## Verification

Ran serially:

- `npm run type-check`
- `npm run verify`
- `npm run route:e2e`
- `npm run hq:e2e`
- `npm run build`
- `npm run eval:agent-runtime:ci`

All passed.

Additional note:

- `npm run test:unit -- ...` could not run in this environment because the local `vitest` binary is not currently executable here (`'vitest' is not recognized as an internal or external command`), even though the targeted test files compile and the browser/runtime verification stack is green.

## Follow-on

- Continue `BF4C` by replacing more repeated helper copy with state-led inline guidance, especially degraded provider/retrieval/workspace posture.
- Push the canonical exact-session recovery layer through more manual pivots so remaining route/session helpers become thinner consumers instead of carrying any local precedence logic.
- Expand passive archive cues from continuity-only into more artifact-quality-specific hints when the current turn would benefit from route/tag repair or promotion.
