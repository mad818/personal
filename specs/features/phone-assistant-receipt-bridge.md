# Phone Assistant Receipt Bridge

## Goal

Make the existing phone acceptance receipt lane count assistant proof automatically when a real phone or iPad sends the acceptance prompts. The operator should not need to manually remember which `ping` and local Ollama turn happened if the existing assistant turn receipt already proves it.

## Scope

- Add a small client helper that converts an assistant turn receipt into sanitized phone acceptance booleans.
- Mount the helper through the shared `AssistantTurnReceipt` component so Home chat, CommandBar, and HQ chronicle inherit the bridge.
- Extend receipt validation so the bridge remains wired into `phone:lan:check`.

## Guardrails

- No visual redesign or new UI copy.
- No prompt text, response text, transcript, token, cookie, auth header, raw LAN IP, full user-agent string, screenshot, or model content in the phone receipt.
- No proxy, VPN, IP hiding, DRM, paywall, piracy, or external network behavior.
- No ARPG changes.

## Receipt Mapping

- `localFastPathReceipt` is true only when the assistant runtime receipt says the turn used the local fast path, such as `ping`.
- `localAiReceipt` is true only when the assistant runtime receipt shows a local/free AI turn: no paid APIs, no file changes, no recovery code, and an Ollama or local network posture.
- The protected receipt route still determines session and device posture from the request context.

## Acceptance

- `node scripts/validate-phone-assistant-receipt-bridge.mjs` passes.
- `npm run phone:lan:check` runs both receipt validators.
- `npx tsc --noEmit` passes.
- No rendered receipt text or layout changes are required.
