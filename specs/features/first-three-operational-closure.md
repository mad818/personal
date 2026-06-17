# FIRST-THREE-OPERATIONAL-CLOSURE

## Goal

Give Mario one local command that answers whether the first three non-RPG operational items are actually closed, waiting on GitHub rescan/dismissal, or waiting on physical phone/iPad proof.

## Scope

- Add `npm run ops:first-three`.
- Read root `package.json`, `package-lock.json`, `desktop/src-tauri/Cargo.lock`, `desktop/src-tauri/tauri.conf.json`, and `desktop/tauri-template/tauri.conf.secure.example.json` to report the current GitHub Dependabot open-alert closure for `js-yaml` and `glib`.
- Treat `js-yaml` as locally ready only when the package lock is at or above `4.1.1` and the package override is present.
- Treat `glib` as release-scope safe only while Linux desktop bundle targets are absent; do not claim the alert is fixed by code while the lock remains below the Linux patched floor.
- Read the latest sanitized `docs/metrics/phone-local-acceptance-*.json` artifact to report free local phone acceptance.
- Read the latest sanitized `docs/metrics/readiness-rollup-*.json` plus phone acceptance artifact to report local AI offline operations.
- Treat protected CLI desktop proof separately from browser-session proof; if the protected readiness route proves free/local/Ollama posture with token configured, the local-AI lane should point to the physical phone/iPad local-AI receipt rather than asking to restart the desktop runtime.
- Print a clear status, blocker class, proof source, and exact next action for each lane, including `npm run phone:acceptance:desktop-proof` when desktop runtime proof is the immediate blocker.
- Include a short source-intake note that points GitHub/X/YouTube idea pressure back to the existing external ideas docs and Resources source ledger.
- Add `ops:first-three:check` and wire it into `npm run verify`.

## Guardrails

- No package installs, `npm audit fix`, GitHub calls, network calls, runtime launch, phone/iPad simulation, provider calls, receipt API calls, cloud calls, file writes by default, branch changes, secret/env reads, raw receipt storage reads, Linux target additions, or ARPG work.
- Do not store or print token values, cookies, auth headers, raw LAN IP proof, full user-agent strings, screenshots, prompt text, response text, transcripts, file contents, or account/payment proof.
- Do not claim `js-yaml`, `glib`, physical phone/iPad acceptance, or phone-side local AI proof is complete unless the local sanitized evidence proves it.
- Do not claim the GitHub Dependabot alerts are closed until GitHub rescans `js-yaml` or `glib` is dismissed as `not_used` for the current non-Linux desktop release scope.

## Acceptance

- `node scripts/validate-first-three-operational-closure.mjs` fails before the runner exists, then passes after implementation.
- `npm run ops:first-three:check` passes.
- `npm run ops:first-three` prints a local read-only report and exits successfully even when the current state is blocked/manual.
- `npm run verify` includes `ops:first-three:check`.
- `npx tsc --noEmit`, `npm run verify`, and `npm run build` pass.
