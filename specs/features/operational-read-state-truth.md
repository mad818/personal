# Operational Read State Truth

## Problem

The CISA KEV proxy converts upstream HTTP and network failures into HTTP 200 responses containing an empty vulnerability list. The dedicated CISA panel, unified CYBER triage, and cyber sweep can therefore interpret an outage as a successful zero-record catalog. Agent Health separately ignores failed reads and then labels its empty default as “No agent health metrics yet.”

## Contract

- `/api/cisa-kev` returns a safe non-2xx response for upstream HTTP, network, JSON, or payload-shape failures and does not disclose raw exception text.
- One small client JSON boundary converts HTTP, network, JSON, and caller-defined payload validation failures into a non-throwing result.
- CISA Feed, unified CYBER triage, and Agent Health distinguish loading, verified empty, retained data with refresh failure, and unavailable-without-data.
- Only validated successful payloads replace current data or update freshness metadata.
- Newly visible failures use `role="alert"`; routine loading uses `role="status"`; every failure has a local retry.
- A stale or unmounted request cannot overwrite the current component state.

## Boundaries

- Keep CISA and Agent Health routes, navigation, sorting, filters, colors, and successful-data presentation intact.
- Do not invent fallback vulnerabilities or health metrics, call providers, add dependencies, or expose raw upstream errors.
- Do not touch phone/PWA acceptance or RPG paths.

## Verification

- Runtime fixtures prove the shared client boundary across success, HTTP failure, invalid JSON, invalid payload, and rejected request.
- Static coverage protects the CISA non-2xx/safe-error route contract, all three truthful UI branches, retry/live-region semantics, retained-data behavior, and canonical wiring.
- TypeScript, lint, formatting, canonical verification, production build, publication safety, handoff, diff, and changed-path checks complete before handoff.
