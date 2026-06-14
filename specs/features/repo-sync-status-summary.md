# REPO-SYNC-STATUS-SUMMARY

## Goal

Reduce repo-management friction by adding one no-network command that explains the current local Git sync state and the safest next action.

## Scope

- Add `npm run repo:sync:status`.
- Read local Git branch, upstream, ahead/behind counts, working-tree cleanliness, and last commit.
- Print a concise operator summary with the next safe command.
- Exit successfully for normal local states such as dirty or ahead; the command is a report, not a gate.
- Add focused validator coverage and wire it into `npm run verify`.

## Guardrails

- No fetch, pull, push, remote API calls, GitHub calls, network probes, auth-token reads, `.env.local` reads, file writes, branch changes, destructive Git commands, or ARPG work.
- Use local Git metadata only.
- Keep the actual publishing action manual and routed through `npm run git:safe -- push`.

## Acceptance

- `node scripts/validate-repo-sync-status.mjs` passes.
- `npm run repo:sync:status:check` passes.
- `npm run repo:sync:status` prints branch, ahead/behind, dirty/clean, last commit, and next action.
- `npx tsc --noEmit` passes.
- `npm run verify` passes.
