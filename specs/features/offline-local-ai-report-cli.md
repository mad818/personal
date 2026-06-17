# OFFLINE-LOCAL-AI-REPORT-CLI

## Goal

Make the remaining local-AI/offline acceptance state visible from one terminal command so Mario can see whether desktop local AI and phone-side local AI proof are complete without opening JSON artifacts.

## Scope

- Add `npm run offline:local:report`.
- Read the latest sanitized `docs/metrics/readiness-rollup-*.json` and `docs/metrics/phone-local-acceptance-*.json` artifacts by default.
- Support explicit `--rollup=`, `--phone=`, and `--dir=` paths for reviewing specific sanitized artifacts.
- Print desktop local/free posture, phone local-AI receipt posture, blockers, and next action.
- Distinguish browser-session authentication from protected CLI token readiness so desktop proof can be marked locally ready when the protected readiness route is reachable with token configured, even if a browser session is not active.
- When protected CLI desktop proof is already ready, suppress the inherited phone-acceptance "Free Local Readiness is not fully local/free" blocker from the local-AI report so the remaining action stays focused on phone/iPad local-AI receipt proof.
- Add `offline:local:report:check` and wire it into `offline:local:check`.

## Guardrails

- No network calls, runtime launch, provider calls, receipt API calls, GitHub calls, cloud calls, dependency install, file writes, branch changes, secrets/env reads, raw receipt storage reads, phone-proof simulation, or ARPG work.
- Do not store or print token values, cookies, auth headers, raw LAN IP proof, full user-agent strings, screenshots, prompt text, response text, transcripts, file contents, or account/payment proof.
- If no artifact exists, exit successfully with the next safe command instead of blocking verification.

## Acceptance

- `node scripts/validate-offline-local-ai-report-cli.mjs` fails before the runner exists, then passes after implementation.
- `npm run offline:local:report:check` passes.
- `npm run offline:local:report` prints a local read-only report and does not write files.
- `npm run offline:local:check` includes the report validator.
- `npx tsc --noEmit`, `npm run verify`, and `npm run build` pass.
