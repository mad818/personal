# MW2 Ancient Techno-Fantasy HQ ARPG Room Foundation

## Summary

- Replaced the HQ 3D workplane with `Aether Reliquary`, a first playable isometric ARPG foundation that lives inside the existing HQ shell.
- Preserved the command input, mission rail, active-agent posture, AI-working indicators, and command-room fallback.
- Kept the slice route-safe: no `/game` route, no new public API, and no new game dependency.

## Implemented Contract

- `lib/arpgGame.ts` owns pure local-first game state, movement, gear equip, loot pickup, story flags, combat, normalization, and derived stats.
- `lib/arpgGameContent.ts` owns the authored v0 content: Wardbound origin, starter kit, loom-shard charm, Gate Monolith, Hollow Sentry, and reliquary bounds.
- `components/home/arpg/` owns the R3F scene, DOM HUD, loadout/actions, and AI oracle companions without embedding interaction-heavy DOM inside the canvas.
- `store/useStore.ts` persists `hqRoomMode` plus `arpgSave` and exposes bounded actions for movement, collection, equip, combat, story, reset, and mode switching.

## Verification

- `npm run type-check`
- `npm run build`
- `npm run hq:e2e`
- `npm run tabs:e2e`
- `npm run route:e2e`
- `npm run verify`
- In-app browser acceptance on `/hq?focus=hq-chronicle` and `/resources?view=impact&impactMode=graph`
