# Aether Reliquary Content Validation

MW6 content is intentionally registry-first. Docs explain the fantasy; `lib/arpgProductionContent.json` is the broad canon source, while focused registries prevent runtime drift for character, combat, world systems, armory/economy, enemy taxonomy, endgame, content tooling, and balance/playtest targets.

## Gates

- `npm run arpg:content:check` validates the production content registry.
- `npm run arpg:assets:check` validates asset provenance, license posture, frame metadata, optimization state, and visible-credit requirements.
- `npm run arpg:tools:check` validates the MW6Y content-tooling registry, fixture map, authoring helpers, progression checks, and dev-only debug posture.
- `npm run arpg:save:check` validates MW5 v2, raw MW6 v3, envelope v1, and corrupted-save fixtures.
- `npm run arpg:balance:check` validates XP/session targets, loot cadence, boss timing, potion pressure, class and lineage viability, upgrade economy, browser budgets, and city/act/endgame playtest fixtures.
- `npm run arpg:release:check` validates release-flow coverage and required HQ proof signals.
- `npm run verify` runs the ARPG checks before type-check, lint, path-collision, and security gates.

## Content Registry Requirements

The content registry must define:

- Exactly 12 major cities.
- Exactly 48 sub-cities.
- Route connections with valid endpoints and unlock flags.
- At least seven campaign acts including The Hollow Regent.
- Exactly eight races and eight classes.
- Character foundation data with exactly eight playable lineages, eight class trees, two subclasses per class, valid default choices, valid palettes/portraits, globally unique skill IDs, valid prerequisites, valid starter actives/passives, and stat keys accepted by the runtime formula.
- Enemy families, traits, buffs, debuffs, weapon families, gear qualities, gear slots, damage types, and currencies.
- MW6I-S systems data for enemy taxonomy, unique bosses, armory/economy, quests, factions, companions, NPCs, and travel events.
- MW6T endgame data for difficulty tiers, dungeon archetypes, elite affix rotations, relic trial rules, boss rematch rules, treasure map rules, class arena challenges, collection goals, cosmetic rewards, and reward tracks.
- At least eight companions with perk and loyalty quest data.

## Content Tooling Requirements

`lib/arpgContentToolsContent.json` is the MW6Y content-tooling contract. It keeps future game expansion decision-complete before runtime work starts.

It must define:

- Content registries for cities, sub-cities, quests, enemies, bosses, items, vendors, recipes, companions, dialogue, maps, and save flags.
- Authoring helpers for zone scaffolds, quest dependency checks, map coordinates, dialogue flags, fixture saves, debug posture, spawn tests, and balance snapshots.
- Fixture-save references for MW5 v2 migration, raw MW6 v3 import, envelope v1 import, corrupted import, world-loop unlocked state, and endgame-ready state.
- Progression checks for route endpoints, quest dependencies, enemy drops, vendor economy, crafting/salvage, companions, map coordinates, and save migration.
- Authoring rules that keep canon data first, simulation in `lib/`, renderer state out of save payloads, and dev-only helpers out of public player controls.

## Balance Playtest Requirements

`lib/arpgBalancePlaytestContent.json` is the MW6Z balance/playtest contract.

It must define:

- Session targets for prologue onboarding, city arcs, sub-city arcs, travel routes, dungeons, boss attempts, and endgame trials.
- XP anchors from level 1 through the level-50 cap.
- Level bands for prologue, all five acts, and postgame.
- Loot cadence rows for normal enemies, elites, chests, city bosses, act bosses, the Hollow Regent finale, and relic trials.
- Boss timing and potion-pressure rows for early, city, act, final, and postgame bosses.
- Viability coverage for all eight classes and all eight lineages.
- Upgrade economy targets for +1 through +5.
- Browser budgets for first interaction, drawer open, combat input latency, FPS floor, small viewport posture, and reduced-motion flash posture.
- A playtest checklist for The First Reliquary, Act I-V, The Hollow Regent finale, postgame, and all 12 major city hubs.

## Asset Registry Requirements

Sprite sheets, tilemaps, tilesets, UI icons, and FX sheets must include:

- Stable manifest ID.
- Local path.
- Source URL.
- License proof URL.
- Author.
- License.
- Attribution.
- Optimization state.
- Frame width, frame height, frame count, and anchor.
- Tags.

External assets are allowed only as CC0 or CC-BY with visible credits when required. NC, ND, SA, unknown, editorial, marketplace-preview, ripped, or franchise-derived assets stay rejected by default.
