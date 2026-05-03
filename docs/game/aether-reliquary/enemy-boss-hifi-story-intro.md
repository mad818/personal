# MW6V Enemy/Boss High-Fidelity Art + Bellroot Intro Runtime

## Outcome

This slice promotes `enemy-boss-hifi-cards` from a prompt brief into a tracked runtime asset batch and turns the Bellroot opening into a playable non-combat sequence inside `/hq`.

The accepted visual direction remains high-fidelity illustrated 2D: painted/rendered browser RPG cards with material depth, not pixel art, not flat vector glyphs, not 3D-first, and not untracked generated placeholders.

## Runtime Art

- `assets/arpg/illustrated/generated-source/enemy-boss-hifi-cards.png` stores the reviewed 4x2 generated source sheet.
- `public/arpg/illustrated/enemy-boss-hifi-cards.png` stores the normalized eight-frame runtime strip.
- `lib/arpgIllustratedAssetBenchContent.json` and `lib/arpgAssetManifestData.json` mark the batch as operator-approved, rights-reviewed, non-franchise, project-original, and not a forced paid dependency.
- `/hq` now prefers this sheet for Adventure encounter art and Journal enemy codex cards before the older enemy-card seeds.

## Bellroot Opening Flow

The beginning is not combat-first. The player-created hero starts in Bellroot and moves through:

1. Sign the Descent Ledger.
2. Relight the Oath-Lamps.
3. Wake Ilo.
4. Study the Gate Monolith.
5. Claim the Loom-Shard.
6. Hear the Quiet Forge.
7. Enter the Warden's Antechamber.

Combat buttons remain visible as RPG affordances, but they route back to the Adventure intro flow until the antechamber step sets `combat:first-ward`. This keeps the game intuitive without starting the story by forcing a fight.

## Identity Rule

The protagonist is player-created. The runtime does not force a name, gender, or the word "Main" as a character name. Neutral copy can use role language such as `pilgrim`, `hero`, or the selected lineage/class until the player chooses a stronger identity.

## Gear Progression Note

The next arsenal expansion should extend the weapon-quality system across armor and accessories:

- Armor slots: helmet, armor, gloves, and boots.
- Accessory slots: necklace and rings.
- Acquisition paths: dungeons, quests, blacksmithing, alchemy, city vendors, boss drops, and faction rewards.
- Visual escalation: regular/common gear should look practical and bland; unique, relic, ancient, mythic, and ultimate-grade gear should gain noticeably stronger silhouettes, materials, glow, craft marks, and set identity.

This belongs to the open `MW6V/W-ARPG-ARSENAL-VISUAL-ITEMIZATION` lane, not the enemy/boss art slice.

## Next Visual Slice

`prologue-hifi-story-pack` should replace the rejected Bellroot glyph/vector cards with proper location, NPC, and prop illustrations for the ledger, oath-lamps, Ilo, Gate Monolith, Loom-Shard, Quiet Forge, Bellroot Vestibule, and Warden's Antechamber.
