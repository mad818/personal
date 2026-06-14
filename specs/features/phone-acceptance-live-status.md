# PHONE-ACCEPTANCE-LIVE-STATUS

## Goal

Make the remaining real phone/iPad acceptance step self-confirming inside the existing Free Local Readiness panel. When a physical mobile browser creates protected local receipts, the panel should show which proof items have landed without changing the overall visual design or requiring the operator to inspect the local receipt JSON file.

## Scope

- Add a shared, client-safe live status model derived from the existing sanitized phone acceptance receipt summary.
- Return that live status from protected `GET /api/phone-acceptance/receipt`.
- Fetch the protected receipt status from the existing Free Local Readiness panel after readiness loads, with silent failure when auth/runtime is unavailable.
- Show compact proof chips for phone open, login, fast-path ping, local AI, PWA capable, and PWA installed.
- Add a focused validator and wire it into the existing phone acceptance receipt checks.

## Guardrails

- No visual redesign, new top-level route, public endpoint, proxy, VPN/anonymity claim, payment/account proof, ARPG work, or cloud dependency.
- Do not store or render token values, cookies, auth headers, raw LAN IPs, full user-agent strings, screenshots, prompt text, response text, transcripts, or file contents.
- The panel may show booleans, counts, and sanitized timestamps only.
- All client fetches must be wrapped in `try/catch` and fail silently or with the existing recovery posture.

## Acceptance

- `node scripts/validate-phone-acceptance-live-status.mjs` passes.
- `npm run phone:acceptance:receipts:check` runs the new validator.
- `npx tsc --noEmit` passes.
- `npm run verify` passes.
