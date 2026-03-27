---
description: Show project status — active tasks, lessons learned, recent changes, and TypeScript health
---

## Active tasks
!`cat tasks/todo.md 2>/dev/null || echo "No todo.md found"`

## Recent lessons
!`tail -40 tasks/lessons.md 2>/dev/null || echo "No lessons.md found"`

## Recent git activity
!`git log --oneline -15`

## TypeScript health
!`npx tsc --noEmit 2>&1 | head -20`

## File sizes (watch for bloat)
!`wc -l components/home/AgentOffice.tsx lib/ai.ts store/useStore.ts lib/agent.ts 2>/dev/null`

Summarise the project status:
- What tasks are in progress and what is blocked?
- Any recurring issues from lessons.md worth flagging?
- Is TypeScript clean?
- Any files that are getting too large and should be split?
