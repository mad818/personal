---
name: incremental-implementation
description: Delivers Nexus changes as complete verified vertical slices. Use when implementing an approved multi-file feature or behavior change that should remain reviewable, reversible, and functional after every step.
---

# Incremental Implementation

## Overview

Implement one observable outcome at a time, prove it, inspect the result, and only then widen the change.

## Authority boundaries

- Touch only files owned by the current slice.
- Never revert or stage unrelated user changes.
- Use existing project helpers and boundaries before adding abstractions or dependencies.

## Workflow

1. Confirm the current slice's contract, files, and proof.
2. Read each relevant file section fully before editing.
3. Add the smallest behavior and its focused proof together.
4. Run the narrowest relevant check.
5. Read the patched section and inspect the diff for accidental scope.
6. Run type-check and lint for code changes.
7. Mark the slice complete only after its evidence passes; then begin the next slice.

## Stop conditions

- A required change falls outside the approved slice.
- Existing dirty work overlaps the needed files.
- The focused gate fails for reasons not understood.
- The implementation needs a new dependency or external authority.

## Verification

- [ ] The slice is reachable end to end.
- [ ] Focused proof fails without the behavior and passes with it.
- [ ] No unrelated path changed.
- [ ] The repository remains coherent for the next slice.
