# Aether Reliquary Production Bible

## Genre Promise

`Aether Reliquary` is a single-player browser ARPG about a hopeful relic-bearer crossing ancient cities to repair a broken network of living reliquaries. It should feel like a downtime RPG that lives inside `/hq`, not a dashboard minigame and not a clone of any existing franchise.

The player fantasy is simple: choose a race, class, and subclass; explore warm-dangerous cities; meet memorable companions; fight readable real-time encounters; find low-tech hand weapons and relic gear; upgrade a personal build; and push a heroic campaign toward a final citadel.

## Protagonist Identity

The playable hero is player-created. Canon does not force a name, gender, body presentation, lineage, class, subclass, or palette. Runtime copy should use the saved character name when available, or neutral title copy such as `Reliquary Bearer`, `hero`, `bearer`, or `protagonist` when the player has not made a choice yet.

The opening identity scene is the Descent Ledger in the Bellroot Vestibule. The damaged civic name-thread is a story reason for character creation, not a hidden canon name.

## Tone

The tone is heroic adventure with warm danger. The world can be haunted, cursed, and strange, but the main emotional direction is courage, companionship, restoration, and discovery. Avoid grimdark fatalism and avoid direct visual or naming overlap with existing sci-fi/fantasy franchises.

## Originality Guardrails

- No franchise-derived names, armor silhouettes, factions, logos, character archetypes, or ripped assets.
- No "space marine", "imperium", "chaos legion", or similar protected-feeling terminology.
- Ancient technology is expressed as brass, glass, oath-machines, living archives, rune looms, and civic relics rather than guns, starships, lasers, or powered armor.
- Weaponry stays low-tech for MW6: blades, shields, bows, staves, fists, polearms, thrown weapons, and relic foci.

## World Cosmology

The old world was held together by reliquaries: civic machines that stored vows, routes, names, debts, maps, songs, and memories. When the reliquary network fractured, cities survived by making local bargains with their remaining machines.

The Hollow Regent rules Ebonwake Citadel by offering every city a painless ending. The hero restores the network by proving that the cities can choose difficult hope over easy surrender.

## Camera And Feel

- Phaser renders a top-down/isometric-feeling 2D playfield.
- The player should always know where the hero, enemies, interactables, objective, and danger telegraphs are.
- Combat should favor readable action over visual noise.
- Reduced-motion mode must calm hit-stop, particles, screen shake, and looping ambient effects.

## UI/HUD Rules

- Canvas first, text second: the playfield should dominate the first viewport.
- Persistent HUD stays compact: objective, health/focus, loadout, context prompt, and a few drawer buttons.
- Inventory, skill tree, codex, world map, quest journal, companion panel, credits, settings, and reset controls live in DOM drawers.
- The HQ command input remains usable and must ignore game hotkeys while focused.

## Save Policy

- All progression remains local-first.
- MW5 v2 saves must normalize safely into the MW6 v3 contract before v3 becomes active.
- Renderer objects never belong in save state.
- Save state should contain only serializable player, inventory, quest, map, companion, reputation, codex, crafting, and world flags.
