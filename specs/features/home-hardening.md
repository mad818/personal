# Feature Spec — Home (HQ) Surface Hardening

## Route

`/home` → redirects to `/hq`

## Objective

Ensure the HQ shell remains stable under smoke and degraded conditions without removing any product scope.

## Smoke contract

- Page loads and renders the HQ shell within the performance budget.
- Agent office panel is visible and interactive.
- Auth gate correctly blocks unauthenticated access.
- Navigation rail shows all GA tab links without layout shift.

## Degraded-state contract

- If all AI providers are unavailable, the shell loads and displays a clear provider-unavailable message; no blank screen or unhandled exception.
- If live-context data (prices, news) fails to fetch, the HQ shell degrades to a static fallback without crashing.
- If session memory cannot be read, the shell opens in a clean state without throwing.

## Validator proof

`npm run ga:surfaces:check` confirms `specs/features/home-hardening.md` exists and references `/home` and `/hq`.

## Non-Goals

- No feature removal.
- No change to existing HQ component tree structure.
