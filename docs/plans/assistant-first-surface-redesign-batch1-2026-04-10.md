# Assistant-First Surface Redesign — Batch 1

Date: 2026-04-10

## Why this batch existed

The assistant-first groundwork was already in place, but the visible surfaces still read like many adjacent smart cards instead of one assistant-led operating system. This batch starts the redesign as a real system, not a visual refresh.

## What changed

### 1. Shared redesign registry

- Added `lib/surfaceRedesignRegistry.ts` as the whole-system spec pack for the 8 GA tabs.
- The registry now defines:
  - surface-level redesign summaries
  - merged top-level modules
  - box-to-module disposition mapping for the current visible titled boxes
  - Resources workbench job specs and per-view redesign copy

### 2. Shared surface module primitive

- Added `components/ui/SurfaceModuleCard.tsx`.
- This becomes the shared presentation wrapper for assistant-first modules:
  - title
  - detail
  - role badge
  - summary
  - one strongest action or supporting note

### 3. HQ reference-surface redesign

- Updated `components/home/office/HQStrategiumDeck.tsx` to merge the old strategium card sprawl into:
  - `Mission Brief`
  - `Next Move`
  - `Runtime & Continuity`
- Updated `components/home/office/HQTerminalSection.tsx` so the empty chronicle matches the new workspace language and the old `WORKFLOW COMMANDS` band is demoted into a lighter composer hint.

### 4. Resources reference-surface redesign

- Updated `app/resources/page.tsx` to collapse `Use this page for`, `Operator reminder`, and `Coverage snapshot` into one `How This Helps` module.
- Updated `components/resources/ResourcesWorkbench.tsx` to introduce the four assistant-led workbench jobs:
  - `Find the right lane`
  - `Start safely`
  - `Understand the system`
  - `Open the exact session`
- The active Resources views now use registry-driven title/detail/summary copy instead of repeating posture cards with ad hoc phrasing.

### 5. Coverage

- Added `__tests__/surfaceRedesignRegistry.test.ts` to ensure:
  - the 8 GA surfaces are covered
  - every current visible box maps to an existing redesign module
  - Resources workbench views stay aligned with the redesign job model

## Verification

Passed:

- `npm run type-check`
- `npm run build`
- `npm run hq:e2e`
- `npm run route:e2e`
- `npm run verify`

## Follow-on work

1. Carry the redesign system through `COMMAND`, `INTEL`, `ALPHA`, `CYBER`, `RECON`, and `VAULT`.
2. Reuse the shared module language and `assistantGuidance[]` beyond HQ in heavier surfaces that still duplicate helper copy.
3. Run a final cross-surface density and title audit once the remaining tabs are migrated.
