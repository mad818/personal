# PHONE-ACCEPTANCE-GUIDE-CLI

## Goal

Make phone/iPad acceptance easier to execute by turning the latest sanitized acceptance artifact into one plain checklist with the exact desktop commands and phone-side actions Mario should run next.

## Scope

- Add `npm run phone:acceptance:guide`.
- Read the latest sanitized `docs/metrics/phone-local-acceptance-*.json` artifact by default.
- Support explicit `--file=`, `--dir=`, and `--json` review paths.
- Print local LAN/HQ URL candidates from local network interfaces so the phone/iPad has a direct target before the UI QR is visible.
- Print each required phone proof item as done, missing, or unknown.
- Print the safest next command sequence:
  - `npm run phone:lan:start`
  - `npm run phone:acceptance:capture`
  - `npm run phone:acceptance:report`
  - `npm run offline:local:report`
  - `npm run ops:first-three`
- Add `phone:acceptance:guide:check` and wire it into `phone:acceptance:receipts:check`.

## Guardrails

- No network calls, runtime launch, receipt API calls, provider calls, file writes, `.env.local` reads, raw receipt storage reads, branch changes, dependency installs, UI changes, public route changes, or ARPG work.
- Do not read, store, or print token values, cookies, auth headers, raw receipt contents, screenshots, prompt text, response text, transcripts, file contents, or account/payment proof.
- Do not simulate proof. Manual capture flags are shown only as an operator fallback command to run after the real phone/iPad actions are complete.

## Acceptance

- `node scripts/validate-phone-acceptance-guide-cli.mjs` fails before the runner exists, then passes after implementation.
- `npm run phone:acceptance:guide:check` passes.
- `npm run phone:acceptance:guide` prints the current checklist and does not write files.
- `npm run phone:acceptance:receipts:check` includes the guide validator.
- `npx tsc --noEmit`, `npm run verify`, and `npm run build` pass.
