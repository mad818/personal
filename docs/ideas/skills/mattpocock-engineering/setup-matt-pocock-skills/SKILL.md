---
name: setup-matt-pocock-skills
description: Configures local issue, task, and domain-document conventions for the engineering flows. Use when the operator explicitly requests setup or a flow cannot find an authoritative tracker or documentation layout.
---

# Setup Matt Pocock Skills

## Overview

Reconcile the flows with existing Nexus authorities before proposing any configuration.

## Authority boundaries

- Inspect first and show a draft before writing.
- Default to `tasks/todo.md`, `specs/features/`, `SECOND_BRAIN.md`, and existing ADR conventions.
- Never create labels, issues, global config, or host plugins implicitly.

## Workflow

1. Read root instructions, task/spec systems, current docs, remotes, and existing tracker conventions.
2. Report what is already authoritative and what is genuinely missing.
3. Recommend local files unless the operator selects an available external tracker.
4. Draft only the minimal routing note needed by the flows.
5. Write after explicit approval and update in place rather than duplicating authority.

## Stop conditions

- Existing authorities conflict.
- External configuration or writes are not explicitly authorized.

## Verification

- [ ] No competing task, context, or handoff system was created.
- [ ] Every configured destination exists and is discoverable.
