# Nexus Prime — Connector Input Hardening Slice
**Date:** 2026-04-05
**Scope:** Query and URL validation for older connector-style routes
**Primary lanes touched:** security, reliability, API contracts, verification

## Why this slice now
- Several older connector routes predate the newer internal contract work and still validate input inline or inconsistently.
- The biggest risks are silent fallback on malformed coordinates, broad query forwarding into local companion services, and arbitrary public URL handling without a shared safety contract.
- Tightening these routes improves security and operator trust without requiring major UI changes.

## Routes in scope
- `/api/headers`
- `/api/agent-reach`
- `/api/weather`
- `/api/flights`
- `/api/maritime`

## Execution goals
1. Add one shared validation layer for:
   - safe public URL normalization
   - bounded numeric query params
   - all-or-nothing bounding-box validation
   - filtered forwarded query params for companion-service proxies
2. Apply it to the routes above so invalid input returns explicit `400` errors instead of silent widening or unsafe forwarding.
3. Add rate limiting to the proxy-style routes where user input can trigger outbound fetches.
4. Add a repo-native guardrail that fails if these routes stop importing the shared validators.
5. Re-run verification and record the results in `tasks/todo.md`.

## Success criteria
- `/api/headers` blocks private/local targets, credentials, and malformed URLs through one shared helper.
- `/api/agent-reach` forwards only approved params per endpoint and validates RSS feed URLs before proxying.
- `/api/flights` rejects partial or inverted bounding boxes instead of silently falling back to global results.
- `/api/weather` and `/api/maritime` use the shared bounded-number parsing helpers for clearer errors and consistent range limits.
- `npm run check:connector-inputs`, `npm run type-check`, and `npm run lint` all pass.

## Non-goals
- Reworking the underlying Python companion services
- Expanding route-policy classes
- Full zod migration for every older connector route in one pass

## Best next slice after this one
- Older connector output-shape standardization and graceful degraded-state messaging across the public tabs
- Shared validation on remaining query-heavy routes like GDELT, threat-intel, and prices
