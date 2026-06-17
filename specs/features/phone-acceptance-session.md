# PHONE-ACCEPTANCE-SESSION

## Intent

Reduce the manual burden for real phone/iPad acceptance by providing one local command that starts the LAN-safe Nexus runtime, prints the current phone/iPad guide, waits while Mario performs the real device steps, then runs the existing capture/report closure commands.

## Scope

- Add `npm run phone:acceptance:session`.
- Reuse the existing managed runtime scripts: stop stale runtime, build the standalone runtime unless `--skip-build` is supplied, launch on port `3100` with LAN access enabled, and stop the managed runtime on normal exit or `Ctrl+C`.
- Use the same safe runtime posture as desktop proof: `NEXUS_NETWORK_MODE=isolated`, paid APIs disabled, high-risk tools disabled, LAN binding enabled, and health checks routed through loopback.
- Print the existing phone/iPad guide so the operator has HQ URL candidates and the exact checklist in one place.
- In interactive terminals, wait for `Press Enter` after the real phone/iPad steps, then run capture, phone report, offline local-AI report, and first-three status.
- Support `--skip-build`, `--no-wait`, and `--check`.

## Out Of Scope

- Do not simulate physical phone/iPad proof.
- Do not mark phone opened, login, browser storage, ping, local AI, PWA capable, or PWA installed from the desktop.
- Do not read `.env.local`, token values, cookies, auth headers, raw receipt storage, prompts, responses, screenshots, transcripts, account data, or payment proof.
- Do not call GitHub, install packages, widen public routes, add cloud services, add VPN/proxy/IP-hiding claims, or touch ARPG.

## Acceptance

- `npm run phone:acceptance:session:check` proves the command, spec, safe posture, package wiring, guide wiring, and forbidden behaviors.
- `npm run phone:acceptance:session -- --check` exits without launching a runtime, writing artifacts, or reading private proof.
- `npm run phone:acceptance:receipts:check`, `npm run type-check`, `npm run lint`, and `npm run verify` pass.
