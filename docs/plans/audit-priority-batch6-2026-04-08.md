# Audit Priority Batch 6 — HQ Post-Run Module Split

## Why this batch

`OfficeCommandCenter.tsx` is still one of the riskiest files in the app, and the safest way to keep shrinking it is to peel off pure or mostly deterministic sidecar logic first.

The next high-signal candidate was the large post-run block inside `send()`:

- passive memory note assembly
- successful learnings writeback
- workflow artifact filing
- session summary formatting
- lesson proposal text generation

That logic is important, but it does not need to live inline with the HQ orchestration path.

## Goals

1. Move the bulky post-run sidecar logic out of `OfficeCommandCenter.tsx`.
2. Keep HQ routing, agent execution, and UI behavior unchanged.
3. Re-verify HQ at both code and browser level.

## Implementation plan

### AP6.1 — Extract a dedicated post-run helper module
- Add a new `officeCommandCenterPostRun.ts` module.
- Move deterministic post-run string building and fire-and-forget writeback there.

### AP6.2 — Keep `send()` orchestration-focused
- Replace the large inline success block with calls into the new helper module.
- Preserve all current routes, writeback targets, and lesson behavior.

### AP6.3 — Re-verify
- `npm run type-check`
- `npm run verify`
- `npm run hq:e2e`
- live reachability:
  - `http://127.0.0.1:3000`
  - `http://127.0.0.1:3000/hq`
