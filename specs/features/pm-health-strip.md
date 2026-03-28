# PM Health Strip — Phase A

## What it does
A compact read-only status row inside the Settings drawer that answers:
"Is my engineering loop green, and what should I unblock next?"

## Surface
Settings drawer (`components/settings/SettingsDrawer.tsx`), inserted above `<RuntimeEvalTrend />`.

## Data sources
- `GET /api/status` (authenticated via `apiFetch`) — provides:
  - `status` field: `'ok'` or degraded
  - `readiness.evalPolicy.rollup.grade` — current eval grade (A/B/C/D/F/STALE)
  - `readiness.evalPolicy.rollup.degradedReasons` — array of reason strings
  - `readiness.evalPolicy.rollup.stale` — boolean
- No writes; no new API routes needed.

## UI (3 chips, compact row)
| Chip | Source | Green | Yellow | Red |
|------|--------|-------|--------|-----|
| STATUS | `status === 'ok'` | ok | — | degraded |
| EVAL | `rollup.grade` | A/B | C | D/F/STALE |
| NEXT UP | static GitHub link | — | — | — |

- Refresh icon button re-fetches `/api/status`
- Error state: "Status unavailable" muted text — never crashes drawer

## New state
None — component is self-contained (local `useState`), no Zustand slice needed.

## Edge cases
- API unreachable → show "unavailable" chip, no crash
- Stale eval → EVAL chip shows STALE in yellow
- No NEXUS_TOKEN set → 401 → treat as degraded

## Done when
Operator sees green/yellow/red status without leaving Settings.
