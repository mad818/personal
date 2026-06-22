---
name: add-feature
description: Build any new self-contained feature into nexus-final.html OR the React/Next.js app. Use when adding panels, data sources, UI components, or dashboard sections. Read this before writing a single line.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
context: fork
---

# Add Feature — Quick Reference

## Pre-flight build check
!`npx tsc --noEmit 2>&1 | tail -5 || echo "TypeScript: clean — safe to build"`

## Decide which surface first
- **nexus-final.html** — for standalone browser features, new data panels, tab sections
- **React app** — for anything in `app/` or `components/` (agent office, live charts, etc.)

For the HTML app, follow the 4-block pattern: CSS → HTML → JS → Init hook.
For the React app, follow the component pattern: types → store slice → component → route.

## HTML app — minimum viable structure
```
CSS block    → top of <style>, unique prefix (e.g. fx-)
HTML block   → inside <div id="tab-X">
JS block     → bottom of <script>, grouped
Init hook    → called from tab's init function
```

## React app — minimum viable structure
```
types        → components/home/office/types.ts or store/useStore.ts
store slice  → store/useStore.ts if state is needed
component    → components/[tab]/FeatureName.tsx
import       → add to parent component
```

## Non-negotiables
- All fetches in `try/catch` — silent failure, never crash the page
- CSS: use variables only — never hardcode colours (`var(--surf2)`, `var(--accent)`)
- Fear & Greed: always `.value` and `.label` — never a plain number
- AI calls: always `stratAICall()` or `callAI()` — never direct provider calls
- After build: run `npx tsc --noEmit` and confirm zero errors

## Checklist
- [ ] Spec written to `specs/features/[name].md` before coding starts
- [ ] Tasks added to `tasks/todo.md`
- [ ] CSS with unique prefix (HTML app) or Tailwind classes (React)
- [ ] HTML/JSX in correct location
- [ ] JS/TS with try/catch on all async
- [ ] Init hook wired (HTML app) or component imported (React)
- [ ] API key wired if needed — see @.claude/skills/add-api/SKILL.md
- [ ] Error state shown on fetch failure
- [ ] COMMAND tab updated if data is dashboard-level
- [ ] tsc passes

## Deep guide
For detailed patterns, UI templates, common mistakes, and React-specific flows:
@.claude/skills/add-feature/GUIDE.md
