---
description: Plan and build a new feature. Pass the feature name and brief description as the argument.
argument-hint: [feature name and description]
---

## Feature request
$ARGUMENTS

## Current project structure
!`find app components lib store -name "*.tsx" -o -name "*.ts" | grep -v node_modules | sort`

## Active tasks
!`cat tasks/todo.md 2>/dev/null || echo "No todo.md found"`

Before writing any code:
1. Read the relevant skill file first:
   - For nexus-final.html: Read `.claude/skills/add-feature/SKILL.md`
   - For the React app: Read `.claude/rules/architecture.md`
2. Write a brief spec to `specs/features/[feature-name].md`:
   - What it does
   - Which file(s) it touches
   - What new state or APIs it needs
   - Edge cases and error states
3. Add tasks to `tasks/todo.md`
4. Build one step at a time, verifying after each
5. Run `npx tsc --noEmit` before marking done
