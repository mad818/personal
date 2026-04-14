# Repo Idea Audit Batch 1 — 2026-04-09

## Why

The repo audit across the idea sources shows a repeatable pattern:

- `My-Brain-Is-Full-Crew` pushes for low-friction, action-oriented working sessions
- `xyops` emphasizes closed feedback loops instead of isolated dashboards
- `obsidian-mind` treats graph/archive stewardship as an active maintenance discipline, not a passive report

Nexus already adopted the visibility side of those ideas well, but VAULT stewardship still stops at diagnosis. It tells the operator what is wrong without opening the exact repair view.

This batch closes that gap.

## Scope

In scope:

- Add one-click stewardship repair actions for the highest-value archive issues:
  - route-less compiled pages
  - untagged compiled pages
  - orphan graph recovery
- Extend VAULT list/graph focus handling so those actions land on filtered or targeted views
- Keep the solution local-first and route-native

Out of scope:

- Building a separate archive admin route
- Adding server-side mutation or automatic repair
- Reworking every VAULT panel in one pass

## Implementation plan

1. Add repair-link generation to the stewardship panel
2. Extend compiled-page list handling with repair-oriented filters
3. Extend graph focus handling with orphan-recovery targeting
4. Update the route-level focus copy so the repair session explains itself
5. Re-run verification and live route checks

## Done when

- Stewardship can move directly from diagnosis to a relevant repair view
- VAULT compiled-page and graph surfaces can open in focused repair modes
- The change improves archive maintenance without adding a second admin UX
- `npm run type-check`, `npm run verify`, and `npm run handoff:write` pass
- Live `127.0.0.1:3000` checks succeed on `/vault` and the new focused repair URLs
