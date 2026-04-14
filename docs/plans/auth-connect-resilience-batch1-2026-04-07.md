# Auth Connect Resilience Batch 1 — 2026-04-07

## Goal
Fix the "Connect button does nothing" regression path and make the auth gate resilient when native browser form submit behavior stalls, hot-reload drifts, or local browser quirks prevent the redirect from completing cleanly.

## Why this batch
- The current auth gate prefers a native form submit, which is correct, but if the browser never completes the navigation the operator only sees a stuck `Connecting` state.
- Existing auth tests prove the happy path, but the UX is still brittle when the submit path does not advance.
- The right fix is not replacing the native flow; it is keeping the native flow and adding a local self-healing fallback through the already-supported `/api/token` session exchange.

## Scope
1. Keep the native `/auth/connect` form submit as the primary path.
2. Add a timed fallback that automatically switches to local `/api/token` validation if the native submit does not complete.
3. Surface clearer inline status for empty-token, fallback, invalid-token, and unreachable-runtime cases.
4. Re-verify with auth/browser coverage and confirm the live site is reachable after the change.

## Constraints
- Do not introduce a cloud dependency.
- Do not bypass server validation.
- Reuse the existing local token exchange and session cookie flow.
- Keep the change targeted to `AuthGate` unless a touched test or route needs alignment.

## Acceptance criteria
- Clicking `Connect` always produces progress or an explicit error state instead of appearing inert.
- If native submit stalls, the auth gate automatically retries through the local token exchange and redirects on success.
- Invalid-token and runtime-unreachable outcomes remain explicit.
- `npm run type-check`, `npm run auth:e2e`, `npm run verify`, and `npm run handoff:write` pass.
- `127.0.0.1:3000` and the relevant auth surface still respond after the patch.
