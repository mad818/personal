# HQ Mode Briefing + Chat Split

## Goal
Make operational modes deliver visible outputs users can act on, and rebalance HQ layout so chat remains usable.

## Scope
- Add Mode Briefing Panel in HQ showing latest mode job outputs.
- Persist briefing entries in store for quick in-app recall.
- Night Ops writeback: save latest handoff note to workspace file.
- Make office/chat split responsive (avoid chat being reduced to a sliver).

## Behavior
- Briefings show: mode, job name, status, timestamp, short summary, related tab.
- One-click action opens related tab from briefing item.
- Night Ops successful auto jobs write/update:
  - `night-ops-handoff-latest.md`
- Layout:
  - office viewport uses responsive clamp instead of fixed height
  - chat area keeps a practical minimum height

## Safety
- Keep auto jobs opt-in and cooldown-limited.
- Writeback uses existing safe `write_file` tool route.
- No auth/key handling changes.

## Acceptance
- Briefing panel appears and updates as jobs run.
- Night Ops handoff file is written on successful Night Ops auto runs.
- Chat is visibly larger and not cramped on common screen heights.
- TypeScript passes.
