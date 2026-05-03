# Warden's Steps Forge + Armor Runtime

`MW6FR6-ARPG-WARDENS-STEPS-FORGE-ARMOR-RUNTIME` deepens Veyrhold's armor district into the next first-release gameplay loop. It keeps the slice narrow: one town, one district, starter armor progression, civic jobs, and compact `/hq` proof.

## Runtime Contract

- Warden's Steps opens after Veyrhold is unlocked and the player visits the district from the `/hq` Map drawer.
- The forge exposes four armor fittings: helm, armor, gloves, and boots.
- Each fitting records a durable story flag, grants local-first rewards, updates Veyrhold reputation, and points back to starter gear already known by the save.
- The civic oath-board exposes three contracts: shield-line, forge-witness, and step-watch.
- `/hq` Armory mirrors the fittings so armor progression is visible where item comparison and crafting already live.

## Armor Philosophy

Starter armor begins plain: practical cloth, patched bronze, work leather, and travel soles. The first release teaches why quality matters before it tries to look mythic.

- Common gear should stay bland and believable.
- Uncommon and rare gear should gain cleaner silhouettes, etched marks, straps, plates, and readable role identity.
- Epic, relic, ancient, mythic, and ultimate-style gear remain later slices, where silhouettes, materials, glow, set identity, dungeon drops, blacksmithing, alchemy, boss rewards, and faction rewards become more dramatic.

## Verification

- `npm run arpg:content:check`
- `npm run arpg:production:check`
- `npm run arpg:release:check`
- `npm run type-check`
- `npm run build`
- `npm run verify`

`npm run hq:e2e` includes focused Warden's Steps assertions, but local Windows Playwright can still hit `EPIPE`, `spawn EPERM`, or timeout behavior. When that happens, use the established fallback proof: build/verify plus live `3100` HTTP checks.
