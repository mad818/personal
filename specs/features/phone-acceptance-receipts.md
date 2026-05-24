# Phone Acceptance Receipts

## Goal

Move FREE-LOCAL-PHONE-ACCEPTANCE from manual-only evidence toward local, sanitized receipts captured by the existing Free Local Readiness panel. The phone, iPad, or MacBook browser should be able to prove that the protected local surface opened without changing the panel's visual design.

## Scope

- Add a protected local-only receipt API under `/api/phone-acceptance/receipt`.
- Store only sanitized receipt posture in ignored local `data/` JSON.
- Silently ping the receipt API from the existing Free Local Readiness panel after readiness and browser storage are known.
- Teach `npm run phone:acceptance:capture` to merge local receipts with existing manual flags.
- Add a validator so the receipt lane stays wired into route policy, package scripts, the panel, and capture artifacts.

## Guardrails

- No public route.
- No visual redesign.
- No token values, cookies, auth headers, raw LAN IPs, full user-agent strings, screenshots, account data, or payment proof in receipts.
- No proxy, VPN, anonymity, DRM, paywall, or piracy behavior.
- No ARPG changes.

## Receipt Data

Receipts may store:

- Capture time and short id.
- Internal route path only.
- Device class: `phone`, `tablet`, `desktop`, or `unknown`.
- Browser storage readiness.
- PWA capability and display mode.
- Session/token/network posture as booleans and enum values.

Receipts must not store full URLs, IPs, token material, cookies, auth headers, or full user-agent strings.

## Acceptance

- `node scripts/validate-phone-acceptance-receipts.mjs` passes.
- `npm run phone:lan:check` includes the receipt validator.
- `npx tsc --noEmit` passes.
- `npm run phone:acceptance:capture` artifacts include `receiptPhoneProof` and `combinedPhoneProof`.
