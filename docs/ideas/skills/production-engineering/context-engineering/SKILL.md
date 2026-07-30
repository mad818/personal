---
name: context-engineering
description: Builds the smallest authoritative context pack for Nexus work. Use when starting a session, changing subsystems, handing work off, or when stale summaries, excessive files, or missing project rules are reducing implementation accuracy.
---

# Context Engineering

## Overview

Load verified repository truth in authority order and keep only material that changes the current decision.

## Authority boundaries

- Human-maintained files and current source outrank generated summaries and inferred preferences.
- Keep private live-vault content local and untracked.
- Do not write second-brain or memory files unless Mario's current request authorizes it.

## Workflow

1. Run the repository handoff pull when project instructions require it.
2. Read `AGENTS.md`, `SECOND_BRAIN.md`, handoff, active tasks, and lessons.
3. Identify the exact subsystem and read its spec, public contract, owner, and tests.
4. Inspect current Git status and preserve unrelated work.
5. Verify drift-prone facts from manifests, source, or primary external documentation.
6. Summarize goal, boundaries, current evidence, unknowns, and next action in a compact task-local context pack.
7. Refresh context only when the task crosses a boundary or evidence changes.

## Stop conditions

- Two authoritative files conflict.
- Required source is inaccessible.
- The context pack would include secrets or unrelated private data.

## Verification

- [ ] Every included item changes a task decision.
- [ ] Current source was checked for drift-prone facts.
- [ ] Unknowns and contradictions are explicit.
- [ ] No generated summary silently overrode repository truth.
