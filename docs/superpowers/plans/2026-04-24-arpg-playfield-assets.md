# MW3 Aether Reliquary Playfield-First Assets

## Summary

- Continue the HQ ARPG lane by making the game canvas visually dominant and moving detail-heavy UI into compact drawers.
- Keep `/hq` as the only runtime surface for the game, with the existing command-room fallback still reachable.
- Establish a CC0-first, CC-BY-guarded asset intake contract before committing external GLB or texture files.

## Implemented Slice

- Compact HUD direction: objective/stat chip, loadout strip, context prompt, tiny AI-oracle status, and drawer controls instead of two large always-on panels.
- Proximity-driven object discovery: nearby lore, loot, and enemy targets now have a shared prompt contract.
- Procedural environment upgrade: richer low-poly reliquary floor, arch, columns, braziers, salvage props, and glow affordances.
- Asset governance: typed manifest data, in-game Assets drawer posture, markdown ledger, and `npm run arpg:assets:check`.

## Next Extension Targets

- Import the first verified CC0 low-poly ruin/prop pack under `public/arpg/` after optimizing and recording every asset in the ledger.
- Add a second chamber gate state that unlocks only after the Hollow Sentry and loom-shard loop is complete.
- Expand customization with cosmetic silhouettes and origin-specific visual accents before increasing combat complexity.
