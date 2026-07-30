---
name: spec-driven-development
description: Defines a bounded Nexus behavior contract before implementation. Use when starting new features, significant behavior changes, new routes or tools, migrations, or any task whose acceptance cannot be stated reliably in a few lines.
---

# Spec Driven Development

## Overview

Write the contract that implementation and verification must satisfy before code changes begin.

## Authority boundaries

- A spec describes approved work; it cannot authorize new external actions.
- Keep requirements testable and project-specific.
- Put feature specs in `specs/features/` and active work in `tasks/todo.md`.

## Workflow

1. Read the owning route, component, library, policy, and existing related specs.
2. Define outcome, source truth, existing seams, and operator benefit.
3. State functional behavior as numbered contracts.
4. State security, privacy, licensing, cost, and product-purpose boundaries.
5. List explicit exclusions and failure behavior.
6. Name exact verification lanes and evidence artifacts.
7. Add the implementation task to `tasks/todo.md` before code.

## Stop conditions

- The outcome or user-facing behavior is still ambiguous.
- The contract depends on an unavailable service or unverified source.
- Acceptance relies on subjective phrases such as "works well" without measurable proof.

## Verification

- [ ] Every requirement is observable or statically provable.
- [ ] Existing seams and ownership are named.
- [ ] Failure and rollback behavior are defined.
- [ ] Exclusions prevent scope creep.
