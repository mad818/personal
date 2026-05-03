# Aether Reliquary MW6 Production Spine

`Aether Reliquary` is the original-IP browser RPG embedded in `/hq`. MW6 moves it from the MW5 Phaser vertical slice into a full-game production lane, starting Bible-first so runtime work can grow from stable canon and validated data.

## Locked Direction

- Tone: heroic adventure with warm danger.
- Combat: real-time ARPG with readable telegraphs, cooldown skills, loot, and buildcraft.
- Runtime: Phaser owns the playfield; React/DOM owns text-heavy HUD, drawers, journal, settings, codex, and accessibility surfaces.
- Scope boundary: no `/game` route, cloud save, account system, multiplayer, franchise-derived assets, or external game server.
- Asset boundary: CC0-first, clean CC-BY with complete attribution and visible credits, and optional operator-approved commercial-license packs with redacted proof records.

## Canon Files

- `production-bible.md` defines the promise, world rules, originality guardrails, art direction, and implementation boundaries.
- `world-atlas.md` defines the 12 major cities, 48 sub-cities, travel structure, progression doors, and tilemap conventions.
- `campaign-outline.md` defines the prologue, five acts, finale, postgame, story flags, factions, and companion loyalty spine.
- `prologue-story-foundation.md` defines the detailed non-combat opening: player-created hero identity, Bellroot Vestibule, Descent Ledger, oath-lamps, Ilo, Gate Monolith, and first quest flags.
- `systems-bible.md` defines character creation, races, classes, combat, enemies, gear, economy, companions, and endgame.
- `character-foundation.md` defines the MW6F-H playable protagonist contract, v3 save identity, lineage/class rules, compact Hero/Skills drawers, and migration acceptance.
- `combat-art-foundation.md` defines the MW6I-L/V first-zone combat and project-original art contract: generated sprite/icon sheets, combat profiles, statuses, target HUD, codex, and validation proof.
- `art-batches/armory-economy-icons.md` records the first MW6U/V production icon batch: low-tech weapon-family art plus economy/material/rune icons wired into the Armory drawer.
- `art-batches/character-armor-sprites.md` records the MW6V character art batch: playable class sprites replacing the colored Phaser marker plus armor-family icons wired into Hero and Armory surfaces.
- `real-asset-acquisition.md` defines the corrected MW6V asset path: real CC0/CC-BY-verified character, outfit, animation, prop, and material packs instead of locally generated placeholder art.
- `mw6-i-s-systems-world-foundation.md` defines the MW6I-S full-game systems bridge: enemy taxonomy, armory/economy, world-loop registries, Map/Armory/People drawer proof, travel events, companions, and reputation.
- `mw6-t-dungeons-endgame.md` defines the MW6T long-term-play bridge: repeatable city dungeons, relic trials, timed treasure rooms, boss rematches, arena challenges, collection goals, cosmetics, and local-first postgame progression.
- `image-driven-browser-rpg.md` defines the MW6W presentation shift: clickable scene cards, route/fight/loot/story choices, compact Adventure drawer, and the rule that Phaser remains a proof/playfield layer while browser-RPG cards carry more of the moment-to-moment interaction.
- `mw6-full-game-completion.md` defines the MW6 parent completion contract: production asset closure, full menus, save hardening, content tools, balance fixtures, release gates, and honest parent closure requirements.
- `mw6-production-readiness.md` defines the enforceable MW6U-AA readiness foundation: accepted license posture, save envelope rules, content tooling fixtures, balance targets, playtest matrix, and release gates.
- `mw6-aa-large-chunk-readiness.md` defines the dedicated save, balance, and release checks plus fixture-backed `/hq` Production drawer proof for the remaining MW6W-AA closeout.
- `mw6-menu-save-runtime.md` defines the MW6W/X runtime bridge: the full 14-panel menu index, autosave/manual/checkpoint slot summaries, three-slot export envelope, and release proof signals inside `/hq`.
- `balance-playtest.md` defines the MW6Z balance and playtest foundation: XP/session targets, loot cadence, boss timing, potion pressure, class and lineage viability, upgrade economy, browser budgets, and city/act/endgame checklists.
- `generator-assisted-art-pipeline.md` defines the optional GPT Image 2 / Seedance 2.0 game-art workflow, including no-forced-paid dependency rules, prompt records, rights review, sprite normalization, and manifest gates.
- `illustrated-2d-asset-bench.md` defines the primary MW6U/V illustrated 2D asset bench for character portraits, enemy cards, location cards, gear icons, and skill/VFX icons.
- `content-validation.md` explains the typed registries and validation gates that keep docs, data, and runtime aligned.

## Typed Registry

The broad canon source is `lib/arpgProductionContent.json`, consumed through `lib/arpgProductionContent.ts`. The prologue story slice is `lib/arpgPrologueContent.json`, consumed through `lib/arpgPrologueContent.ts`. The playable character slice is `lib/arpgCharacterContent.json`, consumed through `lib/arpgCharacterContent.ts`. The first combat slice is `lib/arpgCombatContent.ts`. MW6I-S adds `lib/arpgEnemyTaxonomyContent.*`, `lib/arpgArmoryEconomyContent.*`, and `lib/arpgWorldLoopContent.*`. MW6T adds `lib/arpgEndgameContent.*`. MW6 completion posture is tracked by `lib/arpgCompletionContent.*`, MW6U-AA readiness is tracked by `lib/arpgProductionReadinessContent.json`, and MW6Z balance/playtest canon is tracked by `lib/arpgBalancePlaytestContent.*`. These are checked by `npm run arpg:content:check`, while sprite/icon/model provenance, generator-assisted prompt records, rights metadata, no-forced-paid posture, and frame metadata are checked by `npm run arpg:assets:check`; real external source candidates are checked by `npm run arpg:asset-candidates:check`; production readiness is checked by `npm run arpg:production:check`; and the large-chunk closeout gates are checked by `npm run arpg:save:check`, `npm run arpg:balance:check`, and `npm run arpg:release:check`.

This lets later runtime slices ask concrete questions: which cities exist, which sub-cities belong to them, what unlocks each route, which enemy families are legal, which classes/races exist, and what content counts as canon.
