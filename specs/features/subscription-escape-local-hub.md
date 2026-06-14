# Subscription Escape Local Hub

## What is this feature?

A private Resources workbench lane for replacing monthly subscriptions with safe local, free, open-source, or BYOK alternatives. The first version focuses on the user's real access pattern: MacBook runs Nexus 24/7 as the host, desktop and iPad connect as clients through Tailscale or LAN, and subscription data lives in one server-side local file instead of browser-local storage.

## Who is it for and what problem does it solve?

This is for Mario as the operator. It helps stop paying unnecessary monthly subscriptions by tracking paid tools, replacement candidates, migration safety, cancellation readiness, and privacy/access posture in one Nexus-native console.

## Where does it live in the UI?

- `RESOURCES -> Utilities -> Escape`
- Direct URL: `/resources?view=escape`
- No new top-level tab.
- No public landing positioning.

## What data does it need?

- Personal subscription records: name, category, monthly cost, renewal date, replacement target, status, and safety checklist.
- A static replacement catalog: cloud storage, passwords, media, notes/docs, DNS/privacy, AI/dev tooling, and device sync.
- Source links from the supplied YouTube IDs as reference inputs, without assuming the videos were watched if metadata is unreachable.
- Host/privacy posture: MacBook host, Tailscale-first access, public exposure guardrail, backup reminder, and last saved time.

Personal data must be stored outside git at `data/subscription-escape.json` by default, or a path provided by `NEXUS_SUBSCRIPTION_ESCAPE_FILE`.

## Safety guardrails

- Do not build a VPN, proxy, anonymizer, or IP masking transport inside Nexus.
- Treat Tailscale as the private access layer already installed on MacBook, desktop, and iPad.
- Default to private tailnet/LAN access; warn on public/Funnel-style exposure.
- Keep all API routes token-gated by existing Nexus middleware.
- No piracy, DRM bypass, paywall bypass, ad-circumvention claim, account-ban evasion, or automated account cancellation.
- No Nexus-side billing or subscription features.
- No cloud sync database in v1.

## What does done look like?

- `lib/subscriptionEscape.ts` defines types, defaults, replacement catalog, source links, host posture, and safety helpers.
- `app/api/subscription-escape/route.ts` exposes protected `GET` and `POST` for one server-side state file.
- `components/resources/SubscriptionEscapeConsole.tsx` renders monthly burn, savings target, replacement cards, safety checklist, source shelf, host posture, and edit controls for subscription records.
- `ResourcesWorkbench`, store state, and surface view specs include `escape`.
- `.gitignore` excludes local subscription escape data.
- `npm run type-check` and `npm run verify` pass.
