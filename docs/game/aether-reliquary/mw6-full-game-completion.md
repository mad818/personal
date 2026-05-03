# MW6 Full-Game Production Completion

## Completion Contract

`MW6-ARPG-FULL-GAME-PRODUCTION` closes only when the remaining MW6U-AA production tracks are verified, not merely planned. The shipped foundations already cover bible/canon, character identity, combat/enemy systems, world loop, endgame, image-driven browser-RPG presentation, real-asset intake readiness, and the illustrated 2D asset bench that now leads the visual production path.

## Remaining Finish Tracks

- `MW6U` completes asset-pipeline enforcement for real/project-original/CC0/attributed assets.
- `MW6V` completes visible production art, audio, VFX, and real imported asset previews after approved files exist locally.
- `MW6AA` closes release-grade static, unit, browser, build, and handoff gates.

## Runtime Proof

The `/hq` Production drawer exposes the MW6 completion posture in-game so progress stays visible where the RPG is actually played. It must stay honest: blocked imported-asset intake remains blocked until official approved pack files are present and validated, while illustrated 2D can advance through its own prompt/provenance, normalization, manifest, and `/hq` preview gates.

`MW6U/V-GENERATOR-ASSISTED-GAME-ART` is now treated as a completed optional policy lane: GPT Image 2 and Seedance 2.0 can help with item art, sprite seeds, VFX references, and motion studies only when operator-approved, provenance-recorded, rights-reviewed, and non-forced-paid. The real production blocker remains imported/approved asset availability, not generated placeholder output.

`MW6U/V-ILLUSTRATED-2D-ASSET-BENCH` is the active visual pivot: source sheets under `assets/arpg/illustrated/source/` are normalized with `npm run arpg:illustrated:generate`, tracked in `lib/arpgIllustratedAssetBenchContent.json`, validated through `npm run arpg:assets:check`, and surfaced in the `/hq` Assets drawer. Future GPT Image 2 batches use this same lane, but no generated image ships without operator approval and prompt/provenance records.

Operator review now adds a hard visual-quality guardrail: flat SVG/glyph sheets and dashboard-like icon cards do not count as production game art. Rejected batches may stay in the ledger for provenance, but `/hq` should not present them as approved game visuals.

`MW6V-ARPG-HERO-KIT-STYLE-LOCK` promotes the approved Hero Kit character/outfit/weapon/armor quality into a checked visual-direction contract. `npm run arpg:visual:check` now verifies the approved style assets and keeps rejected prologue glyph sheets out of the production target.

`MW6V-ARPG-HIFI-ASSET-BRIEFS` turns that style lock into production-ready prompts for 44 upcoming assets: enemy/boss cards, Bellroot prologue replacement art, weapon quality variants, and 12 city cards. `npm run arpg:visual-briefs:check` keeps those prompts tied to the Hero Kit target and blocks flat glyph/dashboard language from returning.

`MW6U/V-HERO-KIT-IMAGE-ASSETS` adds the first generated production batch to that lane: 3 hero/class portraits, 3 class outfit cards, 12 weapon/item icons, and 8 armor/equipment icons. The batch is documented in `docs/game/aether-reliquary/hero-kit-image-assets.md`, uses `docs/game/aether-reliquary/generation-records/2026-04-27-hero-kit-image-assets.md` for prompt/provenance, and appears in the `/hq` Assets, Hero, Kit, and Armory drawers.

`MW6V-HERO-KIT-RUNTIME-PRESENTATION` promotes that approved Hero Kit art into the actual `/hq` browser-RPG loop: persistent loadout icons, a compact click-RPG hero strip, Adventure location/enemy/loot cards, and image-led Wardbreaker/Relicweaver/Ashrunner class choices now use validated runtime sheets before procedural fallback.

`MW6V-ILLUSTRATED-WORLD-CODEX-RUNTIME` extends the same presentation contract beyond the Hero Kit: skill/VFX icons now lead hotbar and skill rows, selected region and city storyline cards use illustrated location art, combat codex rows include enemy cards, and companion rows include portrait seed art.

`MW6V-ENEMY-BOSS-HIFI-STORY-INTRO` promotes the first Hero Kit-quality enemy/boss sheet into runtime: Hollow Sentry, Ashling Scout, Rune Husk, The Brass Warden, Glass Gnawer, Ember Mote, Veyrhold Champion, and The Hollow Regent seed now have a prompt/provenance-backed high-fidelity card strip. `/hq` also starts Bellroot as a non-combat intro flow before the Warden's Antechamber unlocks fighting, preserving player-created identity without forced name or gender.

`MW6FR1-ARPG-FIRST-TOWN-RELEASE-SLICE` narrows the first release to one intentionally open town instead of exposing the full atlas too early. `/hq` now treats Bellroot -> north gate -> Veyrhold as the first playable release path: Veyrhold owns the town map, its four districts become selectable town cards after arrival, and the other 11 cities remain locked previews until later city slices build real maps, quests, vendors, art, and encounter sets.

`MW6FR2-ARPG-VEYRHOLD-TOWN-SERVICES` deepens that first town into a real release hub. `lib/arpgTownServicesContent.json/.ts` defines Bellroot Anvil, Oath-Lamp Still, Oathmarket Stalls, Pilgrim Rest, and Warden Oath Board services, plus four Veyrhold district hooks and starter armor/accessory progression for helm, armor, gloves, boots, rings, and amulet. `/hq` Map and Armory now surface those services and gear paths through existing local-first actions and compact drawers.

`MW6FR3-ARPG-VEYRHOLD-NPCS-MINIQUESTS` makes the first town feel inhabited. `lib/arpgTownServicesContent.json/.ts` now also defines five named Veyrhold locals, four district mini-quests, and five service outcome cards. `/hq` Map exposes the jobs, `/hq` People exposes the locals, and `/hq` Journal exposes the service outcomes while keeping the Phaser playfield dominant.

`MW6FR4-ARPG-VEYRHOLD-DISTRICT-HUB-RUNTIME` turns those first-town pieces into a more coherent town-map runtime. `lib/arpgTownServicesContent.json/.ts` now includes four district hub nodes that connect each Veyrhold district to its NPCs, services, jobs, visit flag, and first rewards; `/hq` Map exposes them as a compact Town hub board so players can choose where to go before using services or quests.

`MW6FR5-ARPG-OATHMARKET-VENDOR-JOB-RUNTIME` deepens the first district into a small release-grade economy beat. Oathmarket now has starter wares, city-scrip pricing, accessory comparison copy, and three ledger-choice outcomes; `/hq` Map exposes the exchange and choice flow, while `/hq` Kit/Inventory exposes the starter wares before a broader vendor engine exists.

`MW6FR6-ARPG-WARDENS-STEPS-FORGE-ARMOR-RUNTIME` deepens the armor district into a playable first-town forge beat. Warden's Steps now has four fitting orders for helm, armor, gloves, and boots, plus three civic oath contracts that teach quality progression, silhouette changes, upgrade rewards, and local reputation; `/hq` Map exposes the forge/contracts after visiting the district, while `/hq` Armory mirrors the fitting path beside the broader gear plan.

`MW6FR7-ARPG-BELLROOT-COMMONS-ALCHEMY-MYSTERY-RUNTIME` deepens the soft-support district into a playable first-town alchemy and story loop. Bellroot Commons now has three safe brews for recovery, focus, and early condition-cleanse language plus three Ilo-led oath-lamp readings that record durable mystery flags; `/hq` Map exposes the Lamp Still and readings after visiting the district, `/hq` Kit mirrors the brew list, and `/hq` Journal tracks the lamp clues.

`MW6V-ARPG-ART-AUDIO-VFX` has started with first-town presentation cues rather than fake final art. `lib/arpgFirstTownPresentationContent.json/.ts` defines six Bellroot and Veyrhold cues with ambient copy, VFX intent, audio staging intent, approved runtime asset references, UI proof surfaces, and reduced-motion alternatives. `/hq` Adventure, Map, and Production now surface those cues while the rejected prologue glyph sheets remain reference-only and blocked from production preview.

`MW6V/W-ARPG-ARSENAL-VISUAL-ITEMIZATION` is the current weapon-system slice. It adds `lib/arpgArsenalContent.json`, project-original illustrated weapon sheets, seven quality overlays, eight named weapon cards, twelve drop/upgrade VFX frames, quality-specific upgrade caps, deterministic affix assignment, weapon drops, and compact `/hq` Kit/Gear proof for comparison, equip, upgrade, and salvage.

The next arsenal expansion should apply the same item-quality escalation to helmet, armor, gloves, boots, necklaces, and rings, with acquisition through dungeons, quests, blacksmithing, alchemy, city vendors, boss drops, and faction rewards. Common gear can stay practical and bland; unique, relic, ancient, mythic, and ultimate-grade equipment should gain visibly distinct silhouettes, materials, glow, craft marks, and set identity.

`MW6X/Y/Z/AA` now have dedicated readiness gates in addition to `npm run arpg:production:check`: `npm run arpg:save:check`, `npm run arpg:balance:check`, and `npm run arpg:release:check`. `MW6X` is now closed for local-first save actions: autosave/manual/checkpoint slots persist, selected slots load, raw and envelope imports normalize, corrupted imports fail safely, and reset requires confirmation. The next slice still needs to deepen release E2E coverage before the remaining tracks can close.

`MW6W/X` now has a runtime bridge in `/hq`: the Production drawer shows the full 14-panel game menu launcher, and the Room drawer shows autosave, manual save, and checkpoint recovery actions before export/import. The live export envelope now represents all three local slot kinds.

`MW6W` is now closed for the production menu/codex runtime. The menu matrix is validated with drawer targets, test IDs, empty states, keyboard-safe posture, and reduced-motion notes; the launcher opens real compact drawers with active menu context; and the Room drawer includes a tutorial/control panel without crowding the playfield.

`MW6Y` is now closed for content tooling. The dedicated `arpg:tools:check` gate validates the content-tooling registry, 12 expansion registries, authoring helpers, fixture save map, progression checks, and dev-only debug posture; `/hq` Production shows the tooling summary so future city, quest, map, enemy, item, vendor, companion, dialogue, and flag work starts from validated contracts.

`MW6Z` is now closed for balance and playtest fixtures. `lib/arpgBalancePlaytestContent.json` plus `lib/arpgBalancePlaytestContent.ts` validate XP/session pacing, loot cadence, boss timing, potion pressure, all class and lineage viability rows, +1 through +5 upgrade economy, browser performance budgets, and a playtest checklist for the prologue, Acts I-V, The Hollow Regent finale, postgame, and all 12 major city hubs. `/hq` Production shows the balance summary and proof chips.

## Gates

- `npm run arpg:content:check`
- `npm run arpg:asset-candidates:check`
- `npm run arpg:illustrated:generate`
- `npm run arpg:assets:check`
- `npm run arpg:production:check`
- `npm run arpg:tools:check`
- `npm run arpg:save:check`
- `npm run arpg:balance:check`
- `npm run arpg:release:check`
- `npm run arpg:presentation:check`
- `npm run type-check`
- `npm run hq:e2e`
- `npm run route:e2e`
- `npm run tabs:e2e`
- `npm run build`
- `npm run verify`
