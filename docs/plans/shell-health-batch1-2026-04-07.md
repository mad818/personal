# Shell Health Batch 1 — 2026-04-07

## Summary

The post-login shell can land in a visibly broken state for an already-used browser profile: toprail links render as default browser anchors, the page background survives, but the styled HQ shell does not recover into a usable operator surface. Clean-browser E2E still passes and the CSS bundle is served correctly, so the issue is not "build is broken" — it is a client/runtime recovery gap.

## Audit Findings

1. The global CSS asset is present and served successfully from `/_next/static/css/...`.
2. `npm run hq:e2e` passes in a clean Playwright session, so the canonical `/hq` shell is healthy in a fresh browser context.
3. The current app has no authenticated shell watchdog that says:
   - the user is logged in,
   - the toprail is visibly unstyled or the route shell failed to mount,
   - reload once and recover instead of leaving the operator on a near-empty black page.
4. The app also has no bounded emergency UI for that state, so the user is left guessing whether the page is loading, broken, or half-authenticated.

## Goals

1. Detect an authenticated-but-broken shell state after hydration.
2. Auto-recover once with a bounded hard reload instead of silently stalling.
3. If the shell is still unhealthy after the auto-reload, switch into an explicit emergency recovery mode with:
   - emergency shell styling for critical chrome,
   - a visible recovery strip,
   - a targeted local view reset that avoids wiping durable saved content.
4. Add browser regression coverage for shell health after login, not just element presence.
5. End the batch with code verification and live runtime reachability proof.

## Scope

- Add a client-side `ShellHealthGuard` mounted inside the authenticated root layout.
- Validate critical shell sentinels:
  - `.nexus-toprail` exists and has styled positioning,
  - `main` padding resolves,
  - `/hq` exposes the HQ shell instead of a stalled blank stage.
- Add a one-time session-scoped reload marker to prevent reload loops.
- Add emergency recovery UI and targeted local view reset helpers.
- Extend E2E coverage to assert computed shell styling after login.

## Non-Goals

- No secret or auth-model changes.
- No route contract changes.
- No whole-app style rewrite.
- No destructive browser cache purge of persisted saved articles, drafts, or other durable operator data.

## Verification

1. `npm run type-check`
2. `npm run verify`
3. `npm run hq:e2e`
4. Confirm the dev server is listening on `127.0.0.1:3000`
5. Confirm live reachability for `/` and `/hq`
