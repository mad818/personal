# Release Gate Batch 1 — One-Command Candidate Proof

Date: 2026-04-10

## Why this batch existed

The repo had strong release checks, but they still lived as separate commands and documents:

- `verify`
- `eval:agent-runtime:ci`
- `runtime:fresh-proof`
- target-runtime checks like `route:integrity`, `release:smoke`, and `auth:regression`

That made the release path easy to understand, but still easy to run inconsistently. The next step was to turn the cleaned release flow into one explicit local candidate gate plus one explicit target-runtime gate.

## What changed

### 1. Local candidate gate

- Added `npm run launch:gate` in `package.json`.
- It runs the local release-candidate proof in the correct order:
  1. `npm run verify`
  2. `npm run eval:agent-runtime:ci`
  3. `npm run runtime:fresh-proof`

This is the preferred one-command proof for a local web release candidate before container or remote staging work.

### 2. Target-runtime gate

- Added `npm run launch:gate:target` in `package.json`.
- It groups the runtime-targeted checks that must run against an intentionally chosen target:
  1. `npm run runtime:consistency`
  2. `npm run route:integrity`
  3. `npm run release:smoke`
  4. `npm run auth:regression`

This gate requires the same explicit runtime target rules as the underlying scripts:
- `NEXUS_RELEASE_BASE_URL=https://target-host.example`
- `NEXUS_TOKEN=<set-in-local-env-only>`

### 3. Release docs alignment

- Updated deployment/readiness docs to point at `launch:gate` as the preferred local candidate proof.
- Clarified that `launch:gate:target` is the follow-on gate for a running container, staged host, or other intentional target runtime.

## Verification

Passed:

- `npm run launch:gate`

The target-runtime gate was not executed in this batch because this machine still does not have Docker available for `FD2`, and no separate remote target was configured during the pass.

## Follow-on work

1. Use `npm run launch:gate` before every first-deployment candidate proof.
2. Use `npm run launch:gate:target` during `FD2` and `FD3` once a container or staged host is available.
3. Keep the worktree-boundary and GitHub-credential blockers separate from the candidate gate so release failures stay attributable.
