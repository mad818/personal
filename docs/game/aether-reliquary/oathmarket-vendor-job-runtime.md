# Oathmarket Vendor And Job Runtime

`MW6FR5-ARPG-OATHMARKET-VENDOR-JOB-RUNTIME` is the first deeper district loop for the Veyrhold release path.

## Intent

Veyrhold now has a town map, named locals, services, and mini-quests. Oathmarket is the first district to prove the next layer: a small economy beat with starter wares, item comparison language, and one choice-driven civic job.

## Runtime Content

- Starter wares: Copper Oath Ring, Pilgrim Tin Ring, Bellroot Cord Amulet, and Road Health Vial.
- Cost posture: wares use city scrip as the first local currency signal.
- Gear posture: common accessories are intentionally practical and visually plain so later rare, relic, ancient, mythic, and ultimate-grade items can stand apart.
- Ledger choices: mercy ruling, strict ruling, and witness compromise.
- Choice posture: only one ledger stance resolves the first job path, with different reward and reputation pressure.

## UI Contract

- `/hq` Map drawer owns the Oathmarket Exchange card under the Veyrhold town hub.
- `/hq` Kit/Inventory drawer owns the Oathmarket Kit wares and comparison copy.
- `/hq` Journal receives the result after a ledger choice resolves.
- All actions reuse local-first save flags, item collection, and reputation updates.

## Guardrails

- This is not a full vendor engine or economy rewrite.
- No `/game` route, cloud save, accounts, multiplayer, auction house, paid asset dependency, or unverified asset intake.
- Phaser remains the playfield renderer; vendor and choice details stay in compact DOM drawers.
