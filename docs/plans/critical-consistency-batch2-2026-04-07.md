# Critical Consistency Batch 2 — Remaining Local Route Sweep + Hot-Path Churn

## Why this batch

After the first consistency pass, the remaining highest-value issues were still cross-cutting:

- a few important authenticated client surfaces still called protected local routes with raw browser `fetch(...)`
- the local memory durability sync still built a full JSON string every render just to detect changes
- the new vehicle readiness UI still compared checklist/profile state with `JSON.stringify(...)` instead of cheap structural checks

These are better to fix before the giant file splits, because they directly affect trust, responsiveness, and the odds of another “why is the app acting weird?” session.

## Goals

1. Finish the most important protected local fetch conversions.
2. Reduce hot-path JSON churn in memory sync and vehicle readiness.
3. Keep the free-first/local-first boundary unchanged.
4. Re-verify code health and live site reachability.

## Implementation plan

### CCB2.1 — Publish plan and reprioritize queue
- Record why the next work is boundary/churn first, refactors second.

### CCB2.2 — Finish the remaining important local-route wrappers
- Move `HeadersAudit`, `HealthMonitor`, `HomeChat`, `MemorySpineSync`, and the learnings hook in `OfficeCommandCenter` onto `apiFetch(...)`.

### CCB2.3 — Reduce local memory sync churn
- Replace full-payload stringify comparison in `MemorySpineSync` with a lightweight metadata key.
- Keep full payload upload only for the actual sync request.

### CCB2.4 — Reduce vehicle readiness comparison churn
- Replace `JSON.stringify(...)` equality checks in first-day and bench checklist healing with explicit checklist comparisons.
- Replace connector-profile equality stringify with field comparison.

### CCB2.5 — Re-verify code + runtime + browser reachability
- `npm run type-check`
- `npm run verify`
- `npm run auth:e2e`
- live reachability:
  - `http://127.0.0.1:3000`
  - `http://127.0.0.1:3000/vehicle`
  - `http://127.0.0.1:3000/recon`
