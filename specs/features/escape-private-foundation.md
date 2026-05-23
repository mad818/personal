# Escape Private Foundation

## What is this feature?

A hardening slice for the Subscription Escape and Media Escape lane that makes the system safer to trust with real data. It keeps the MacBook/local Nexus instance as the source of truth, uses Tailscale as the primary access path, allows cloud only as an optional backup destination, and adds protected local cover/poster storage.

## Who is it for and what problem does it solve?

This is for Mario as the operator and for authorized people he explicitly allows. The problem is not just cataloging media; it is making sure access can be tracked, revoked, backed up, and kept private before the library grows.

## Where does it live in the UI?

- Existing route: `/resources?view=escape`
- Existing chamber: `RESOURCES -> Utilities -> Escape`
- No new top-level tab.
- No public unauthenticated media page.

## What data does it need?

- Access records: person/device label, role, device hint, status, Tailscale-managed flag, notes, and last-updated time.
- Access posture: Tailscale-first, Nexus auth required, public links blocked, cloud backup optional, and MacBook as local source of truth.
- Backups: local JSON export/import from the protected Escape state.
- Private assets: cover/poster files stored under an ignored local data directory and served through protected Nexus API routes.

## Safety guardrails

- Link alone is not access; Tailscale/private network plus Nexus authorization is the intended path.
- Do not add public media endpoints, public unauthenticated sharing, or Funnel-style exposure by default.
- Do not add paid APIs, paid metadata services, or cloud as the required source of truth.
- Cloud is allowed only as optional operator-controlled backup storage outside this slice.
- Private covers/posters must stay out of git and be served only through protected API routes.

## What does done look like?

- `lib/subscriptionEscape.ts` defines access posture/record types and defaults.
- `lib/subscriptionEscapeStore.ts` normalizes access records in the local state file.
- `.gitignore` excludes private cover/poster asset storage.
- Protected `/api/subscription-escape/assets` upload and read routes store images under local data and return protected URLs.
- `components/resources/EscapeAccessBackupPanel.tsx` renders backup export/import, access posture, authorized person/device records, and revocation steps.
- `components/resources/MediaEscapeLibrary.tsx` can upload a private cover/poster into protected local storage and use the returned protected URL.
- `npx tsc --noEmit`, `npm run lint`, `npm run verify`, `git diff --check`, and route proof pass.
