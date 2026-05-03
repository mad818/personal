# Aether Reliquary Systems Bible

## Character Creation

MW6 supports one playable hero with race, origin, class, subclass, portrait/sprite palette, cosmetic accent, and respec state. MW6F-H promotes this into the runtime through v3 save identity, compact Hero and Skills drawers, and procedural Phaser palette feedback while preserving the current Phaser play loop.

## Races

The eight production lineages are Ashborn, Veyr Human, Glasskin, Mossbound, Iron Oath, Nacre-Touched, Starward, and Gloammarked. Each lineage needs stat tendencies, passive trait, city reactions, sprite palette notes, and at least one race-specific dialogue or quest path. The focused playable registry lives in `lib/arpgCharacterContent.json`.

## Classes

The eight production classes are Wardbreaker, Relicweaver, Ashrunner, Oathblade, Thornwarden, Gravechanter, Ember Monk, and Wayfarer. Each class gets two subclasses, starter active/passive skills, resource model, VFX identity, and build presets. Starter actives/passives must stay valid for level-1 saves and are validated by `npm run arpg:content:check`.

## Combat

Combat remains real-time ARPG:

- Basic attack plus hotbar skills.
- Dodge or dash.
- Enemy idle, patrol, aggro, attack, recover, flee, and defeated states.
- Telegraphs before dangerous attacks.
- Stagger windows and readable damage numbers.
- Damage types: physical, ember, frost, poison, bleed, curse, holy, and void.
- Reduced-motion-safe hit feedback.

## Enemies

Enemy families and statuses are data-driven. Families define lore, tactics, resistances, weaknesses, loot, and region fit. Traits, buffs, and debuffs define combat behavior and should be reusable across normal enemies, elites, champions, mini-bosses, bosses, and world bosses.

## Gear

Gear is the customization heart:

- Low-tech hand weapon families only for MW6.
- Expanded slots: weapon, offhand, helm, armor, boots, gloves, belt, cloak, relic, sigil, charm, rings, and amulet.
- Qualities: common, uncommon, rare, epic, relic, ancient, mythic.
- Upgrade ranks remain +0 through +5 until balance proves a need to widen.
- Affixes, sockets, runes, set bonuses, unique relics, class synergies, and race synergies must be represented in typed content before runtime UI expands.

## Economy

Use gold, relic dust, upgrade shards, rare catalysts, monster parts, city currencies, salvage, vendor inventories, potion tiers, key fragments, and reputation discounts. Anti-grind targets should be validated through balance snapshots before adding repeatable endgame rewards.

## Endgame

Endgame stays offline and local-first: relic trials, elite affix rotations, boss rematches, treasure maps, build-testing arena, cosmetic rewards, city reputation completion, and codex completion.

MW6T promotes this into validated runtime data through `lib/arpgEndgameContent.*`: 12 city challenge dungeons, 12 relic trials, 48 timed treasure rooms, 48 treasure maps, boss rematches, class arenas, collection goals, and cosmetic rewards. `/hq` exposes the first proof in the compact `Trials` drawer while full production maps, audio, and art remain later MW6U-AA work.
