# MW6V Hero Kit Runtime Presentation

`MW6V-HERO-KIT-RUNTIME-PRESENTATION` promotes the approved Hero Kit image batch from proof previews into live `/hq` RPG surfaces.

## Runtime Use

| Surface | Runtime art now preferred |
| --- | --- |
| Persistent loadout | Equipped weapon, armor, relic, and charm slots show validated Hero Kit icons when a matching asset exists. |
| Click RPG combat panel | The compact browser-RPG strip shows the active class portrait, outfit card, and reward icon without covering the playfield. |
| Adventure drawer | Route, encounter, and loot cards now show approved location, enemy, and reward art before procedural fallback. |
| Hero drawer | Wardbreaker, Relicweaver, and Ashrunner class choices use Hero Kit portrait art as their first visual identity. |
| Inventory and Armory | Hero Kit weapon, item, armor, and equipment sheets remain visible and feed individual item rows where IDs match. |

## Guardrails

- No new external asset source was added in this slice.
- Real 3D/pack intake remains blocked until approved files exist locally.
- Generated/operator-provided art stays gated by prompt records, rights posture, cost posture, manifest metadata, and `npm run arpg:assets:check`.
- Phaser remains the gameplay renderer; DOM drawers carry accessible text and image-led browser-RPG choices.

## Acceptance

- `/hq` first viewport reads more like a game because the always-on HUD contains compact image identity instead of text-only slots.
- Adventure cards expose location, enemy, and loot art as part of the core click-RPG loop.
- Class selection is image-led for the first approved class set while unapproved classes keep safe procedural fallback.
- Command input, local-first saves, reduced-motion behavior, route stability, and no-`/game` posture remain unchanged.
