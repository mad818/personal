# Assistant-First Surface Redesign — Batch 2

Date: 2026-04-10

## Why this batch existed

Batch 1 established the shared redesign language, but only HQ and Resources actually used it. The rest of the GA tabs still read like collections of peer panels instead of assistant-led work surfaces.

## What changed

### 1. The redesign registry now supports segmented-view overrides

- Extended `lib/surfaceRedesignRegistry.ts` with optional view-level overrides so shared modules can keep one title while changing detail/summary/action language by active view.
- Used that for:
  - `ALPHA` shared `Market Tape`
  - `CYBER` shared `Evidence Feeds`
  - `RECON` shared `Collection Workbench`

### 2. Shared inner-module language

- Added `components/ui/SurfaceModuleSection.tsx` as the shared inner subsection wrapper used inside module cards.
- Added `components/ui/AssistantGuidanceStack.tsx` so guidance cues can render consistently outside HQ without creating a second card system.
- Updated `components/home/office/HQTerminalSection.tsx` to use the shared guidance stack instead of a bespoke map/render loop.

### 3. Remaining GA tabs migrated to module-led layouts

- `app/command/page.tsx`
  - now renders four top-level modules only:
    - `System Posture`
    - `Operational Brief`
    - `Programs & Workflows`
    - `Context Memory`
  - `Vector snapshot` is folded into `System Posture`
  - shared guidance now handles focused runtime/agent/memory sessions

- `app/intel/page.tsx`
  - segmented views now resolve through:
    - `News Brief`
    - `Theater Posture`
    - `Cross-Domain Impact`
    - `Forecast Posture`
    - `Sweep Workbench`
  - sweeps now keeps supporting posture compact through shared guidance

- `app/alpha/page.tsx`
  - views now resolve through:
    - `Market Brief`
    - `Setups`
    - `Momentum`
    - `Risk Plan`
    - `Market Tape`
  - `prices` and `charts` now share the same module title with per-view copy overrides

- `app/cyber/page.tsx`
  - views now resolve through:
    - `Threat Brief`
    - `Priority Grid`
    - `Evidence Feeds`
    - `Physical Ops`
  - triage and threat signals now read as one primary module instead of two peer cards

- `app/recon/page.tsx`
  - adds a compact `Target Brief` above the active workspace on every view
  - collection views now share one `Collection Workbench`
  - binary and OPSEC lanes are clearer as dedicated specialist modules

- `app/vault/page.tsx`
  - list and graph modes now reorganize around:
    - `Memory Brief`
    - `Archive Workbench`
    - `Durable Artifacts`
    - `Relations`
  - archive repair and graph-filter posture now render through shared guidance instead of more standalone maintenance copy

### 4. Coverage and closeout

- Updated `__tests__/surfaceRedesignRegistry.test.ts` to verify the new segmented-view overrides resolve correctly.
- Closed redesign backlog slices `SR1D`, `SR1E`, and the shared-guidance follow-through `BF4C2` in `tasks/todo.md`.

## Verification

Passed:

- `npm run type-check`
- `npm run verify`
- `npm run build`
- `npm run route:e2e`
- `npm run hq:e2e`

## Follow-on work

1. Resume the non-redesign backlog from `tasks/todo.md`, starting with deployment proof and the remaining archive/research compounding slices.
2. Keep the new module language stable; future surface work should extend the registry instead of reintroducing ad hoc top-level panel titles.
