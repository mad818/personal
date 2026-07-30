---
name: writing-great-skills
description: Designs concise predictable project skills with correct invocation and evidence contracts. Use when the operator explicitly asks to create, revise, split, prune, or validate a skill and its human-facing metadata.
---

# Writing Great Skills

## Overview

Choose invocation deliberately, encode a checkable process, and remove prose that does not change behavior.

## Authority boundaries

- Follow the current Codex skill-creator instructions first.
- Create skills only in the operator-selected or approved project location.
- Do not install, publish, or distribute a skill implicitly.

## Workflow

1. Define concrete trigger examples and non-triggers.
2. Choose user-only invocation for explicit orchestration or implicit invocation for reusable discipline.
3. Give each ordered step a checkable completion criterion.
4. Keep frontmatter concise and move optional detail behind one-level references.
5. Remove duplicated, stale, vague, and no-op instructions.
6. Generate matching UI metadata.
7. Run skill-creator and project security/dependency validation.

## Stop conditions

- The skill duplicates an existing complete workflow.
- Destination or invocation authority is unclear.

## Verification

- [ ] Triggering, process, stop, and evidence behavior are predictable.
- [ ] Metadata and dependency checks pass.
