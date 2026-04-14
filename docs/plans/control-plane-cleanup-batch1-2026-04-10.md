# Control-Plane Cleanup Batch 1 — Backlog, Audit Drift, and Explicit Runtime Targets

Date: 2026-04-10

## Why this batch existed

The repo was healthier than its coordination layer:

1. `tasks/todo.md` still showed stale umbrella items and duplicate assistant-first entries.
2. `scripts/audit.js` had drifted away from the current script names.
3. Runtime-targeted checks like `route:integrity`, `release:smoke`, `auth:regression`, and `runtime:consistency` still silently assumed `http://127.0.0.1:3000`, which made deployment proof too easy to misread.
4. `check:stale` was noisy on Windows because the git log shell command used `%` placeholders that `cmd.exe` can expand incorrectly.

This batch fixes those control-plane issues before attempting first web deployment proof.

## What changed

### 1. Backlog normalization

- Cleaned up the Behavior-First section in `tasks/todo.md` so shipped umbrella work is no longer left open beside completed slices.
- Added explicit first-deployment sequencing items for:
  - release-candidate worktree boundary reconciliation
  - fixing the release-box GitHub credential path

### 2. Repo-native audit drift repair

- Updated `scripts/audit.js` to call the current path-collision check path instead of the old missing script name.
- Kept the audit output focused on repo health plus backlog posture instead of silently failing on drifted script paths.

### 3. Explicit runtime-targeted release checks

- Added `scripts/runtime-target.mjs` as the shared gate for runtime-targeted checks.
- `scripts/route-integrity.mjs`, `scripts/release-smoke.mjs`, `scripts/auth-regression.mjs`, and `scripts/runtime-consistency.mjs` now require one of:
  - `NEXUS_RELEASE_BASE_URL=...`
  - `NEXUS_ASSUME_LOCAL_RUNTIME=true`
- This keeps release checks tied to an intentionally chosen runtime instead of whatever may or may not be serving `127.0.0.1:3000`.

### 4. Stale-checker hardening

- `scripts/check-stale-todos.mjs` now uses argument-safe git invocation instead of shell-quoted `execSync`.
- The stale checker now scans recent git patch content, not only commit messages, so recently touched plans and backlog entries count as active.
- Umbrella items with active descendant slices no longer create false stale warnings.

### 5. Release docs alignment

- Updated release/readiness docs to describe runtime-targeted checks as explicit target-runtime checks.
- Added the control-plane cleanup status to handoff docs so the next session sees the corrected deployment order immediately.

## Verification

Expected proof for this batch:

- `npm run check:stale`
- `npm run audit:full`
- `npm run type-check`
- `npm run verify`
- `npm run build`
- `npm run eval:agent-runtime:ci`
- `npm run runtime:fresh-proof`

## Follow-on work

1. Reconcile the dirty worktree into an intentional release-candidate boundary before remote staging.
2. Prove `FD2` locally with Docker and `release:smoke` against the container.
3. Use the cleaned release checks and docs as the gate for `FD3` through `FD5`.
