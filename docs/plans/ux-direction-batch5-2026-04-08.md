# UX Direction Batch 5 — Scheduler + Compiled Page Continuation

Date: 2026-04-08
Owner: Codex

## Why this batch

The app now preserves mission continuity across route changes and inside HQ replies / VAULT focus panels.
The next gap is that two high-value result surfaces still stop short of the next action:

1. Scheduler job cards show status, audit, and efficiency, but do not help the operator continue into the
   destination lane or artifact surface after a run.
2. Compiled memory page cards expose rich metadata and detail reads, but they still behave more like records
   than reusable launch points back into the working flow.

## Goal

Carry the same compact continuation pattern into:

- scheduler job results
- compiled-memory page detail reads

without increasing text density or adding another heavy action bar.

## Approach

1. Extend the shared continuation-actions component so it can:
   - take explicit route hints when those already exist
   - take extra targets like VAULT when a surface knows the artifact destination
2. Mount it in scheduler job cards:
   - memory from the scheduled prompt
   - route continuation from the workflow catalog when available
   - VAULT shortcut when the job targets review/vault output
3. Mount it in compiled-memory page detail views:
   - memory from the page title + summary
   - route continuation from the stored page route
   - optional VAULT continuation and return-to-HQ affordance

## Constraints

- Keep the UI compact and readable.
- Reuse centralized routing helpers instead of adding new routing logic in each panel.
- Preserve restricted-content boundaries; chips must never reveal withheld content.
- Keep free-first/local-first behavior unchanged.

## Success criteria

- Scheduler job cards lead naturally into the next working surface.
- Compiled-memory pages feel actionable instead of inert.
- The continuation model stays visually lightweight and consistent across HQ, VAULT, and scheduler flows.
