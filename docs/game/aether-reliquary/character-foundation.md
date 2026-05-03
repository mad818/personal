# Aether Reliquary Character Foundation

MW6F-H turns the Bible-first canon into a playable identity layer. The game still has one local-first protagonist, but that hero now carries race, origin, class, subclass, palette, portrait, starter skills, dialogue tags, city reputation hooks, and a v3 save identity that can grow into the full RPG.

## Runtime Contract

- Save version: MW6 runtime saves normalize to `version: 3`.
- Compatibility: MW5/v2 saves migrate forward without wiping movement, inventory, gear, loot, defeated enemies, quest state, world flags, or story flags.
- Default hero: `Reliquary Heir`, `Veyr Human`, `Wardbound`, `Wardbreaker`, `Shieldcleaver`, `Veyr Hearth`.
- UI posture: Hero and Skills live in compact drawers; the playfield remains the dominant first-view surface.
- Renderer posture: Phaser can reflect palette/class identity through procedural tinting, but simulation and rules stay in `lib/`.

## Playable Lineages

The eight lineages are Ashborn, Veyr Human, Glasskin, Mossbound, Iron Oath, Nacre-Touched, Starward, and Gloammarked.

Each lineage must define:

- Base stat tendencies.
- One passive trait.
- City reputation hooks.
- Dialogue tags.
- A palette and portrait seed.
- At least one future race-specific quest or dialogue hook.

## Class Trees

The eight class paths are Wardbreaker, Relicweaver, Ashrunner, Oathblade, Thornwarden, Gravechanter, Ember Monk, and Wayfarer.

Each class tree must define:

- Two subclasses.
- One starter active skill.
- One starter passive skill.
- Resource model.
- Class tags for dialogue/build checks.
- Accent color for HUD and procedural sprite feedback.
- Valid skill prerequisites and unlock levels.

## Skill Rules

- Skills are data-driven and validated by `npm run arpg:content:check`.
- Active skills can be equipped to the hotbar.
- Passive skills contribute derived stats.
- Starter builds must stay playable at level 1.
- Skill IDs must be globally unique across all class trees.

## Character Actions

- `createArpgCharacter` applies race/class/subclass/palette identity without resetting progression.
- `respecArpgCharacter` changes build direction and increments respec state.
- `setArpgCharacterCosmetic` updates palette or portrait only.
- All actions must preserve collected loot, opened chests, enemy state, quest state, and story flags unless a future quest explicitly changes them.

## Acceptance Checklist

- The Hero drawer can apply race, class, subclass, and palette choices.
- The Skills drawer can unlock or equip a valid skill node.
- The HUD identity chip reflects the selected lineage/class/subclass.
- The Phaser avatar reflects palette/class identity through procedural visuals.
- Old v2 saves normalize into v3 with default character identity.
- Command input remains usable while the game is focused.
