# Feature Spec — Cyber Surface Hardening

## Route

`/cyber`

## Objective

Ensure the CYBER tab remains stable under smoke and degraded conditions while maintaining its read-only / advisory boundary.

## Smoke contract

- Page loads and renders the CYBER shell within the performance budget.
- CVE or threat panels display content or an explicit loading state.
- No unhandled exceptions on mount.

## Degraded-state contract

- If NVD or threat feed APIs are unavailable, CYBER shows a data-unavailable indicator rather than a crash.
- BYOK provider removal shows a configure-provider prompt — no raw error surfaces to the user.
- Advisory content blocks render an empty-state skeleton rather than missing entirely without explanation.
- Privacy shield redaction remains active even when advisory data is partially unavailable.

## Advisory boundary

CYBER remains read-only / advisory. No automated exploitation, unauthenticated third-party scanning, or CVE-triggered shell execution is permitted in this surface.

## Validator proof

`npm run ga:surfaces:check` confirms `specs/features/cyber-hardening.md` exists and references `/cyber`.

## Non-Goals

- No feature removal.
- No change to existing CYBER component layout or privacy shield integration.
