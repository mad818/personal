# Whole-App Protected Mutation Response Truth

## One-sentence contract

Every literal client mutation through native `fetch()` or the canonical `apiFetch()` wrapper must require a successful HTTP response before committing success state, deliberately forward the raw response, or be removed when no protected route exists.

## Surface and scope

- CYBER vulnerability review generation.
- RESOURCES Voice Lab project and profile creation.
- Settings persistence.
- Shared cron handoff, registry-artifact, and runtime-evaluation background writes.
- VAULT second-brain capture, decision, audit, and librarian filing.
- HQ article filing and terminal lesson logging.
- The secondary-surface TypeScript-AST validator and active TSX sources under `app/` and `components/`, excluding the private `components/home/arpg/` lane.
- No new route, provider, dependency, persistent state, API key, visual system, or background task.

## Visual, content, and interaction thesis

- **Visual:** preserve every existing workplane and control; reuse current inline errors, busy labels, and compact toast signals without adding panels, banners, or modal language.
- **Content:** name the durable action that failed, avoid implying persistence, and leave the operator with the original input or pending item available for retry.
- **Interaction:** commit success-facing state only after `response.ok`, prevent duplicate submissions while foreground actions are in flight, and let additive background writes degrade without falsifying the primary scheduler or evaluation result.

## Data and state

- Foreground actions retain their current component-local input, pending lesson, or filing form when the protected route rejects the request.
- HTTP failure flows through each surface's existing error boundary or shared toast system; it does not produce saved, filed, logged, or generated state.
- Background cron, registry, and evaluation writes remain nonblocking, but refresh or downstream work occurs only after a successful response.
- Voice Lab project and profile creation remains explicitly local because `/api/voice/projects` and `/api/voice/profiles` do not exist; the dead persistence calls are removed rather than converted into new routes.
- No private payload is added to toast copy, logs, URLs, or tracked state.

## Implementation

1. Require `response.ok` across the eleven real protected mutation paths found by the independent `apiFetch()` audit.
2. Remove the two Voice Lab calls to nonexistent project/profile routes and retain their current local store behavior.
3. Make HQ article filing, lesson logging, and VAULT filing preserve pending input and expose retryable failure feedback; add action-specific busy state where duplicate submission is possible.
4. Keep additive cron, registry, and runtime-evaluation writes silent but status-aware so their failures cannot advance dependent work.
5. Extend the existing mutation AST gate from native `fetch()` to canonical `apiFetch()`, with positive and negative fixtures for both call types.

## Acceptance criteria

- An independent audit reports zero unchecked, ignored, or unforwarded literal `fetch()` and `apiFetch()` mutations across active non-RPG TSX sources.
- All thirteen audited `apiFetch()` gaps are closed: eleven check HTTP status and two dead Voice Lab persistence calls are removed.
- HQ article filing, lesson logging, and VAULT filing announce success only after a successful response, retain retry state after failure, and prevent duplicate foreground submission.
- Vulnerability review, Settings, second-brain, cron, registry, and runtime-evaluation paths do not parse, refresh, or commit success-facing state after failed HTTP responses.
- Validator fixtures reject unchecked assigned, ignored awaited, and unawaited literal mutations while accepting checked, deliberately forwarded, and dynamic-method calls.
- `npm run surface:polish:check`, `npx tsc --noEmit`, targeted lint, `npm run verify`, `npm run build`, handoff checks, and `git diff --check` pass.

## Benefits

- Operators can trust that filed, logged, saved, and generated labels reflect server acceptance rather than request initiation.
- Failed protected writes remain recoverable because pending inputs and retry controls stay intact.
- Voice Lab stops making guaranteed-failure calls to routes that do not exist while preserving local-first creation.
- Additive background integrations remain resilient without contaminating authoritative primary results.
- Future regressions through either supported client fetch path fail the normal repository gate.
