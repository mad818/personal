# RECON Boundary Batch 1 — 2026-04-07

## Goal
Close the next critical RECON architectural/security gap: some panels still call third-party services directly from the browser instead of going through protected local `app/api` routes, which weakens CSP/network-mode boundaries and makes degraded/offline handling less trustworthy.

## Why this batch
- `PassiveDnsPanel` still calls CIRCL and HackerTarget directly from the browser.
- `OpsecPanel` still calls Tor Project directly from the browser, and on failure it silently falls back to “Not routed through Tor,” which is misleading.
- Repo policy is explicit: external API calls should be proxied through `app/api`.

## Scope
1. Add protected local connector routes for passive DNS / reverse-IP lookups and Tor exit-node checks.
2. Add validation, rate limiting, and private-cache/no-store semantics to those routes.
3. Move `PassiveDnsPanel` to the new local passive-DNS route.
4. Move the Tor lane in `OpsecPanel` to the new local route and make failure semantics explicitly degraded/unavailable instead of false-negative.
5. Register the new routes in route policy and keep the rest of RECON unchanged for this batch.

## Security constraints
- No open proxy behavior.
- No secret exposure.
- No raw remote IP or infrastructure-identifying details surfaced to the browser from the Tor check.
- All new routes must use the protected local API conventions already used elsewhere in the app.

## Acceptance criteria
- `PassiveDnsPanel` no longer fetches third-party passive-DNS sources directly from the browser.
- `OpsecPanel` no longer fetches the Tor Project endpoint directly from the browser.
- The Tor lane in `OpsecPanel` clearly distinguishes `not on Tor` from `Tor check unavailable`.
- New RECON routes are covered by route policy and pass `check:route-policy`.
- `npm run type-check`, `npm run verify`, and `npm run handoff:write` pass.
