# MW6FR9-ARPG-PILGRIM-ROWS-REST-ROAD-RUNTIME

## Problem

Veyrhold has playable depth in Oathmarket, Warden's Steps, and Bellroot Commons, but Pilgrim Rows still reads mostly like a service node. The first town needs all four districts to carry a small playable loop before broader city slices expand.

## Scope

- Add typed Pilgrim Rows rest/checkpoint options to `lib/arpgTownServicesContent.json/.ts`.
- Add typed Pilgrim Rows road-rumor choices with route-prep story flags, rewards, and reputation.
- Surface the loop through existing `/hq` Map, Kit, and Journal drawers.
- Extend validation and focused E2E assertions.
- Update MW6 completion docs/task state.

## Constraints

- No new `/game` route.
- No full camping, overworld travel, cloud save, multiplayer, or paid asset system.
- No unapproved art or external runtime dependency.
- Keep all rewards local-first and backed by existing item ids.

## Acceptance

- `npm run arpg:content:check` validates Pilgrim Rows rest options and road rumors.
- `/hq` Map exposes `arpg-pilgrim-rows-runtime` after visiting Pilgrim Rows.
- `/hq` Kit exposes `arpg-pilgrim-kit-rest`.
- `/hq` Journal exposes `arpg-pilgrim-road-rumors`.
- `npm run type-check` and `npm run verify` pass.
