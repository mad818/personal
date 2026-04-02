# Auth Hardening Plan

## Goal

Eliminate login regressions by reducing auth surface complexity, aligning server and client auth behavior, and adding repeatable verification for success, failure, and stale-state scenarios.

## Phase 1: Live Path Audit

- Confirm the exact route hit sequence for login:
  - `GET /hq`
  - `GET /api/token`
  - `POST /auth/connect`
  - redirect back to requested route
  - protected API access after redirect
- Confirm no stale auth state survives between attempts:
  - stale `sessionStorage`
  - stale cookie session
  - stale dev server process
  - stale client bundle after hot reload
- Confirm no login-critical behavior depends on decorative UI, background warm-up, or client-only transitions.

## Phase 2: Auth Surface Simplification

- Use native form submit for primary login handoff.
- Set server-backed session cookie on successful auth.
- Allow middleware to honor either bearer token or trusted session cookie.
- Normalize `NEXUS_TOKEN` the same way everywhere:
  - auth route
  - middleware
  - client validator
- Clear stale local auth state when validation fails.
- Keep lock-screen UI informative, but never let UI-only state block the real auth path.

## Phase 3: Regression Guardrails

- Verify invalid token returns a visible failure state.
- Verify valid token creates a cookie-backed session and unlocks protected routes.
- Verify protected APIs succeed after login without requiring a second manual auth step.
- Verify route redirects preserve the intended destination safely.
- Verify login still works after:
  - dev server restart
  - hard refresh
  - stale session token present
  - missing/invalid cookie present

## Phase 4: Future-Proofing

- Add browser-level auth E2E coverage for:
  - successful login
  - invalid login
  - stale session recovery
  - logout / session clear
- Add a small auth diagnostics view for local debugging:
  - token route state
  - runtime status
  - cookie session present or absent
  - current auth error code
- Keep login path minimal:
  - no duplicate auth channels
  - no hidden warm-up dependency
  - no UI lock state that can outlive the real request

## Current Status

Completed in code:

- Native form-based login handoff via `/auth/connect`
- Cookie-backed session auth
- Middleware normalization and cookie acceptance
- Stale local session cleanup
- Release smoke coverage for invalid and valid auth
- Explicit form-handoff verification
- Browser E2E auth coverage for invalid login, valid login, refresh persistence, stale-session reset, HQ shell hydration safety, overlay behavior, and canonical route contract checks
- Deterministic Playwright auth lane tuned for release gating (`workers: 1` + fresh web server)

Remaining recommended work:

- Expand the new `npm run auth:regression` flow into full browser-driven coverage
- Keep `npm run auth:e2e` green as the browser-level auth gate
- Keep `npm run hq:e2e` and `npm run route:e2e` available for focused reruns while `npm run auth:e2e` remains the full gate
- Keep `npm run runtime:consistency` and `npm run runtime:fresh-proof` green so auth is verified against the runtime the user is actually hitting
- Lightweight auth diagnostics panel for local troubleshooting
- Logout/session reset UX if desired
