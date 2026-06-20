# Feature Spec — Intel Surface Hardening

## Route

`/intel`

## Objective

Ensure the INTEL tab remains stable under smoke and degraded conditions.

## Smoke contract

- Page loads and renders the INTEL shell within the performance budget.
- At least one news or signal panel renders visible content or a clear loading state.
- No hydration mismatch on first load.

## Degraded-state contract

- If news API sources (RSS, GDELT) all fail, the panel shows an empty-state message rather than an unhandled exception.
- If market data feeds are unavailable, price panels render a clear stale/unavailable indicator.
- Fear & Greed index failure degrades to a labeled unavailable chip — no raw number fallback.

## Validator proof

`npm run ga:surfaces:check` confirms `specs/features/intel-hardening.md` exists and references `/intel`.

## Non-Goals

- No feature removal.
- No change to existing data-fetching hooks.
