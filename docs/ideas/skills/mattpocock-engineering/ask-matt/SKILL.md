---
name: ask-matt
description: Routes an operator-selected task through the smallest applicable Nexus engineering flow. Use when the operator explicitly asks which alignment, planning, implementation, review, architecture, teaching, or continuity workflow fits.
---

# Ask Matt

## Overview

Choose one explicit entrypoint and the few reusable disciplines it needs.

## Authority boundaries

- Route only; do not start work or external actions.
- User-invoked flows remain unavailable to implicit model routing.

## Workflow

1. Classify the request as alignment, incoming issue, architecture health, specification, task slicing, implementation, large-effort discovery, standalone interview, handoff, teaching, or skill authoring.
2. Recommend one primary flow and name its outputs.
3. State optional detours only when they answer a blocking question.
4. Confirm local versus external tracker posture before any tracker flow.
5. Hand control to the selected skill.

## Skill references

- @docs/ideas/skills/mattpocock-engineering/grill-with-docs/SKILL.md
- @docs/ideas/skills/mattpocock-engineering/triage/SKILL.md
- @docs/ideas/skills/mattpocock-engineering/improve-codebase-architecture/SKILL.md
- @docs/ideas/skills/mattpocock-engineering/setup-matt-pocock-skills/SKILL.md
- @docs/ideas/skills/mattpocock-engineering/to-spec/SKILL.md
- @docs/ideas/skills/mattpocock-engineering/to-tickets/SKILL.md
- @docs/ideas/skills/mattpocock-engineering/implement/SKILL.md
- @docs/ideas/skills/mattpocock-engineering/wayfinder/SKILL.md
- @docs/ideas/skills/mattpocock-engineering/grill-me/SKILL.md
- @docs/ideas/skills/mattpocock-engineering/handoff/SKILL.md
- @docs/ideas/skills/mattpocock-engineering/teach/SKILL.md
- @docs/ideas/skills/mattpocock-engineering/writing-great-skills/SKILL.md

## Stop conditions

- The request needs a material decision before routing.
- The chosen flow requires authority or tooling not available.

## Verification

- [ ] Exactly one primary flow is selected.
- [ ] Invocation and external-action boundaries are explicit.
