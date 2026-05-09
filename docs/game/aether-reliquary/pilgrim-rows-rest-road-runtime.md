# Pilgrim Rows Rest + Road Runtime

`MW6FR9-ARPG-PILGRIM-ROWS-REST-ROAD-RUNTIME` completes the fourth first-town district loop in Veyrhold.

This slice keeps Pilgrim Rows practical: it adds checkpoint rest, boot/road prep, dawn recovery, and road rumors without creating a full camping system, overworld travel engine, cloud save, multiplayer, paid asset lane, or new `/game` route.

## Runtime Contract

- Pilgrim Rows opens after Veyrhold is unlocked and the player visits the district from the `/hq` Map drawer.
- Sister Vael exposes three rest options: Lamp Checkpoint, Boot Mending, and Dawn Meal.
- Pilgrim Rows exposes three road rumors: Lantern Caravan, Salt-Road Widow, and North Gate Blink.
- Rest options grant local-first recovery/travel-prep rewards and durable story flags.
- Road rumors grant small rewards, Veyrhold reputation, and route-prep flags that future road cards can reuse.

## UI Proof

- `/hq` Map owns the Pilgrim Rows runtime card and district visit state.
- `/hq` Kit mirrors the rest options so road preparation is visible next to items.
- `/hq` Journal mirrors road rumors so route clues persist beside Bellroot mystery notes.

## Design Notes

Pilgrim Rows should feel humane and grounded: a place to bind a checkpoint, repair boots, eat before dawn, and hear enough rumor pressure that leaving town feels intentional.

The next first-town expansion should build from this complete four-district loop rather than adding another static service card.

## Verification

- `npm run arpg:content:check`
- `npm run arpg:production:check`
- `npm run arpg:release:check`
- `npm run type-check`
- `npm run build`
- `npm run verify`

Focused `/hq` E2E expectations cover visiting Pilgrim Rows, binding the Lamp Checkpoint, opening the Kit rest list, recording the North Gate Blink rumor, and seeing the Journal road-rumor row. Local Windows Playwright can still hit `spawn EPERM` or timeout behavior, so build/verify plus live `3100` route checks remain the fallback proof path.
