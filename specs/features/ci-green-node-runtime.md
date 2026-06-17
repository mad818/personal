# CI Green Node Runtime

## Intent

Keep local release/runtime assumptions and GitHub Actions on one supported Node runtime contract so CI does not drift red after dependency or workflow edits.

## Scope

- GitHub Actions workflows that run Node, npm, or TypeScript checks use `actions/setup-node@v4` with Node `20`.
- The production Docker runtime continues to use explicit `node:20-alpine` stages.
- `package.json` declares the supported local development range as Node `>=20 <25` and npm `>=10`.
- `npm run ci:node-runtime:check` validates the workflow, Docker, package metadata, and verify wiring.
- `npm run verify` includes the runtime alignment check.

## Out Of Scope

- No dependency upgrades, lockfile package churn, provider changes, hosted deployment changes, or UI changes.
- No claim that GitHub PR checks are green until GitHub can be reached and the pushed branch has completed Actions.

## Acceptance

- The check fails when package engines are absent, a workflow uses a non-20 `node-version`, or Docker stages drift from Node 20.
- `npm run ci:node-runtime:check`, `npm run type-check`, `npm run lint`, and `npm run verify` pass locally.
