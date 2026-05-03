# Aether Reliquary World Atlas

MW6 defines 12 major cities and 48 sub-cities as the full-game canvas. The machine-readable registry lives in `lib/arpgProductionContent.json`; this doc explains how the regions should feel and how they support play.

## Region Order

1. `The First Reliquary` teaches the loop and opens the first gate.
2. `Veyrhold` anchors hearth politics and oath culture.
3. `Thalos Gate` opens travel, caravans, and route choices.
4. `Mirrorglass Haven` introduces identity, illusion, and reflection conflict.
5. `Cinderfall` deepens crafting and fire/forge enemies.
6. `Orrery Spire` reveals the false-star cosmology.
7. `Verdant Ossuary` explores healing, death, moss, and memory.
8. `Sable Meridian` expands trade, desert travel, and reputation economy.
9. `Ironbloom Bastion` stages the military faction arc.
10. `Nacre Deep` recovers drowned history.
11. `Gloamreach` resolves curse, stealth, and companion loyalty arcs.
12. `Auric Reliquary` turns collected truths into the citadel breach.
13. `Ebonwake Citadel` delivers the final fortress and postgame unlock.

## City Structure

Every major city must define:

- A culture and ruler/faction pressure.
- Four sub-cities with local stories.
- Local enemies, mini-boss, and a city-specific gear drop.
- Visual tileset and music mood.
- Level range and route unlock rules.
- At least one city story branch that can be represented through save flags.

## Travel Structure

Travel uses route connections, not free global teleporting. Each route has an unlock flag so campaign, companion, faction, or city choices can open roads. Later runtime slices should use those flags for gates, fast travel, road events, and world-map availability.

## Phaser Tilemap Conventions

- Major cities should be built from reusable district tile chunks: market, dock, forge, temple, slum, catacomb, barracks, academy, palace, wild-edge, and boss arena.
- Collision lives in data, not scene-local guesses.
- Interactables should use stable IDs matching quest and codex references.
- Imported tilesets must be listed in the asset manifest before runtime use.
