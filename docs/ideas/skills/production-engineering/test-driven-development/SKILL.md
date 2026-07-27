---
name: test-driven-development
description: Proves Nexus behavior with focused failing evidence before the smallest passing change. Use when adding logic, fixing a bug, changing a contract, or creating a regression guard across unit, integration, route, runtime, or browser layers.
---

# Test Driven Development

## Overview

Choose the cheapest test that proves the requirement, observe it fail for the right reason, make it pass, then keep the canonical gates green.

## Authority boundaries

- Test public behavior and stable contracts, not incidental implementation.
- Do not weaken assertions, skip suites, or mock away the behavior under test.
- Browser and live tests require the same runtime and access authority as the task.

## Workflow

1. Translate one acceptance criterion into a precise observable assertion.
2. Select the lowest sufficient layer: pure function, integration, route, runtime fixture, or browser flow.
3. Add the focused test and run it before implementation.
4. Confirm failure is caused by the missing or incorrect behavior.
5. Implement the smallest passing change.
6. Run the focused test, adjacent regression lane, type-check, and lint.
7. Refactor only while all evidence remains green.

## Stop conditions

- The test passes before implementation for an unexplained reason.
- Required infrastructure cannot run in the current environment.
- A mock would replace the core behavior instead of isolating a boundary.

## Verification

- [ ] Red and green evidence target the same behavior.
- [ ] Boundary, empty, invalid, and failure cases are covered where relevant.
- [ ] Assertions would catch a plausible regression.
- [ ] No verification gate was relaxed.
