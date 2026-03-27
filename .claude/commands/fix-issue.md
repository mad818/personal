---
description: Investigate and fix a bug or issue. Pass the description or error message as the argument.
argument-hint: [error message or issue description]
---

## Issue to fix
$ARGUMENTS

## Current TypeScript errors (if any)
!`npx tsc --noEmit 2>&1 | head -30`

## Recent git changes (context)
!`git log --oneline -10`

Using the issue description above:
1. Identify the root cause — trace it through the codebase.
2. Read the relevant files before touching anything.
3. Apply the minimal fix that resolves the issue.
4. Verify: re-read the patched section and confirm the fix is correct.
5. Run a tsc check if types were touched.
6. Report: what the bug was, what file was changed, what the fix does.

Follow the fix-bug skill if this is in nexus-final.html:
Read `.claude/skills/fix-bug/SKILL.md` first.
