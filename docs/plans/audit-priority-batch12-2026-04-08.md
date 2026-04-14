# Audit Priority Batch 12 — HQ console shell + scheduler composer decomposition

Date: 2026-04-08
Owner: Codex

## Why this batch

`OfficeCommandCenter.tsx` and `CronSchedulerPanel.tsx` are healthier after the last split, but they still each carry one large inline UI block:

- HQ still owns the entire console shell render path:
  - header status strip
  - office scene stage
  - splitter controls
- Scheduler still owns the entire job-creation composer:
  - name/prompt/cron inputs
  - mission templates
  - workflow template launcher
  - validation copy

Those sections are stable seams and can be extracted without changing the runtime model.

## Goals

1. Extract the HQ header + office stage + splitter into a dedicated shell section component.
2. Extract the scheduler composer into a dedicated section component.
3. Use the compact-note pattern in the scheduler composer so guidance stays available without adding more visible text weight.
4. Re-verify code gates and live app reachability on `127.0.0.1:3000`.

## Constraints

- No provider/runtime behavior changes.
- Free-first/local-first defaults stay unchanged.
- Smallest change that solves the cleanup goal.
- Do not stop the live dev server just to run `build`; keep the site running for the operator.

## Expected outcome

- Smaller parent files with clearer orchestration boundaries.
- Less visible text clutter in the scheduler drawer.
- Easier follow-up splits on the remaining HQ and scheduler logic blocks.
