# FIRST-THREE-OPERATIONAL-CLOSURE

## Goal

Give Mario one local command that answers whether the first three non-RPG operational items are actually closed, blocked by external package access, or waiting on physical phone/iPad proof.

## Scope

- Add `npm run ops:first-three`.
- Read the latest sanitized Dependabot audit artifact, root `package.json`, and `package-lock.json` to report the active `postcss` patch lane.
- Read the latest sanitized `docs/metrics/phone-local-acceptance-*.json` artifact to report free local phone acceptance.
- Read the latest sanitized `docs/metrics/readiness-rollup-*.json` plus phone acceptance artifact to report local AI offline operations.
- Print a clear status, blocker class, proof source, and exact next action for each lane.
- Include a short source-intake note that points GitHub/X/YouTube idea pressure back to the existing external ideas docs and Resources source ledger.
- Add `ops:first-three:check` and wire it into `npm run verify`.

## Guardrails

- No package installs, `npm audit fix`, GitHub calls, network calls, runtime launch, phone/iPad simulation, provider calls, receipt API calls, cloud calls, file writes by default, branch changes, secret/env reads, raw receipt storage reads, or ARPG work.
- Do not store or print token values, cookies, auth headers, raw LAN IP proof, full user-agent strings, screenshots, prompt text, response text, transcripts, file contents, or account/payment proof.
- Do not claim `postcss`, physical phone/iPad acceptance, or phone-side local AI proof is complete unless the local sanitized evidence proves it.

## Acceptance

- `node scripts/validate-first-three-operational-closure.mjs` fails before the runner exists, then passes after implementation.
- `npm run ops:first-three:check` passes.
- `npm run ops:first-three` prints a local read-only report and exits successfully even when the current state is blocked/manual.
- `npm run verify` includes `ops:first-three:check`.
- `npx tsc --noEmit`, `npm run verify`, and `npm run build` pass.
