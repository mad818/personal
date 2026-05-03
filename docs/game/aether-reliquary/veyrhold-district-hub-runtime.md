# Veyrhold District Hub Runtime

`MW6FR4-ARPG-VEYRHOLD-DISTRICT-HUB-RUNTIME` makes Veyrhold read as the first playable town map instead of separate service, NPC, and job lists.

## Release Intent

The first release town needs one clear mental model: enter Veyrhold, choose a district, meet its local people, use its service, and understand the reward path. The full 12-city atlas remains future content, but Veyrhold now has a compact hub board that proves how a town will work.

## District Nodes

- Oathmarket: starter market, city scrip, rings, and accessory comparison.
- Warden's Steps: blacksmith, oath board, armor fitting, and first upgrade language.
- Bellroot Commons: alchemy, Ilo follow-up, oath-lamp mystery, and focus supplies.
- Pilgrim Rows: inn, checkpoint, road rumors, and travel preparation.

Each node links to existing NPCs, services, mini-quests, reward items, and one durable visit flag. Visiting a district selects that district in the local-first journey state, records the visit, gives the small first reward once, and keeps the player in the Map drawer.

## Runtime Surface

- `/hq` Map drawer owns the `Town hub` board.
- `/hq` People still owns local NPC details.
- `/hq` Journal still owns service outcomes and story proof.
- Phaser remains the playfield renderer; this slice does not add tilemaps, cloud saves, accounts, multiplayer, or a new route.

## Next Useful Expansion

The next town-depth slice can convert one district into a tighter release encounter: a small Oathmarket job chain with vendor inventory, one meaningful choice, and a clearer reward comparison card. Bespoke district art and audio remain MW6U/V production-asset work.
