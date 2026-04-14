# Awesome Claude Code Assimilation — Batch 4

## Goal

Make scheduled workflow missions auditable by carrying workflow lineage and automation posture through both the scheduler UI and the artifacts those jobs create.

## Why this batch

Batch 3 made it easy to prefill scheduled missions from safe HQ workflows. The next gap is traceability:

- the job list should show which workflow a scheduled mission came from
- registry and memory artifacts should retain the originating workflow id, label, and automation posture

Without that, future audits have to infer too much from freeform job names.

## Implementation

### ACC4.a — workflow lookup helper

- Add a catalog lookup helper keyed by `templateId`.
- Reuse the existing HQ workflow registry as the single source of truth.

### ACC4.b — scheduler UI lineage

- Show workflow lineage on scheduled jobs when present:
  - command
  - source
  - automation posture
- Keep non-template jobs unchanged.

### ACC4.c — artifact writeback lineage

- Scheduler-created registry items should include:
  - workflow tags when the job came from a template
  - automation posture notes
- Scheduler-created memory pages should include:
  - `workflowId`
  - `workflowLabel`
  - automation-posture tags

## Result

- Scheduled missions become easier to inspect and audit.
- Memory pages and registry artifacts can be traced back to their workflow origin.
- Nexus keeps the strongest governance ideas from `awesome-claude-code` while staying local-first and self-owned.
