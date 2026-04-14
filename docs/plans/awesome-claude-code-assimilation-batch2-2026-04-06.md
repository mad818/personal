# Awesome Claude Code Assimilation — Batch 2

## Goal

Extend the first assimilation batch from interactive runtime posture into scheduler and automation posture, without introducing any external dependency or changing Nexus's local-first boundary.

## Why this batch

The strongest next pattern from the `awesome-claude-code` ecosystem is not more commands. It is better visibility into:

- what should be automated
- what should stay human-gated
- where non-interactive jobs are likely to waste context or create risky writeback patterns

Nexus already had scheduler controls, but the operator still had to infer most of that posture from raw fields. This batch makes it explicit.

## Implementation

### ACC2.a — enrich workflow governance metadata

- Extend HQ workflow definitions with:
  - automation posture
  - automation guidance
- Keep the existing local slash-command registry as the source of truth.

### ACC2.b — add a scheduler governance helper

- Create a pure local helper that analyzes scheduled jobs for:
  - active count
  - durable artifact count
  - approve-on-write count
  - review-gated count
  - observe-only count
  - long prompt count
  - aggregate prompt weight
- Emit recommendations, not just raw counters.

### ACC2.c — expose scheduler posture in UI

- Add a scheduler governance card to the Cron Scheduler drawer.
- Surface:
  - usage-monitor guidance for non-interactive jobs
  - workflow automation candidates
  - review-only workflows
  - explicit note when durable outputs are paired with riskier approval modes

### ACC2.d — reflect the same posture in COMMAND

- Update the workflow ops card in COMMAND to show:
  - automation candidate count
  - per-workflow automation posture
  - automation guidance

## Expected result

- Scheduled jobs become governable instead of opaque.
- Operators can see which workflow families are candidates for future mission templates.
- Defensive workflows remain clearly review-only.
- The product absorbs the best “command + hook + governance” ideas from `awesome-claude-code` while staying fully Nexus-native.
