---
name: interview-me
description: Resolves consequential ambiguity through one decision at a time. Use when a Nexus request lacks the goal, audience, boundary, success condition, or tradeoff needed to proceed without materially changing the result.
---

# Interview Me

## Overview

Turn an underspecified request into an implementation-ready decision record without overwhelming the operator.

## Authority boundaries

- Ask only questions whose answers materially change the result.
- Do not turn optional preferences into blockers.
- Do not modify files or external state during the interview.

## Workflow

1. Restate the known outcome and list only the unknowns that affect architecture, safety, scope, or acceptance.
2. Rank unknowns by downstream impact.
3. Ask one short question with two or three mutually exclusive choices and explain each tradeoff.
4. Record the answer in task-local context; do not write it to memory unless explicitly requested.
5. Repeat until the goal, exclusions, and acceptance evidence are sufficient to plan.
6. Return a compact decision summary and the next recommended workflow.

## Stop conditions

- A required choice belongs to a stakeholder who is not present.
- Options imply materially different products or external actions.
- The operator asks to proceed with a stated assumption; record it and stop interviewing.

## Verification

- [ ] Every question changed a meaningful decision.
- [ ] Goal, exclusions, and success evidence are explicit.
- [ ] Assumptions are labeled rather than presented as facts.
- [ ] No implementation or external action occurred.
