# NO-MISTAKES-RELEASE-GATE

## What it does

Adds a Nexus-owned, read-only release gate that requires operator intent, runs the existing local verification stack, inspects Git readiness, and reports remote or physical acceptance blockers without pushing, opening pull requests, editing files, or starting services.

## Surface

- Operator CLI: `npm run release:gate -- --intent "..."`
- Quick local posture: add `--quick`
- Machine-readable output: add `--json`
- Static and runtime acceptance: `npm run release:gate:check`
- No new app route, API route, persisted Zustand state, provider call, or UI panel

## Inputs and data flow

1. Accept an explicit non-empty intent string from the operator.
2. Read local Git branch, upstream, ahead/behind, and worktree status.
3. Run `git diff --check`, `npm run handoff:check`, and `npm run ops:preflight`.
4. In the default full mode, also run `npm run verify`.
5. Return a sanitized summary with local check results, readiness outcome, blockers, and the next operator action.

The intent is used only for the current process, is never printed verbatim in JSON or human output, and is not written to disk.

## Source assimilation boundary

The feature adapts the useful release-discipline patterns from `kunchenguid/no-mistakes` at release `v1.34.0`: intent-aware validation, ordered gates, human control, deterministic commands, and explicit outcomes. This read-only gate does not create disposable worktrees; the separate `npm run verify:isolated` command owns that bounded behavior. Nexus does not install the upstream Go daemon, add a Git proxy remote, invoke external coding agents, auto-fix code, push branches, create pull requests, monitor CI, rebase, or merge.

## State

No durable application state is introduced. The CLI reads the current repository and emits process-local output only.

## Edge cases

- Missing intent exits with usage status `2` before checks run.
- Dirty worktree blocks publish readiness but still reports the safe next action.
- Missing upstream or unreadable ahead/behind state remains a manual blocker.
- Cached upstream metadata is never described as live remote truth.
- Any failed local check blocks the gate and includes only a bounded output tail.
- `--quick` cannot claim full verification.
- Remote push, GitHub CI confirmation, and physical phone/PWA acceptance remain explicit operator actions.

## Acceptance

- The focused runtime validator proves full-pass, quick-pass, dirty-tree, local-check-failure, and unknown-upstream classifications.
- The static validator proves the spec, package scripts, source-parity record, no-mutation guardrails, and full-verify wiring.
- `npm run release:gate:check`, `npm run source:parity:check`, `npx tsc --noEmit`, `npm run verify`, `npm run handoff:check`, and `git diff --check` pass.
