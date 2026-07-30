---
name: grill-with-docs
description: Aligns an operator and agent through focused questions while proposing durable vocabulary and decisions. Use when the operator explicitly wants a codebase change interrogated and its domain language or hard-to-reverse decisions captured.
---

# Grill With Docs

## Overview

Run the reusable interview loop, challenge terms against current code, and stage documentation changes for approval.

## Authority boundaries

- Human-owned context remains authoritative.
- Do not write glossary, ADR, second-brain, or task files without current-request authorization.

## Workflow

1. Read the relevant source, context index, specs, and existing decisions.
2. Use the interview discipline to resolve one consequential branch at a time.
3. Use domain modeling to test ambiguous terms against edge cases and code.
4. Propose glossary updates only for stable domain meaning.
5. Propose an ADR only for a surprising, hard-to-reverse tradeoff.
6. Summarize resolved decisions and remaining uncertainty.

## Skill references

- @docs/ideas/skills/production-engineering/interview-me/SKILL.md
- @docs/ideas/skills/mattpocock-engineering/domain-modeling/SKILL.md
- @docs/ideas/skills/production-engineering/documentation-and-adrs/SKILL.md

## Stop conditions

- A document destination is not authorized.
- Current code contradicts the operator's stated model.

## Verification

- [ ] Every question changes a decision.
- [ ] Proposed docs distinguish domain language from implementation detail.
