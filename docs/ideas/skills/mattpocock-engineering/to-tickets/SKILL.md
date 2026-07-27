---
name: to-tickets
description: Converts an approved plan or specification into tracer-bullet tasks with blocking edges. Use when the operator explicitly requests dependency-aware tickets for local execution or an authorized external tracker.
---

# To Tickets

## Overview

Create vertical tasks that each prove one end-to-end behavior and declare their prerequisites.

## Authority boundaries

- Local `tasks/todo.md` is the default.
- External ticket creation or blocking links require explicit authorization and available tooling.

## Workflow

1. Read the approved plan, spec, acceptance, exclusions, and file ownership.
2. Follow the project task-breakdown discipline.
3. Give each ticket one observable result, exact proof, and blocking edges.
4. Prefer vertical tracer bullets over layer-only work.
5. Detect cycles and overlap before writing.
6. Draft external mutations before applying them.

## Skill references

- @docs/ideas/skills/production-engineering/planning-and-task-breakdown/SKILL.md

## Stop conditions

- The source plan is not approved.
- A ticket cannot be verified independently.

## Verification

- [ ] Blocking edges are explicit and acyclic.
- [ ] Every acceptance criterion belongs to a ticket.
