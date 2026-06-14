# Escape Secure Link Opener

## What is this feature?

A protected Escape-lane option that lets Mario paste a link, see whether it is safe to open, and open it only after an explicit click. It is meant for Tailscale/local service links, self-hosted dashboards, and normal HTTPS links without teaching Nexus to trust every URL.

## Who is it for and what problem does it solve?

This is for Mario and authorized users who access Nexus from MacBook, desktop, or iPad and need a safer place to open local/private service links. The problem is that a raw link can hide unsafe schemes, credentials, public plain-HTTP exposure, or tracking referrers.

## Where does it live in the UI?

- Existing route: `/resources?view=escape`
- Existing chamber: `RESOURCES -> Utilities -> Escape`
- Near the access/backup posture and media library.
- No new top-level tab.
- No public unauthenticated page.

## What data does it need?

- Pasted link text only in component state.
- No saved link history.
- No server-side fetch, unfurl, screenshot, or metadata lookup.

## Safety guardrails

- Allow HTTPS links.
- Allow same-app relative links.
- Allow plain HTTP only for private/local hosts such as localhost, RFC1918 LAN IPs, Tailscale CGNAT IPs, `.local`, or `.ts.net`.
- Block `javascript:`, `data:`, `file:`, public plain HTTP, embedded username/password credentials, and empty/oversized inputs.
- Open with `target="_blank"`, `rel="noopener noreferrer"`, and `referrerPolicy="no-referrer"`.

## What does done look like?

- `lib/secureLink.ts` validates and classifies link input without network access.
- `components/resources/SecureLinkOpenPanel.tsx` renders the paste field, posture badges, copy action, and secure open action.
- `components/resources/SubscriptionEscapeConsole.tsx` mounts the panel in the protected Escape lane.
- `npx tsc --noEmit`, `npm run lint`, `npm run verify`, `git diff --check`, and route proof pass.
