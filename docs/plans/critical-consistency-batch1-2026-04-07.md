# Critical Consistency Batch 1 — Agent Settings Drift + Local Route Wrapper Safety

## Why this batch

The audit turned up two cross-cutting consistency problems that can quietly make the app feel broken even when the codebase still type-checks:

- the agent runtime still had its own `localStorage` settings reader, which can drift from live Zustand state and ignore the free-first normalization work
- several authenticated client surfaces were still calling protected local `/api/*` routes with raw browser `fetch(...)` instead of the shared `apiFetch(...)` wrapper
- the shared GET dedupe in `apiFetch(...)` returned the same `Response` object to concurrent callers, so one panel could consume the body and leave another panel with a dead response

## Goals

1. Make the agent runtime read live canonical settings instead of stale browser persistence.
2. Move the highest-signal remaining local-route callers onto `apiFetch(...)`.
3. Fix concurrent GET response reuse in the fetch wrapper so shared routes stop failing half-randomly.
4. Re-verify code health and live site reachability.

## Implementation plan

### CCB1 — Publish plan and backlog
- Record the audit findings and this remediation slice.

### CCB2 — Fix agent settings drift
- Remove the `localStorage` fallback in `lib/agent.ts`.
- Use live Zustand settings as the client-side canonical source.

### CCB3 — Fix `apiFetch(...)` response sharing
- Return per-caller response clones for deduplicated GET requests.
- Keep the existing lightweight in-flight dedupe behavior.

### CCB4 — Finish the highest-value local-route wrapper cleanup
- Move remaining VAULT memory-page, ask, detail, and file-back flows onto `apiFetch(...)`.
- Move `AgentHealthCard`, `SecurityDoctrineMatrix`, and `useLessons()` onto `apiFetch(...)`.
- Preserve useful local state on failure and avoid silent empty reads where practical.

### CCB5 — Re-verify code + runtime + browser reachability
- `npm run type-check`
- `npm run verify`
- `npm run auth:e2e`
- live reachability:
  - `http://127.0.0.1:3000`
  - `http://127.0.0.1:3000/vault`
  - `http://127.0.0.1:3000/command`
