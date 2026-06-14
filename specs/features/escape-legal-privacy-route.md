# ESCAPE-LEGAL-PRIVACY-ROUTE

## Goal

Make the existing Escape IP guard support legal VPN, Tailscale exit-node, and legal proxy workflows without claiming Nexus hides an IP by itself.

## Scope

- Add a session-only legal privacy route selector for public HTTPS launch tiles.
- Supported route modes: none, VPN, Tailscale exit node, and legal proxy.
- Keep public links locked until a non-none route is selected and explicitly confirmed for the session.
- Show a plain readiness/status panel that explains what is ready, what remains locked, and which route is active.
- Keep all link opens as ordinary browser opens with `target="_blank"`, `rel="noopener noreferrer"`, and `referrerPolicy="no-referrer"`.
- Add a validator wired into `npm run verify`.

## Guardrails

- Do not build a VPN, open proxy, relay, tunnel, scraper, or IP lookup service inside Nexus.
- Do not look up, store, print, publish, or compare the user's public IP.
- Do not claim anonymity or guaranteed IP hiding.
- Do not enable public plain-HTTP links.
- Do not bypass DRM, paywalls, geo restrictions, or provider terms.
- Do not add dependencies, background workers, public routes, or ARPG changes.

## Acceptance

- `lib/legalPrivacyRoute.ts` exposes the supported route options and a posture helper.
- `components/resources/SecureLinkOpenPanel.tsx` uses the route helper, route selector, explicit confirmation checkbox, and readiness test IDs.
- Saved public tiles remain locked when the route is none or unconfirmed.
- Saved public tiles unlock only after VPN, Tailscale exit node, or legal proxy is selected and confirmed.
- `scripts/validate-escape-legal-privacy-route.mjs` passes and is wired into `npm run verify`.
