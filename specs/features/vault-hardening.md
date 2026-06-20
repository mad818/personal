# Feature Spec — Vault Surface Hardening

## Route

`/vault`

## Objective

Ensure the VAULT tab remains stable under smoke and degraded conditions, with compiled pages and artifact inspection failing closed safely.

## Smoke contract

- Page loads and renders the VAULT shell within the performance budget.
- Compiled page list renders or shows an explicit empty-state.
- Artifact upload or inspection input is mounted and accessible.
- No hydration mismatch on first load.

## Degraded-state contract

- If the local vector index (TurboVec) is unavailable, VAULT degrades to keyword search or an explicit index-unavailable message — no crash.
- If compiled page retrieval fails, the list shows a retry option rather than a blank area or thrown exception.
- Large file inspection that exceeds client-side limits shows a file-too-large message rather than a browser hang.
- Session memory (unfinished sessions) unavailability does not crash the VAULT shell.

## Validator proof

`npm run ga:surfaces:check` confirms `specs/features/vault-hardening.md` exists and references `/vault`.

## Non-Goals

- No feature removal.
- No change to existing VAULT artifact storage layout.
