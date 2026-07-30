---
name: planning-and-task-breakdown
description: Decomposes an approved Nexus spec into dependency-ordered verifiable slices. Use when a task spans three or more steps, multiple files or layers, or needs safe checkpoints before implementation.
---

# Planning And Task Breakdown

## Overview

Turn a behavior contract into small end-to-end tasks that leave the repository coherent after each completed slice.

## Authority boundaries

- Plan only the approved scope.
- Do not hide speculative extras inside implementation tasks.
- Preserve unrelated dirty work and assign explicit file ownership when parallel work is authorized.

## Workflow

1. Extract required behaviors, boundaries, exclusions, and proof from the spec.
2. Map each behavior through its real route, component, library, state, API, policy, and validation seams.
3. Order prerequisites before consumers.
4. Split work into vertical slices with one observable outcome each.
5. Give every slice exact files or ownership, acceptance checks, and rollback notes.
6. Mark at most one task in progress.
7. Write the plan to `tasks/todo.md` and keep statuses current.

## Stop conditions

- A task cannot be verified independently.
- Two tasks would edit the same dirty file without coordination.
- The plan creates scaffolding with no reachable consumer.

## Verification

- [ ] Every required behavior belongs to one task.
- [ ] Dependencies are explicit and acyclic.
- [ ] Each slice keeps the product usable.
- [ ] File overlap and rollback risks are visible.
