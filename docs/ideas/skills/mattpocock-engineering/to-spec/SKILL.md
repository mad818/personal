---
name: to-spec
description: Synthesizes already-resolved conversation context into a bounded Nexus feature contract. Use when the operator explicitly asks to turn the current discussion into a specification without another interview.
---

# To Spec

## Overview

Convert settled decisions into the existing Nexus spec format and keep publication separate.

## Authority boundaries

- Do not invent unresolved requirements.
- Write locally only when requested; external issue publication needs separate explicit authorization.

## Workflow

1. Extract outcome, decisions, boundaries, exclusions, and proof from the current conversation.
2. Reconcile them with current source and existing specs.
3. Mark contradictions or missing decisions instead of guessing.
4. Follow the project spec-driven workflow.
5. Save to `specs/features/` and update `tasks/todo.md` only within approved scope.
6. Offer external publication as a separate action if a configured tracker exists.

## Skill references

- @docs/ideas/skills/production-engineering/spec-driven-development/SKILL.md

## Stop conditions

- The conversation has not resolved a material branch.
- Publication authority is missing.

## Verification

- [ ] Every requirement traces to the conversation or repository truth.
- [ ] Local and external outcomes are reported separately.
