# Feature Spec — Resources Surface Hardening

## Route

`/resources`

## Objective

Ensure the RESOURCES surface remains stable under smoke and degraded conditions.

## Smoke contract

- Page loads and renders the RESOURCES shell within the performance budget.
- Impact view (`?view=impact`) renders without unhandled exceptions.
- Navigation to this route from the main nav works correctly.
- No hydration mismatch on first load.

## Degraded-state contract

- If repo metadata or dependency data is unavailable, RESOURCES shows a data-unavailable message rather than a crash.
- If the agent role taxonomy fails to load, RESOURCES displays a retry prompt rather than a blank panel.
- Missing optional BYOK keys degrade gracefully with a configure-provider prompt.

## Validator proof

`npm run ga:surfaces:check` confirms `specs/features/resources-hardening.md` exists and references `/resources`.

## Non-Goals

- No feature removal.
- No restructuring of existing RESOURCES component tree.
