---
name: refactor
description: Scope-bounded refactor for Nexus Prime — one invariant at a time, no feature additions. Use when improving structure without changing behavior.
allowed-tools: Read, Write, Edit, Grep, Glob
---

# Refactor — Quick Reference

## Trigger
- User asks to clean up, dedupe, or restructure without new features
- Technical debt called out in `tasks/todo.md` with explicit scope

## Steps
1. State the single invariant being preserved (behavior, API, or UI)
2. Read all files in the blast radius before editing
3. Make the smallest diff that achieves the structural goal
4. Run `npx tsc --noEmit` after each file cluster
5. Confirm no route, store contract, or API shape changed unless requested

## Success criteria
- Diff is refactor-only (no new capabilities)
- Tests/typecheck pass
- `tasks/lessons.md` updated if a new rule emerged

## YAGNI
No new abstractions unless at least two call sites justify them.
