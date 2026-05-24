# PHONE-ACCEPTANCE-REPORT-CLI

## Goal

Make phone/iPad acceptance easier to finish by adding one local command that summarizes the latest sanitized acceptance capture artifact without requiring Mario to open JSON files.

## Scope

- Add `npm run phone:acceptance:report`.
- Read the latest `docs/metrics/phone-local-acceptance-*.json` artifact by default.
- Support an explicit `--file=` path and `--dir=` path for review of a specific sanitized artifact set.
- Print captured time, sanitized base URL, acceptance state, route status summary, local/free readiness highlights, receipt proof counts, missing receipt labels, blockers, and next action.
- Add `phone:acceptance:report:check` and wire it into the existing phone acceptance receipt check chain.

## Guardrails

- No network calls, runtime launch, receipt API calls, GitHub calls, cloud calls, dependency install, file writes, branch changes, or ARPG work.
- Do not read `.env.local`, `data/phone-acceptance-receipts.json`, token values, cookies, auth headers, raw LAN IP proof, screenshots, prompt text, response text, transcripts, file contents, or account/payment proof.
- Missing proof output must stay label-only and come from the sanitized capture artifact.
- If no capture artifact exists, exit successfully with the next safe command instead of blocking verification.

## Acceptance

- `node scripts/validate-phone-acceptance-report-cli.mjs` fails before the runner exists, then passes after implementation.
- `npm run phone:acceptance:report:check` passes.
- `npm run phone:acceptance:report` prints a local read-only report and does not write files.
- `npm run phone:acceptance:receipts:check` includes the report validator.
- `npx tsc --noEmit`, `npm run verify`, and `npm run build` pass.
