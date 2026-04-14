# Nexus Prime — Connector Surface Hardening
**Date:** 2026-04-06
**Scope:** Expand the authenticated connector contract to older weather, flight, and geo-scan surfaces
**Primary lanes touched:** security, API consistency, degraded-state UX, verification

## Why this slice now
- `/api/weather`, `/api/flights`, and `/api/geo-scan` sit behind authenticated middleware, but they still return ad hoc response shapes and route-specific fallback behavior.
- The UI mostly treats these feeds as ordinary success paths, even when the route is serving sample data, rate-limited empties, or upstream-degraded responses.
- Weather consumers also expect metric-style Open-Meteo field names today, while the route currently normalizes into a different shape, which risks silent UX drift.

## Routes in scope
- `/api/weather`
- `/api/flights`
- `/api/geo-scan`

## Primary consumers in scope
- `hooks/useGlobalData.ts`
- `components/iot/SensorDashboard.tsx`
- `components/security/SecurityAlerts.tsx`
- `components/intel/FlightTracker.tsx`
- `components/ops/OpsMap.tsx`

## Execution goals
1. Apply `connectorJson()` to the selected routes so they all emit:
   - private authenticated cache headers
   - `Vary: Authorization, Cookie`
   - stable `meta` fields for source, freshness, and degraded warnings
2. Preserve current top-level payload keys while improving compatibility:
   - weather should expose the metric-style fields current UI components already read
   - flights and geo-scan should keep their existing top-level arrays/status keys
3. Surface degraded/sample warnings in the main consumers so operators can tell when a route is healthy versus degraded.
4. Extend the repo-native connector guardrail to cover the expanded route set.
5. Re-run focused verification and update `tasks/todo.md` with the landed results.

## Success criteria
- Selected authenticated connector routes no longer use ad hoc response contracts.
- Weather consumers receive compatible metric-oriented field names and retain the normalized aliases.
- Flight and geo-scan surfaces show degraded/sample context instead of silently blending it into normal success UI.
- `npm run check:connector-responses` passes for the expanded route set.
- `npm run type-check`, `npm run lint`, and `npm run verify` pass.

## Non-goals
- Reworking every remaining authenticated connector route in one pass
- Major tab redesigns beyond degraded-state clarity
- Changing route authorization or middleware policy in this slice

## Best next slice after this one
- Expand the shared connector contract to `/api/news` and other older authenticated connectors
- Normalize empty/degraded messaging across GA tab surfaces that consume connector data
