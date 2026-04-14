# Release Boundary Batch 1 — Explicit Dirty-Worktree Candidate Guard

Date: 2026-04-10

## Why this batch existed

The first-deployment audit identified one major coordination risk that the repo did not yet enforce:

1. The web lane was close to release-candidate quality.
2. The local worktree was very large and intentionally dirty.
3. Nothing in the release flow could distinguish:
   - a deliberately chosen dirty release candidate
   - accidental drift beyond that candidate

That meant deployment proof could still happen from an ambiguous local state even after the runtime-target gates were cleaned up.

## What changed

### 1. Added an explicit local release-boundary snapshot

- Added `scripts/release-boundary.ps1`.
- `npm run release:boundary` now passes only when one of these is true:
  - the worktree is meaningfully clean
  - the current meaningful worktree state exactly matches the captured local `.nexus-release-boundary.json`
- Volatile/generated paths are ignored so the boundary is about meaningful source drift, not handoff metrics or transient build outputs.

### 2. Added a capture command for intentional dirty candidates

- Added `npm run release:boundary:capture`.
- This records the current branch, HEAD, and meaningful `git status --porcelain` entries into `.nexus-release-boundary.json`.
- If the tree is later broadened or changed beyond that snapshot, `npm run release:boundary` fails loudly with a drift summary.

### 3. Wired the boundary into grouped release gates

- `scripts/launch-gate.ps1` now runs `npm run release:boundary` before local candidate proof.
- `scripts/launch-gate-target.ps1` now runs the same boundary check before target-runtime smoke/auth checks.
- This prevents Docker proof or staged-host proof from silently reusing a broadened dirty tree.

### 4. Aligned deployment docs

- Updated deployment docs and checklists so the operator flow is now:
  1. capture a dirty local boundary if needed
  2. verify the boundary still matches
  3. run the local candidate gate
  4. run target-runtime smoke against an explicit runtime

## Verification

Expected proof for this batch:

- `npm run release:boundary` fails when the tree is dirty and no boundary snapshot exists
- `npm run release:boundary:capture`
- `npm run release:boundary` passes against the captured boundary

## Follow-on work

1. `FD1C`: fix the release-box GitHub credential path so `npm run handoff:pull` works before staging.
2. `FD2`: prove the Docker artifact locally and run `release:smoke` against that container.
3. Resume staged deployment proof only after the explicit local boundary and explicit runtime-target gates are both green.
