---
name: implement
description: Delivers approved Nexus work through vertical slices, test-first proof, and two-axis review. Use when the operator explicitly asks to implement a settled specification or agent-ready task.
---

# Implement

## Overview

Build one task at a time, prove behavior, review standards and specification separately, then package authorized history.

## Authority boundaries

- Implementation authority is limited to the approved spec or task.
- Do not commit, push, publish, or start subagents unless the current request authorizes those actions.

## Workflow

1. Confirm the task, blockers, owned paths, and acceptance evidence.
2. Follow incremental implementation for one vertical slice.
3. Apply test-driven development at the pre-agreed seam.
4. Run focused and canonical project gates.
5. Review the diff independently against repository standards and the originating spec; perform sequential passes unless delegation is explicitly authorized.
6. Correct blocking findings and re-run proof.
7. Use the Git workflow only for actions authorized by the current request.

## Skill references

- @docs/ideas/skills/production-engineering/incremental-implementation/SKILL.md
- @docs/ideas/skills/production-engineering/test-driven-development/SKILL.md
- @docs/ideas/skills/production-engineering/code-review-and-quality/SKILL.md
- @docs/ideas/skills/production-engineering/git-workflow-and-versioning/SKILL.md

## Stop conditions

- A blocker is unresolved or scope is ambiguous.
- Verification or either review axis fails.

## Verification

- [ ] Acceptance and standards both pass.
- [ ] History actions stayed within granted authority.
