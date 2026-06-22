---
name: fix-bug
description: Debug and fix any issue in nexus-final.html or the React/Next.js app. Use for visual artifacts, broken data, failed fetches, TypeScript errors, or any behaviour that doesn't match intent. Read this before touching any code.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Fix Bug — Quick Reference

## Current build state
!`npx tsc --noEmit 2>&1 | head -25 || echo "TypeScript: clean"`

## Before touching any code
1. Confirm the exact symptom — what is wrong vs. what should happen
2. Locate the element: `grep -n "id\|function\|class" nexus-final.html | head -20`
3. Read 20–30 lines of context around the match — never edit blind
4. Make the smallest possible change

## Surface-specific entry points

**HTML app bugs:**
- Visual artifact → check CSS specificity, modernization layer at bottom of `<style>`
- Wrong value → trace: fetch URL → `S.signals.X` / `S.prices.X` → render function
- Broken interaction → check element id, null guard, event handler

**React app bugs:**
- TypeScript error → run `npx tsc --noEmit`, read the full error, fix the type
- Component not rendering → check store selector, null guard, parent import
- Stale data → check if Zustand selector is reactive (`useStore(s => s.field)` not `useStore().field`)

## Non-negotiables
- Read before edit — always
- One change at a time — verify after each
- After any edit to `.ts` or `.tsx`: run `npx tsc --noEmit`
- After the fix: re-read the patched section to confirm it landed

## Checklist
- [ ] Symptom confirmed with exact reproduction steps
- [ ] Root cause identified (not just the symptom)
- [ ] Minimal fix applied
- [ ] No regressions in surrounding code
- [ ] tsc passes (React app)
- [ ] Lesson added to `tasks/lessons.md`

## Deep guide
For common bug patterns, data flow tracing, and known edge cases:
@.claude/skills/fix-bug/GUIDE.md
