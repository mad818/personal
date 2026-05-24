# PHONE-ACCEPTANCE-QR-HANDOFF

## Goal

Make real phone/iPad acceptance easier to perform by letting the existing Free Local Readiness panel show a scannable direct-HQ QR handoff when LAN mode is ready.

## Scope

- Add a dependency-free local QR matrix helper for the direct HQ URL.
- Render the QR inside the existing phone handoff card without changing the broader visual design.
- Keep copy buttons and URL text intact for fallback/manual use.
- Add focused validator coverage and wire it into the phone LAN check chain.

## Guardrails

- No public route, cloud QR service, dependency install, remote image fetch, URL shortener, token embedding, screenshot capture, proxy/VPN/anonymity behavior, or ARPG work.
- The QR encodes only the already-visible phone HQ URL from the protected readiness snapshot.
- The panel must continue to work when a URL is too long for the built-in QR helper by showing the copyable URL fallback.
- No raw LAN IP literals should be committed to source or docs.

## Acceptance

- `node scripts/validate-phone-acceptance-qr-handoff.mjs` passes.
- `npm run phone:lan:check` runs the new validator.
- `npx tsc --noEmit` passes.
- `npm run verify` passes.
