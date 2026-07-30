# Whole-App Client Fetch Resilience

## One-sentence contract

Every active client effect that loads workspace data must handle rejection, distinguish loading from empty and failed states, preserve retry, and never mark a mutation successful after a failed HTTP response.

## Surface and scope

- INTEL Geo Delta initial and theater-change loading.
- RESOURCES Registry inventory loading.
- SKILLS Workflow Forge initial workflow/run loading and save, clone, run, and copy actions.
- Shared `DataLoadingState` semantics.
- Active TSX sources under `components/`, excluding the private `components/home/arpg/` lane.
- No new route, provider, dependency, persistent state, API key, polling loop, or background task.

## Visual, content, and interaction thesis

- **Visual:** reuse the established loading skeleton and compact surface callout materials; add no new card language or decorative layer.
- **Content:** name the dataset or action, say when it could not be loaded or completed, and provide one concrete recovery action.
- **Interaction:** loading is politely announced, failure is assertive, retry stays in place, stale async completions cannot overwrite the active surface, and Workflow Forge exposes the exact action currently in flight.

## Data and state

- Load state remains component-local as `loading`, `ready`, or `error`.
- Retry increments only a local request token and repeats the existing protected route call.
- Existing cleanup guards prevent unmounted or superseded effects from committing state.
- Failed loads keep their data surfaces unavailable instead of presenting a misleading zero-count or empty result.
- Failed Workflow Forge mutations preserve the current local workflow/run state and report the failure through the shared toast system.
- Successful Workflow Forge mutations require `response.ok` and report the exact completed action.

## Implementation

1. Give `DataLoadingState` status/live/busy semantics so shared loading feedback is announced consistently.
2. Replace Geo Delta and Registry ignored fetch chains with effect-local async loaders wrapped in `try/catch`, response checks, cleanup guards, explicit loading/error states, and retry.
3. Replace Workflow Forge's ignored `Promise.all().then()` load with the same state contract.
4. Replace its shared boolean busy state with an action-specific state; require successful responses and add concise success/failure toast feedback for save, clone, run, and copy.
5. Extend the existing secondary-surface validator with TypeScript-AST detection for ignored `fetch()` or `Promise.all()` chains that use `void` without a rejection path, plus positive and negative fixtures.

## Acceptance criteria

- Independent AST audit reports zero ignored fetch/Promise.all chains without rejection handling across active non-RPG components.
- Geo Delta, Registry, and Workflow Forge show a shared loading state, an explicit error state, and a retry action.
- Failed initial loads do not masquerade as zero results or legitimate empty state.
- Workflow Forge buttons identify and disable around the exact in-flight action, failed responses do not mutate success state, and every action reports through the shared toast system.
- The validator fails on ignored `fetch().then()` and `Promise.all().then()` fixtures while accepting `.catch()` and an effect-local guarded loader.
- `npm run surface:polish:check`, `npx tsc --noEmit`, targeted lint, `npm run verify`, `npm run build`, handoff checks, and `git diff --check` pass.

## Benefits

- Operators can distinguish slow, empty, and failed workspaces immediately.
- Network failures no longer create unhandled rejections or silent blank panels.
- Retry stays local and predictable without refreshing the route.
- Workflow mutations cannot report success from an HTTP failure.
- Future ignored client fetch chains fail the normal repository gate.

## Corrective extension: mutation response truth

The active non-RPG mutation audit found one remaining definite gap in `EspectreWifiViewer`: its POST path parsed and displayed a response body without first requiring a successful HTTP status. The correction must:

1. Reject a failed ESPectre control response before accepting its note or changing the success-facing message.
2. Keep the existing local busy lifecycle and explicit failure message; add no provider, route, state, or visual surface.
3. Extend the TypeScript-AST validator to reject unchecked literal POST, PUT, PATCH, and DELETE `fetch()` responses while accepting a checked response and dynamic methods that cannot be classified safely.
4. Prove zero unchecked literal client mutations across active TSX sources outside the private RPG lane.

This closes false-success behavior for the last source-proven client mutation and turns the fix into a whole-app regression contract.
