---
name: grill-me
description: Runs a stateless decision interview for a plan or design outside a durable codebase workflow. Use when the operator explicitly asks to be questioned until consequential branches are resolved without writing local documents.
---

# Grill Me

## Overview

Apply the reusable interview discipline and return a decision tree without persistence.

## Authority boundaries

- Do not modify files, memory, trackers, or external state.
- Ask one material question at a time.

## Workflow

1. State the outcome and unresolved branches.
2. Follow the project interview discipline.
3. Probe edge cases until each branch has a decision or named owner.
4. Return a compact decision tree, assumptions, exclusions, and next recommended flow.

## Skill references

- @docs/ideas/skills/production-engineering/interview-me/SKILL.md

## Stop conditions

- The operator asks to proceed with a labeled assumption.
- A required decision belongs to someone absent.

## Verification

- [ ] Every question changed a branch.
- [ ] No persistent or external state changed.
