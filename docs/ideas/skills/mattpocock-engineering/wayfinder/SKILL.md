---
name: wayfinder
description: Maps a foggy multi-session effort into decision tasks that reduce uncertainty before delivery planning. Use when the operator explicitly selects a project or feature too large for one context window and the path is not yet buildable.
---

# Wayfinder

## Overview

Produce decisions, not deliverables, until the route to a specification is clear.

## Authority boundaries

- Do not implement from the decision map.
- Use local task artifacts by default; external tracker writes need explicit authorization.

## Workflow

1. Define destination, known constraints, and the current fog boundary.
2. Split uncertainty into decision tasks with evidence requirements and blocking edges.
3. Resolve blockers-first, one decision per bounded session.
4. Record findings and newly revealed decisions without expanding delivery scope.
5. Recompute the map after each resolved decision.
6. When the route is clear, hand off to `to-spec`, then `to-tickets`.

## Skill references

- @docs/ideas/skills/production-engineering/planning-and-task-breakdown/SKILL.md

## Stop conditions

- The effort is already small and buildable.
- A decision requires stakeholder or external authority not present.

## Verification

- [ ] Tasks produce decisions rather than code.
- [ ] The final map can collapse into a bounded spec.
