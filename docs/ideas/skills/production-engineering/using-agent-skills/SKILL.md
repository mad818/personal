---
name: using-agent-skills
description: Routes authorized Nexus work through the smallest complete production-engineering workflow. Use when starting project work, selecting among project skills, or chaining define, plan, build, verify, review, and ship phases.
---

# Using Agent Skills

## Overview

Select only the workflows the current request needs, keep their order explicit, and preserve the operator's scope throughout the chain.

## Authority boundaries

- A skill supplies procedure, never new permission.
- Do not add writes, network calls, provider use, tools, subagents, commits, pushes, deployments, or external actions unless the current request already authorizes them.
- Read `AGENTS.md`, `SECOND_BRAIN.md`, `docs/AGENT_HANDOFF.md`, `tasks/todo.md`, and `tasks/lessons.md` before project changes.
- Stop immediately when Mario says stop.

## Routing workflow

1. Classify the request:
   - unclear requirement: `interview-me` or `idea-refine`
   - significant change: `spec-driven-development`, then `planning-and-task-breakdown`
   - implementation: `incremental-implementation`
   - behavior change: `test-driven-development`
   - unfamiliar or changing source: `source-driven-development`
   - high-risk assumption: `doubt-driven-development`
   - UI or interface boundary: `frontend-ui-engineering` or `api-and-interface-design`
   - failure: `debugging-and-error-recovery`
   - pre-merge quality: `code-review-and-quality`, optionally `code-simplification`, `security-and-hardening`, or `performance-optimization`
   - durable history or delivery: `git-workflow-and-versioning`, `ci-cd-and-automation`, `documentation-and-adrs`, `deprecation-and-migration`, `observability-and-instrumentation`, or `shipping-and-launch`
2. Announce the minimum selected skill sequence and why it applies.
3. Read each selected `SKILL.md` fully before its phase begins.
4. Complete one phase's exit criteria before advancing.
5. If a phase reveals a missing decision or authority, stop and ask rather than widening the chain.

## Product sprint route

For a substantial product change, use the smallest applicable subsequence of:

1. `interview-me` or `idea-refine` — establish the real pain, user, and narrow
   wedge.
2. `spec-driven-development` — challenge scope and write the observable
   contract.
3. `planning-and-task-breakdown` plus `api-and-interface-design` or
   `frontend-ui-engineering` — lock data flow, failure states, design, and
   developer experience before implementation.
4. `incremental-implementation` and `test-driven-development` — build one
   verified slice at a time.
5. `code-review-and-quality`, `security-and-hardening`, and
   `browser-testing-with-devtools` — challenge assumptions and collect runtime
   evidence.
6. `shipping-and-launch` and, when useful,
   `observability-and-instrumentation` — package proof, rollout, rollback, and
   the next retrospective input.

Do not run every phase mechanically. A typo does not need a virtual company, and
a review request does not authorize implementation or shipping.

## Skill references

- @docs/ideas/skills/production-engineering/interview-me/SKILL.md
- @docs/ideas/skills/production-engineering/idea-refine/SKILL.md
- @docs/ideas/skills/production-engineering/spec-driven-development/SKILL.md
- @docs/ideas/skills/production-engineering/planning-and-task-breakdown/SKILL.md
- @docs/ideas/skills/production-engineering/incremental-implementation/SKILL.md
- @docs/ideas/skills/production-engineering/test-driven-development/SKILL.md
- @docs/ideas/skills/production-engineering/context-engineering/SKILL.md
- @docs/ideas/skills/production-engineering/source-driven-development/SKILL.md
- @docs/ideas/skills/production-engineering/doubt-driven-development/SKILL.md
- @docs/ideas/skills/production-engineering/frontend-ui-engineering/SKILL.md
- @docs/ideas/skills/production-engineering/api-and-interface-design/SKILL.md
- @docs/ideas/skills/production-engineering/browser-testing-with-devtools/SKILL.md
- @docs/ideas/skills/production-engineering/debugging-and-error-recovery/SKILL.md
- @docs/ideas/skills/production-engineering/code-review-and-quality/SKILL.md
- @docs/ideas/skills/production-engineering/code-simplification/SKILL.md
- @docs/ideas/skills/production-engineering/security-and-hardening/SKILL.md
- @docs/ideas/skills/production-engineering/performance-optimization/SKILL.md
- @docs/ideas/skills/production-engineering/git-workflow-and-versioning/SKILL.md
- @docs/ideas/skills/production-engineering/ci-cd-and-automation/SKILL.md
- @docs/ideas/skills/production-engineering/deprecation-and-migration/SKILL.md
- @docs/ideas/skills/production-engineering/documentation-and-adrs/SKILL.md
- @docs/ideas/skills/production-engineering/observability-and-instrumentation/SKILL.md
- @docs/ideas/skills/production-engineering/shipping-and-launch/SKILL.md

## Stop conditions

- The request is ambiguous in a way that changes the result.
- The next phase requires authority the operator did not grant.
- Current repository evidence contradicts the selected workflow.
- A required verification gate fails.

## Verification

- [ ] Every selected skill directly matches the task.
- [ ] The sequence is minimal and acyclic.
- [ ] Each completed phase has evidence.
- [ ] No skill widened authority or scope.
