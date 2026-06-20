# Feature Spec — Alpha Surface Hardening

## Route

`/alpha`

## Objective

Ensure the ALPHA tab remains stable under smoke and degraded conditions.

## Smoke contract

- Page loads and renders the ALPHA shell within the performance budget.
- Signal panels display content or an explicit loading state.
- No unhandled promise rejections on mount.

## Degraded-state contract

- If all signal sources are unavailable, ALPHA shows a degraded-signals notice rather than a blank panel or crash.
- BYOK provider removal shows a configure-provider prompt — no thrown error reaches the UI.
- Chart/visualization components fail closed (hidden) rather than rendering broken SVG.

## Validator proof

`npm run ga:surfaces:check` confirms `specs/features/alpha-hardening.md` exists and references `/alpha`.

## Non-Goals

- No feature removal.
- No restructuring of existing ALPHA signal pipeline.
