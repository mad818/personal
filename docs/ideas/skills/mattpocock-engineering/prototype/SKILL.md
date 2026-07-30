---
name: prototype
description: Builds an isolated disposable experiment that answers one design question. Use when code or a visible UI comparison is cheaper and more reliable than further discussion, and the result must not enter production by accident.
---

# Prototype

## Overview

Choose one falsifiable question, create the smallest runnable experiment, capture the answer, and retire the code.

## Authority boundaries

- Use a contained temporary or explicitly named prototype path.
- Do not import prototype code into production, add dependencies, persist user data, or publish externally.
- The operator must approve any destructive cleanup outside a disposable path.

## Workflow

1. State the question and decision threshold.
2. Choose logic/state or UI-comparison evidence.
3. Define the isolation path, runtime, cleanup, and time budget.
4. Build only the controls and states needed to distinguish alternatives.
5. Run representative and edge scenarios.
6. Record findings, limitations, and the resulting decision.
7. Remove the disposable implementation and prove production reachability is unchanged.

## Stop conditions

- The prototype starts acquiring production dependencies or compatibility promises.
- The question can no longer be answered within the fixed budget.

## Verification

- [ ] Evidence answers the original question.
- [ ] Findings remain; prototype code and runtime state do not.
