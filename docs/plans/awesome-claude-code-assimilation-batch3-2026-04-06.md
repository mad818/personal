# Awesome Claude Code Assimilation — Batch 3

## Goal

Turn the safest HQ slash workflows into prefilled scheduled mission templates while keeping defensive workflows clearly review-only.

## Why this batch

Batch 1 made command governance visible. Batch 2 made scheduler posture visible. The next useful step is to connect them:

- low-risk workflows should be easy to schedule with human-gated defaults
- defensive workflows should stay visible but not present as silent automation candidates

This keeps Nexus aligned with the strongest command-governance ideas from `awesome-claude-code` without importing an outside workflow engine.

## Implementation

### ACC3.a — workflow-backed scheduler defaults

- Extend the HQ workflow catalog with:
  - scheduler template defaults
  - cron suggestion
  - output target
  - approval policy
  - topic placeholder
- Keep the workflow registry as the single source of truth.

### ACC3.b — scheduler draft helper

- Add a helper that converts a workflow id plus optional topic into a prefilled scheduled mission draft.
- Use the workflow prompt builder directly so scheduled jobs and live commands stay aligned.

### ACC3.c — Cron Scheduler template UI

- Add a “Workflow Mission Templates” section to the scheduler drawer.
- Candidate workflows:
  - prefill the scheduler form
  - default to `human_gate`
  - carry a template id for future auditing
- Review-only workflows:
  - remain visible
  - do not prefill automation drafts
  - explain why they stay operator-reviewed

## Result

- Operators can turn `/deepresearch`, `/lit-review`, `/compare`, and `/brief` into scheduled missions in one click.
- `/threat-hunt` and `/evidence-pack` remain clearly review-only.
- Scheduler posture and workflow posture now reinforce each other instead of drifting apart.
