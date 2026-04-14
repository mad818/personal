# Nexus Prime — Authenticated Connector Response Contract
**Date:** 2026-04-05
**Scope:** Shared response helper for authenticated connector routes
**Primary lanes touched:** security, API consistency, UX fallback messaging, verification

## Why this slice now
- Connector routes such as `/api/gdelt`, `/api/threat-intel`, and `/api/prices` sit behind authenticated middleware, but they still advertise `public` cache headers or expose route-by-route degraded behavior.
- The UI already tolerates partial or empty responses, but it does not receive a consistent machine-readable degraded signal from these routes.
- A shared helper can improve security posture and UI clarity together with minimal risk.

## Routes in scope
- `/api/gdelt`
- `/api/threat-intel`
- `/api/prices`

## Execution goals
1. Add one shared connector-response helper that:
   - sets private authenticated cache headers
   - adds `Vary: Authorization, Cookie`
   - appends stable `meta` fields for source, generated time, cache TTL, and degraded warnings
2. Apply the helper to the routes above while preserving the existing top-level payload keys that current hooks already read.
3. Update the most relevant hooks to surface degraded warnings instead of only generic fetch failures.
4. Add a repo-native guardrail that verifies the selected routes still use the shared connector helper.
5. Re-run `verify` and record the outcome in `tasks/todo.md`.

## Success criteria
- Selected authenticated connector routes no longer emit `public` cache directives.
- GDELT, threat-intel, and prices return a consistent `meta` block without breaking consumers.
- The prices and OTX-facing hooks can show more specific degraded messages when upstream data is thin or partially unavailable.
- `npm run check:connector-responses` passes.
- `npm run verify` passes.

## Non-goals
- Reworking `/api/news` array payload shape in this slice
- Migrating every connector route at once
- Major UI redesigns on top of the new metadata

## Best next slice after this one
- Expand the shared connector contract to additional routes like weather, flights, geo-scan, and news
- Standardize empty/degraded UI states on the tab surfaces that consume these feeds
