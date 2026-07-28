---
name: run-status-summary
description: Produces a compact, evidence-backed status view for current Nexus project work. Use when Mario asks what is happening, where work left off, what changed, what is running, whether checks passed, what is blocked, or what should happen next.
---

# Run Status Summary

## Overview

Answer the operator's status questions from current repository and tool evidence.
Do not estimate context usage, cost, runtime activity, agents, remote state, or
completion when the host does not expose those facts.

Use
@docs/ideas/skills/production-engineering/observability-and-instrumentation/SKILL.md
for privacy-safe evidence design.

## Evidence order

1. Active user request and the latest commentary/tool result.
2. Current task plan or `tasks/todo.md` item.
3. Git branch and concise status.
4. Focused check results from this run.
5. Running task or process state only when a current tool reports it.
6. Handoff and remote publication state.

Human-maintained files and live tool results outrank generated summaries. Do not
read secrets, private vault content, full transcripts, or unrelated files for a
status answer.

## Compact status format

Report only fields that matter:

- `Now` — the single in-progress outcome;
- `Done` — verified results from this run;
- `Checks` — passed, failed, running, or not run;
- `Blocked` — exact blocker and whether it is local, manual, or remote;
- `Next` — the smallest safe next action.

Add `Branch` or `Dirty` only when useful. Distinguish task-owned changes from
pre-existing user work. Use `unknown` or omit a field when evidence is absent.

## Host compatibility

- In project-aware ChatGPT/Codex, use commentary for live progress and the final
  response for the self-contained status.
- Use task or thread tools only when the user asks to inspect or manage Codex
  tasks.
- Do not claim a persistent terminal HUD, native token bar, transcript parser,
  or Claude status-line integration.
- If a platform exposes current budgets or process status through a tool, quote
  that tool result rather than estimating it.

## Verification

- [ ] Every reported fact has current evidence.
- [ ] Unknown fields are not estimated.
- [ ] Failures and remote publication are reported separately from local
  completion.
- [ ] Private content and secrets are absent.
- [ ] The next action is singular and actionable.
