# Multi-sector Operator Export Batch 1 — 2026-04-07

## Goal
Improve operator handoff across multiple sectors of Nexus without widening any backend surface, secret exposure, or persistence footprint.

## Why this batch
- COMMAND already shows useful runtime-efficiency and workflow-governance posture, but those surfaces are hard to hand off cleanly.
- VAULT graph mode already supports local copy actions, but it still lacks a simple file export for the current visible graph node set.
- The safest cross-surface improvement is to export only data that is already visible in the UI and keep all actions local-only.

## Scope
1. Add a local clipboard summary to `RuntimeEfficiencyCard`.
2. Add a local clipboard summary to `WorkflowCommandOpsCard`.
3. Add a local JSON download for VAULT’s currently visible graph nodes.

## Security constraints
- No new routes.
- No backend persistence.
- No secret values.
- No hidden-node or filtered-out-node leakage.
- No restricted-body exposure beyond the existing sanitized visible metadata.

## Acceptance criteria
- COMMAND operators can copy the latest runtime efficiency posture in one click.
- COMMAND operators can copy the workflow command governance posture in one click.
- VAULT operators can download the current visible graph node set as JSON using only active filtered graph state.
- `npm run type-check`, `npm run verify`, and `npm run handoff:write` pass after the batch.
