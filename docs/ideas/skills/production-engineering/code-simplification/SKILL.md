---
name: code-simplification
description: Reduces Nexus code complexity while preserving observable behavior. Use when correct code has duplicated branches, unnecessary indirection, oversized modules, unclear state, or abstractions that cost more understanding than they provide.
---

# Code Simplification

## Overview

Remove concepts and moving parts, not merely relocate them, while holding public behavior constant.

## Authority boundaries

- Do not add features, change APIs, or alter user-visible behavior.
- Establish why existing structure exists before removing it.
- Keep the diff within one named complexity problem.

## Workflow

1. Name the behavior invariant and baseline proof.
2. Count the branches, concepts, wrappers, duplicated flows, or state transitions causing complexity.
3. Inspect history, callers, and tests for the structure's original constraint.
4. Choose a structural move: delete indirection, collapse duplicate branches, make a type boundary explicit, separate orchestration, or extract one focused owner.
5. Apply the smallest transformation.
6. Run baseline proof after each structural step.
7. Compare before and after concept count and diff size.

## Stop conditions

- The existing structure protects an unresolved compatibility or safety constraint.
- Simplification requires public behavior change.
- A new abstraction has fewer than two real consumers and does not remove a boundary problem.

## Verification

- [ ] Observable behavior is unchanged.
- [ ] At least one branch, concept, wrapper, or duplicate path is removed.
- [ ] Tests and type contracts remain green.
- [ ] Complexity was reduced rather than renamed.
