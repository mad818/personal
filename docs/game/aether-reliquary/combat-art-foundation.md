# MW6I-L/V Combat Art Foundation

`MW6I-L/V-ARPG-COMBAT-ART-FOUNDATION` turns the first Phaser reliquary slice from placeholder combat into a warmer pixel ARPG foundation with project-original art, deeper enemy rules, and HUD proof that the game is now the visual center of `/hq`.

## Locked Posture

- Art is project-original for this slice: hand-authored SVG source sheets under `assets/arpg/original/`, rasterized locally into PNG sheets under `public/arpg/`.
- No paid AI, no paid asset marketplace, no external download, no franchise-derived silhouettes, and no generated art service is used.
- Phaser owns rendering, camera, sprites, telegraphs, damage numbers, and combat feedback.
- `lib/` owns deterministic rules, save normalization, enemy profiles, status effects, damage math, loot, cooldowns, and codex state.
- DOM HUD/drawers own accessibility-heavy controls: target chip, status strip, hotbar hints, inventory icons, combat codex, settings, and command-room fallback.

## Runtime Scope

The playable scope remains `The First Reliquary`, not the full MW6 world map.

- Enemies: Hollow Sentry, Ashling Scout, Rune Husk, The Brass Warden, Ember Mote, and Glass Gnawer.
- Families: hollow sentries, ash fiends, rune husks, and glass wraiths.
- Damage types: physical, ember, frost, poison, bleed, curse, holy, and void.
- Statuses: exposed, staggered, burn, bleed, chill, poison, guard, haste, ward bloom, rooted, fear, slow, cracked armor, mana drain, cursed, and relic fury.
- First loop: target, strike, use hotbar skill, dodge into guard, read status/codex feedback, collect/equip/upgrade item drops.

## Art Pipeline

`npm run arpg:art:generate` uses local `sharp` to rasterize source sheets:

- `assets/arpg/original/first-reliquary-enemies.svg` -> `public/arpg/enemies-first-reliquary.png`, 6 frames at 64x64.
- `assets/arpg/original/first-reliquary-items.svg` -> `public/arpg/items-first-reliquary.png`, 16 frames at 48x48.
- `assets/arpg/original/first-reliquary-status.svg` -> `public/arpg/status-effects.png`, 16 frames at 32x32.

`npm run arpg:assets:check` validates the manifest, local source paths, runtime PNG presence, dimensions, frame capacity, anchors, license posture, and visible-credit requirements.

## Combat Data

`lib/arpgCombatContent.ts` is the first focused combat registry. It defines enemy families, traits, statuses, damage types, elite modifiers, combat profiles, and runtime sprite/icon frame mappings.

`lib/arpgGame.ts` stores combat state additively inside the v3 save:

- player statuses
- enemy statuses
- cooldowns
- target enemy id
- latest combat events
- discovered enemy codex ids
- reduced-motion VFX posture
- last dodge timing

Older saves normalize with empty combat defaults while preserving player identity, inventory, gear, quests, enemies, world flags, and story flags.

## Acceptance Checklist

- `/hq` renders the Phaser ARPG as the primary room.
- Enemy sprites use the generated first-zone sheet with procedural fallback still available.
- HUD shows target, HP, status row, damage toast, Space/1/2/Shift controls, and item icons.
- Basic attack changes enemy HP and emits a damage number.
- Dodge applies a calm guard status and does not type into the command input.
- Reduced-motion mode keeps telegraphs readable and dampens nonessential flash.
- Journal includes the combat codex without making the default HUD text-heavy.
- Resources tracks the active lane as `Combat art foundation`.

## Next Production Slice

The next big slice should widen either:

- `MW6M-P` gear/economy: weapon families, armor cosmetics, affixes, crafting, salvage, and vendors.
- `MW6Q-S` narrative world loop: city route unlocks, factions, companions, travel events, and first non-reliquary region gates.
- `MW6U/V` production art/audio: external CC0-first asset intake, optional GPT Image 2 / Seedance 2.0 generator-assisted sprite and motion references with prompt/rights records, sprite normalization, combat sounds, city tilesets, and low-flash alternatives.
