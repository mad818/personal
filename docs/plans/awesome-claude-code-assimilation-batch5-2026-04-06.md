# Awesome Claude Code Assimilation — Batch 5

## Goal

Turn scheduled mission governance from static posture into measured local efficiency by persisting prompt/cacheability snapshots for completed non-interactive runs.

## Why this batch

The scheduler already knows:

- which jobs are active
- which workflows are safe to automate
- which scheduled missions came from HQ workflow templates

What it still does not know is how expensive those jobs actually are once they run. Right now the scheduler only infers risk from prompt length and approval policy. The next step is to retain real local measurements per completed job so the drawer can answer:

- which jobs are still heavy
- which jobs have strong stable-prefix reuse potential
- which jobs have never produced an efficiency snapshot yet

That keeps the `awesome-claude-code` usage-monitor idea grounded in actual Nexus automation behavior, not guesses.

## Implementation

### ACC5.a — scheduled-run efficiency snapshot

- Extend scheduled job state with a persisted `lastEfficiency` snapshot.
- Capture it immediately after each non-interactive run with:
  - system prompt chars
  - volatile prompt chars
  - total prompt chars
  - output chars
  - stable-prefix chars
  - cacheability posture

### ACC5.b — governance analysis upgrade

- Teach `analyzeScheduledJobs()` to summarize real completed-run data:
  - completed efficiency snapshots
  - low-cacheability runs
  - heavy prompt runs
  - jobs that are still unmeasured
- Keep the existing policy guidance, but prefer real measurements when present.

### ACC5.c — scheduler drawer visibility

- Show per-job efficiency posture directly in the Cron Scheduler list for jobs that have run.
- Add scheduler-governance summary boxes for:
  - completed measurements
  - measured prompt load
  - low-cacheability runs
- Keep the messaging local-first and free-first.

## Result

- Scheduled automation becomes tunable from actual local evidence.
- Operators can see which recurring jobs are cheap, heavy, or still unmeasured.
- Nexus keeps pushing the strongest `awesome-claude-code` monitor ideas into its own scheduler without importing outside tooling or widening the product boundary.
