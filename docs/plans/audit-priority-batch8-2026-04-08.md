# Audit Priority Batch 8 — Scheduler Drawer Sections + HQ Prelude Extraction

## Why this batch

After the previous compaction pass, two safe extraction seams were still clearly visible:

- the scheduler drawer still held large inline workflow-template and governance sections
- the HQ shell still kept its prelude/posture block inline inside `OfficeCommandCenter.tsx`

This batch turns those into real components so the next cleanup pass can keep shrinking the highest-churn files without mixing orchestration, state wiring, and bulky UI scaffolding.

## Goals

1. Split the scheduler drawer into real reusable sections without changing behavior.
2. Lift the HQ prelude/posture shell out of `OfficeCommandCenter.tsx`.
3. Keep the free-first/local-first posture unchanged.
4. Re-verify code, build, and live HQ reachability.

## Implementation plan

### AP8.1 — Extract scheduler workflow-template section
- Move the workflow mission-template block into a dedicated component.
- Keep the parent responsible for applying the chosen draft so behavior stays centralized.

### AP8.2 — Extract scheduler governance section
- Move the native-batch posture, audit export/import, saved-view, and governance card block into a dedicated section component.
- Keep state/control ownership in `CronSchedulerPanel.tsx`.

### AP8.3 — Extract HQ prelude/posture shell
- Move the HQ prelude copy, action badges/buttons, and posture grid into dedicated components.
- Keep `OfficeCommandCenter.tsx` focused on runtime orchestration and shell wiring.

### AP8.4 — Re-verify
- `npm run type-check`
- `npm run verify`
- `npm run build`
- `npm run hq:e2e`
- live reachability:
  - `http://127.0.0.1:3000`
  - `http://127.0.0.1:3000/hq`
