# Feature Spec — Release Hardening Phase 1

## Objective

Stabilize the Nexus Prime release baseline without removing product scope by improving:
- AI model-routing consistency
- runtime diagnostics visibility
- CI quality enforcement

## Scope

1. Create a shared task-to-model routing module used by both client (`lib/ai.ts`) and server (`app/api/ai/route.ts`), and align default local model in store.
2. Add `/api/status` endpoint with sanitized operational diagnostics (no secrets).
3. Add a CI workflow that enforces `type-check`, `lint`, and existing path-collision checks.
4. Update README quickstart references for local model defaults.

## Non-Goals

- No feature removals.
- No major product flow changes.
- No migration of existing tabs/components.

## Acceptance Criteria

- Single source of truth for task model mapping exists and is imported in both client and server AI code paths.
- `/api/status` returns non-sensitive readiness details and route availability signals.
- GitHub Actions includes a quality-gates workflow and passes with current code.
- `npx tsc --noEmit` passes after implementation.
