# Audit Priority Batch 3 — Auth Boundary Closeout + Office Command Split Start

## Why this batch

The audit queue is now past the broad boundary cleanups and into the remaining high-value edges:

- `AuthGate` was still the last deliberate client-side raw fetch special case
- `OfficeCommandCenter.tsx` remains one of the largest and riskiest files in the app, so the safest next step is to begin splitting out pure config/helpers before touching runtime behavior

## Goals

1. Close the last auth-boundary fetch inconsistency.
2. Start the `OfficeCommandCenter` decomposition with a low-risk extraction.
3. Keep behavior unchanged while reducing the blast radius of future HQ work.
4. Re-verify code and live browser reachability.

## Implementation plan

### AP3.1 — Publish plan and backlog ordering
- Record this batch as the next audit-priority step.

### AP3.2 — Close the auth fetch special case
- Move `probeAuthDiagnostics()` in `AuthGate` onto `apiFetch(...)`.

### AP3.3 — Start the `OfficeCommandCenter` split safely
- Extract pure constants, animation CSS, prompt presets, and stateless helpers into a dedicated config module.
- Keep the main component logic and runtime flow unchanged.

### AP3.4 — Re-verify code + runtime + browser reachability
- `npm run build`
- `npm run type-check`
- `npm run verify`
- `npm run auth:e2e`
- live reachability:
  - `http://127.0.0.1:3000`
  - `http://127.0.0.1:3000/hq`
  - `http://127.0.0.1:3000/vehicle`
