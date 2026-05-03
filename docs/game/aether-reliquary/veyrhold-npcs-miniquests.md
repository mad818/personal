# Veyrhold NPCs And Mini-Quests

`MW6FR3-ARPG-VEYRHOLD-NPCS-MINIQUESTS` deepens the first release town without widening the game beyond the accepted Veyrhold launch scope.

## Release Intent

Veyrhold should not feel like a menu of services. The first-town release now has named locals, four district-scale jobs, and service outcome cards that explain what the player earns and why it matters. This keeps the first release playable around one town while later MW6 city slices remain locked previews.

## Runtime Content

- Named locals: Dame Ivara Bellroot, Mara Cindersmith, Ilo, Tovin of the Oathmarket, and Sister Vael of the Rows.
- District mini-quests: Oathmarket ledger work, Warden's Steps shield fitting, Bellroot Commons blue-lamp follow-up, and Pilgrim Rows road blessing.
- Service outcomes: first temper, safe vials, starter wares, road checkpoint, and first civic contract.
- Reward posture: low-tier practical gear and resources stay useful early, while later slices can attach unique, relic, ancient, mythic, and ultimate-grade visuals to dungeon, quest, blacksmithing, and alchemy sources.

## UI Contract

- `/hq` Map drawer owns the first town services and mini-quest launcher.
- `/hq` People drawer owns the named Veyrhold local roster.
- `/hq` Journal drawer owns the service outcome cards and story/result proof.
- Phaser remains the live playfield; text-heavy town details stay in compact DOM drawers.

## Guardrails

- No `/game` route, account system, cloud save, multiplayer, or external game server.
- No fake replacement art or unapproved generated assets.
- This slice proves town depth through content and local-first UI actions; bespoke district maps, NPC portraits, voice, music, and production city art remain later MW6U/V work.
