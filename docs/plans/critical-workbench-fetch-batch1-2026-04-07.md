# Critical Workbench Fetch Batch 1 — Protected Local Fetch Consistency

## Why this batch

Several internal/workbench surfaces still call protected local `/api/*` routes with raw browser `fetch(...)` and little or no failure handling.

That creates a trust gap:

- some panels rely on cookie auth implicitly instead of the shared authenticated fetch path
- failures can look like “empty state” instead of “protected route failed”
- retained local state is not preserved consistently on reload / mutation failure

## Goals

1. Move the highest-value protected local-workbench panels onto `apiFetch(...)`.
2. Add minimal, clear degraded/error posture instead of silent empty states.
3. Preserve existing data when refresh/mutation fails instead of clearing useful operator context.
4. Keep the site stable and verify live reachability at the end.

## Implementation plan

### CWF1 — Publish plan and backlog
- Record the protected-fetch audit findings.

### CWF2 — Harden INTEL / RESOURCES read lanes
- Move `GeoDeltaPanel` and `RegistryConsole` to `apiFetch(...)`.
- Add compact degraded/error posture instead of silent empty reads.

### CWF3 — Harden SKILLS mutation/read lanes
- Move `BlacksiteLab` and `WorkflowForge` to `apiFetch(...)`.
- Catch mutation failures, preserve current data, and surface compact operator-readable errors.

### CWF4 — Harden COMMAND / INTEL mission panels
- Move `MemorySpineStatusCard` and `SweepEnginePanel` to authenticated local fetches.
- Add stream/request failure handling so the user sees degraded posture rather than an empty-looking panel.

### CWF5 — Re-verify code + runtime + browser reachability
- `npm run type-check`
- `npm run verify`
- `npm run auth:e2e`
- live reachability:
  - `http://127.0.0.1:3000`
  - `http://127.0.0.1:3000/command`
  - `http://127.0.0.1:3000/intel`
