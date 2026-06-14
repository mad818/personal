# Escape Stream Connect Shelf

## What is this feature?

A private streaming-site-style shelf for approved links. Mario can paste a Jellyfin/local/Tailscale/HTTPS link, Nexus validates it locally, then turns it into a visual tile that can be searched, sorted, favorited, copied, removed, and opened securely.

## Who is it for and what problem does it solve?

This is for Mario and authorized users who want the Escape lane to feel like a streaming home base instead of a technical URL form. The problem is not playing content inside Nexus; it is making trusted media/service entry points easy to launch while preserving secure link rules.

## Where does it live in the UI?

- Existing route: `/resources?view=escape`
- Existing chamber: `RESOURCES -> Utilities -> Escape`
- Replaces the one-off secure link opener panel with a private connect shelf.
- No new top-level tab.
- No public unauthenticated page.

## What data does it need?

- Secure stream link records: title, normalized safe URL, category, favorite flag, notes, and updated time.
- Records persist in the existing protected local Escape state file.
- No remote metadata, screenshots, unfurls, or preview fetches.

## Safety guardrails

- Allow HTTPS links.
- Allow same-app relative links.
- Allow plain HTTP only for private/local hosts such as localhost, RFC1918 LAN IPs, Tailscale CGNAT IPs, `.local`, or `.ts.net`.
- Block `javascript:`, `data:`, `file:`, public plain HTTP, embedded username/password credentials, empty/oversized inputs, and raw whitespace.
- Do not proxy streams, scrape paid services, bypass DRM/paywalls, defeat ads, or store account/session secrets.
- Open with `target="_blank"`, `rel="noopener noreferrer"`, and `referrerPolicy="no-referrer"`.

## What does done look like?

- `lib/subscriptionEscape.ts` defines secure stream-link types and labels.
- `lib/subscriptionEscapeStore.ts` normalizes and filters persisted secure links through `inspectSecureLink`.
- `components/resources/SecureLinkOpenPanel.tsx` renders a streaming-style connect shelf with paste-to-add, search/filter/sort, favorite, copy, remove, and secure connect actions.
- `components/resources/SubscriptionEscapeConsole.tsx` persists secure stream links through the existing protected Escape API.
- `npx tsc --noEmit`, `npm run lint`, `npm run verify`, `git diff --check`, and route proof pass.
