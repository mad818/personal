# MW5 Aether Reliquary Phaser RPG Replacement

## Status

Shipped on the rebuilt `3100` runtime.

## Outcome

`/hq` now mounts `Aether Reliquary` as a Phaser 2D browser RPG instead of using the React Three Fiber ARPG room as the primary game surface. The HQ shell, command input, AI-working indicators, Pixi/Canvas VFX layer, accessible DOM HUD, and command-room fallback remain intact.

## Vertical Slice

- Zone: `The First Reliquary`, with gate room, archive alcove, forge pedestal, sentry hall, and locked north exit.
- Story: Gate Monolith, Oracle Companion, Relic-Forge Echo, loot caches, and a gate-fragment objective.
- Combat: Hollow Sentry, Ashling Scout, Rune Husk, and mini-boss `The Brass Warden`.
- Progression: HP, mana, XP, level 1 to 3, gold, active quest, local-first world flags, and old-save normalization.
- Gear: eight slots, qualities `common` through `relic`, affixes, and upgrade ranks `+0` through `+5`.
- Skills: Wardbreaker, Relicweaver, and Ashrunner starter paths with active/passive unlocks.
- Items: health vial, focus draught, upgrade shard, relic dust, gate key fragment, and equipment drops.

## Asset Pipeline

The slice uses project-original procedural Phaser sprites, tilemap shapes, tileset styling, interactable icons, and existing Pixi/Canvas rune VFX. The machine-readable source is `lib/arpgAssetManifestData.json`; `docs/assets/arpg-asset-ledger.md` tracks provenance and the future CC0/CC-BY intake rules.

## Verification

- `npm run arpg:assets:check`
- `npm run type-check`
- `npm run build`
- `npm run hq:e2e`
- `npm run route:e2e`
- `npm run tabs:e2e`
- `npm run verify`

Live `3100` health checks returned `200` for `/hq`, `/hq?focus=hq-chronicle`, and `/resources?view=impact&impactMode=graph`. A temporary `3101` dev-server proof attempt hit the known Windows `spawn EPERM` path, so final browser proof used the rebuilt managed `3100` production runtime.
