# MW6I-S Systems + World Loop Foundation

## Contract

MW6I-S turns the MW6 production bible into validated runtime-facing systems without pretending the full game is finished in one commit. The slice completes the child tracks from combat encounters through travel systems as data, rules, and compact `/hq` proof:

- `lib/arpgEnemyTaxonomyContent.json` and `.ts` define the enemy taxonomy, traits, buffs, debuffs, regional archetypes, 48 sub-city champions, 12 city bosses, act bosses, Hollow Regent final forms, and postgame world bosses.
- `lib/arpgArmoryEconomyContent.json` and `.ts` define low-tech weapon families, gear slots, qualities, armor families, affixes, runes, city armor sets, city gear rewards, recipes, salvage, vendors, and currencies.
- `lib/arpgWorldLoopContent.json` and `.ts` define campaign phases, route events, quest templates, reputation tiers, NPC roles, dialogue flags, companion arcs, city storylines, 48 sub-city side arcs, and travel choices.
- `lib/arpgGame.ts` keeps save version `3` and adds additive journey/runtime state for route selection, travel events, crafting, salvage, companions, reputation, quest logs, and map flags.
- `/hq` keeps Phaser as the playfield and adds compact Map, Armory, Journal, and People drawer proof without adding `/game` or changing auth/API behavior.

## Runtime Proof

The HQ game now exposes the full-game spine while keeping the first viewport playfield-dominant:

- Map drawer shows 12 major cities, 48 sub-cities, route count, city storylines, side arcs, and north-gate travel proof after Brass Warden progression.
- Armory drawer shows 21 hand-weapon families, 14 gear slots, 7 quality tiers, city armor sets, deterministic recipe crafting, and salvage hooks.
- Journal keeps story objective, local quest posture, lore study, skills, and combat codex in the drawer model.
- People drawer shows 8 companion arcs, major NPC role coverage, recruitment proof, and faction/reputation changes.

## Boundaries

This slice intentionally does not add production city tilemaps, new external assets, audio replacement, endgame dungeons, multiplayer, cloud saves, accounts, or a new public route. Those remain in MW6T-AA.

All new systems stay local-first, deterministic, and validated by `npm run arpg:content:check`. Any future art/audio imports remain gated by `npm run arpg:assets:check` and visible credits when required.

## Acceptance

- `npm run arpg:content:check` validates MW6I-S registry coverage against the production bible.
- `npm run arpg:assets:check` remains green with no unverified asset intake.
- `npm run hq:e2e` covers Map, route event resolution, Armory/Crafting, companion recruitment, command input safety, and the existing combat/character loops.
- The active Resources massive-win lane reads as `MW6 systems + world loop foundation`.
