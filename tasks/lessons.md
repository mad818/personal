# Nexus Prime — Lessons Learned

## How to use this file
- After ANY correction from Mario, add the pattern here
- Write a rule that prevents the same mistake
- Review this file at the start of each session

---

## Rules

1. When Mario says STOP — stop immediately. No tool calls, no responses, nothing.
2. Never mark a task complete without proving it works first.
3. Keep edits small and targeted — large file edits in one call cause API timeouts.
4. Read the exact line with grep -n before any Edit call. Never guess line numbers.
5. Always search for existing patterns before adding new ones to nexus-final.html.
6. Write the plan to tasks/todo.md before starting any implementation.
7. Do not skip features or lose functionality when refactoring.
8. Avoid the Gemini image generation API — causes ECONNRESET in current setup.

---

## Session Log

### 2026-03-14
- ECONNRESET errors caused by large file edits and heavy context — keep edits smaller
- User rejected Gemini image generation — skip this feature entirely
- Stop command must be obeyed instantly with zero tool calls
