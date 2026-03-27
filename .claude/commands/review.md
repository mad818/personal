---
description: Review recent changes before merging — code quality, security, type safety, and regressions
---

## Files changed
!`git diff --name-only HEAD~1 2>/dev/null || git diff --name-only --cached`

## Full diff
!`git diff HEAD~1 2>/dev/null || git diff --cached`

## TypeScript status
!`npx tsc --noEmit 2>&1 | head -40`

Review the above changes for:
1. TypeScript errors or unsafe `any` casts
2. Security issues — exposed secrets, unsanitised input, unsafe eval
3. Logic bugs or missing edge cases
4. Performance concerns (unnecessary re-renders, N+1 fetches, blocking calls)
5. Consistency with project patterns (helpers, store access, CSS conventions)
6. Missing error handling (`try/catch` on all async fetches)

Give specific, actionable feedback per file. Flag blockers vs. suggestions clearly.
