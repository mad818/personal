# RECON Boundary Batch 2 — 2026-04-07

## Goal
Close the next critical RECON architectural gap: `ReconLookup` still performs its highest-risk BYOK lookups directly from the browser, even though those lanes should honor the repo's server-side key boundary.

## Why this batch
- `ReconLookup.tsx` still calls HIBP, VirusTotal, and Shodan directly from the browser.
- Those three lanes are the most critical because they use sensitive BYOK credentials and currently bypass the project's protected local `app/api` boundary.
- They also conflict with the `app/api/settings` contract that sensitive keys live server-side in `.env.local`, not in browser state.

## Scope
1. Add a protected local RECON lookup route for the HIBP / VirusTotal / Shodan lanes.
2. Validate `target`, `targetType`, and panel selection, rate-limit requests, and keep results in the existing compact HTML panel format.
3. Read HIBP / VirusTotal / Shodan keys server-side so the browser no longer calls those third parties directly.
4. Move the BYOK helpers in `ReconLookup.tsx` onto the new local route and add compact offline/retained-result trust posture to the surface.
5. Register the new route in route policy, extend route-policy coverage, refresh handoff docs, and re-verify.

## Security constraints
- No open proxy behavior.
- No secret exposure to the browser.
- No raw server-side key values returned.
- All upstream fetches stay on the server behind the existing authenticated local route model.

## Acceptance criteria
- HIBP / VirusTotal / Shodan lookups no longer call third parties directly from the browser.
- HIBP / VirusTotal / Shodan use server-side keys only.
- `ReconLookup` disables new scans while the browser is offline and preserves last successful local results on failure.
- The new route is covered by route policy and passes `check:route-policy`.
- `npm run type-check`, `npm run verify`, and `npm run handoff:write` pass.
