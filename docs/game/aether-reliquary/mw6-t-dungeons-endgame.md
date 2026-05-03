# MW6T Dungeons + Endgame Foundation

MW6T turns the full-game systems spine into a local-first postgame contract for `Aether Reliquary`.

## Shipped Contract

- `lib/arpgEndgameContent.json` defines difficulty tiers, dungeon archetypes, elite affix rotations, relic trial rules, boss rematch rules, treasure map rules, arena challenges, collection goals, cosmetic rewards, and reward tracks.
- `lib/arpgEndgameContent.ts` derives the production-scale runtime layer from the MW6 canon: 12 city challenge dungeons, 12 relic trials, 48 timed treasure rooms, 48 treasure maps, city/act/world/final boss rematches, 8 class arena challenges, collection goals, and cosmetic rewards.
- `lib/arpgGame.ts` keeps save version `3` and adds additive `endgame` state for active/completed dungeons, trials, boss rematches, treasure maps, arena clears, collection goals, cosmetics, difficulty, and elite rotation.
- `/hq` exposes the proof through the compact `Trials` drawer while preserving Phaser as the playfield, the HQ command input, AI-working indicators, and the command-room fallback.

## Runtime Proof

- The `Trials` drawer shows endgame counts: 12 dungeons, 12 relic trials, 48 treasure maps, boss rematches, arena challenges, collections, and cosmetics.
- A player can set difficulty, start and complete the selected city dungeon, start and complete the selected city relic trial, resolve local treasure maps, complete a boss memory, clear an arena challenge, and claim a cosmetic.
- Endgame access is local-first and safe: full postgame flags unlock it, while the current vertical slice can preview the loop after the Brass Warden / north-gate proof.
- Rewards use existing material/currency items (`gold`, `relic-dust`, `upgrade-shard`, `rare-catalyst`, `monster-part`, and `city-scrip`) without adding external services or paid assets.

## Boundaries

This slice does not add production dungeon tilemaps, imported audio, new sprite packs, multiplayer, cloud saves, accounts, `/game`, or server-backed progression. MW6U-AA owns asset/audio replacement, full menu/codex hardening, save hardening, tooling, balance, and release gates.

## Validation

- `npm run arpg:content:check` validates the MW6T registry and its references to production cities, classes, damage types, enemy traits/buffs/debuffs, currencies, reward tracks, goals, and unlock flags.
- `npm run hq:e2e` covers the compact runtime proof in `/hq`.
- `npm run tabs:e2e` confirms Resources reflects the active endgame massive-win lane.
