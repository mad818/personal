# Feature Spec — Command Surface Hardening

## Route

`/command`

## Objective

Ensure the COMMAND tab remains stable under smoke and degraded conditions.

## Smoke contract

- Page loads and renders the COMMAND shell within the performance budget.
- Input controls are interactive and accessible via keyboard.
- Network health panel (if present) renders without error.

## Degraded-state contract

- If backend tool execution is unavailable, the COMMAND panel shows a clear unavailable message rather than a blank area or unhandled error.
- If the agent taxonomy registry fails to load, COMMAND degrades gracefully without crashing.
- Removing a BYOK provider key does not crash the page — a prompt to configure appears instead.

## Validator proof

`npm run ga:surfaces:check` confirms `specs/features/command-hardening.md` exists and references `/command`.

## Non-Goals

- No feature removal.
- No restructuring of existing COMMAND component layout.
