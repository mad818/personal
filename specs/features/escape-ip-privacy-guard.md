# Escape IP Privacy Guard

## What is this feature?

A guardrail for the stream connect shelf that prevents accidental public-IP exposure. Nexus classifies each approved link as same-app, private/local, or public. Private/local links can connect normally; public links stay locked until the operator confirms a VPN, Tailscale exit node, or other privacy route is active.

## Why this matters

Nexus cannot hide a browser's source IP by itself. If a browser opens a normal public website directly, that destination can see the network IP used for the connection. The safe behavior is to make that boundary visible and require explicit confirmation before opening public links.

## Where does it live?

- Existing route: `/resources?view=escape`
- Existing stream connect shelf in the protected Escape lane.
- No new public route.

## Safety guardrails

- Do not claim Nexus provides anonymity by itself.
- Do not add a built-in proxy, VPN, IP lookup service, or outbound relay.
- Do not log, display, publish, or store the user's client IP.
- Do not unlock public links automatically.
- Keep private/local/Tailscale links distinct from public HTTPS links.
- Keep `noopener`, `noreferrer`, and `no-referrer` on all connect actions.

## What does done look like?

- `lib/secureLink.ts` returns link network scope and whether public-IP privacy confirmation is required.
- `components/resources/SecureLinkOpenPanel.tsx` shows IP guard posture, counts public locked links, and disables public Connect actions until the operator confirms a privacy route is active.
- Public links still validate and can be saved, but cannot be opened from the shelf without confirmation.
- `npx tsc --noEmit`, `npm run lint`, `npm run verify`, `git diff --check`, and route proof pass.
