# PHONE-ACCEPTANCE-DESKTOP-PROOF

## Goal

Make the phone/iPad acceptance lane easier to unblock by adding one desktop command that proves the local LAN runtime is reachable, captures the sanitized desktop-side acceptance artifact, prints the normal report, and exits cleanly.

## Scope

- Add `npm run phone:acceptance:desktop-proof`.
- Add `npm run phone:acceptance:desktop-proof:check` and wire it into the phone acceptance verification lane.
- Stop any stale managed runtime before starting.
- Build the standalone runtime unless `--skip-build` is passed.
- Launch the managed runtime on port `3100` with:
  - `NEXUS_PHONE_LAN_ENABLED=true`
  - `NEXUS_NETWORK_MODE=isolated`
  - `NEXUS_ALLOW_PAID_APIS=false`
  - `NEXUS_ENABLE_HIGH_RISK_TOOLS=false`
  - `NEXUS_RUNTIME_HOST=0.0.0.0`
  - `NEXUS_RUNTIME_HEALTH_HOST=127.0.0.1`
- Run the existing sanitized capture and report commands.
- Stop the managed runtime by default; allow `--keep-running` for a deliberate LAN test session.
- Provide `--check` for static command validation without launching, building, fetching, or writing artifacts.

## Guardrails

- Do not simulate physical phone/iPad proof.
- Do not pass manual proof flags such as `--phone-opened`, `--phone-login`, `--ping-receipt`, `--local-ai-receipt`, or `--pwa-installed`.
- Do not read or print token values, cookies, auth headers, raw receipt contents, screenshots, prompt text, response text, transcripts, account/payment data, or `.env.local`.
- Do not install dependencies, call GitHub, change branches, open external URLs, add UI changes, add public routes, or touch ARPG work.
- Keep output local and sanitized by delegating proof capture/reporting to the existing phone acceptance commands.

## Acceptance

- `node scripts/validate-phone-acceptance-desktop-proof.mjs` fails before the runner is implemented, then passes.
- `npm run phone:acceptance:desktop-proof:check` passes.
- `npm run phone:acceptance:receipts:check` includes the desktop-proof validator.
- `npm run phone:acceptance:desktop-proof -- --check` exits without starting a runtime or writing artifacts.
- `npm run type-check`, `npm run lint`, `npm run verify`, and `git diff --check` pass after implementation.
