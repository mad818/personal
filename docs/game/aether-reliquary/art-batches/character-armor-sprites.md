# Character And Armor Sprite Batch

## Scope

`MW6V-CHARACTER-ARMOR-SPRITE-BATCH` replaces the tiny colored Phaser player marker with repo-authored, atlas-backed illustrated character sprites and adds armor-family icon art for the compact Hero and Armory drawers. The art direction has moved away from pixel art toward smoother fantasy game illustration.

## Runtime Assets

| Asset | Source | Runtime sheet | Frames | Anchor |
| --- | --- | --- | --- | --- |
| Playable class sprites | `assets/arpg/original/player-character-sprites.svg` | `public/arpg/player-character-sprites.png` | 8 frames, 96x128 | bottom-center |
| Armor family icons | `assets/arpg/original/armor-cosmetic-icons.svg` | `public/arpg/armor-cosmetic-icons.png` | 12 frames, 64x64 | center |

## Frame Order

The player sheet maps directly to the playable class registry: Wardbreaker, Relicweaver, Ashrunner, Oathblade, Thornwarden, Gravechanter, Ember Monk, and Wayfarer. Phaser selects the frame from the current v3 character profile and keeps the old generated marker only as a fallback if the sheet cannot load.

The armor sheet maps to the current armor-family registry: cloth, leather, mail, plate, bone, bark, glass, ash-forged, nacre, ceremonial, relic-bound, and city-faction.

## Production Rules

- Source art is hand-authored project-original SVG, rasterized locally through `npm run arpg:art:generate`.
- The runtime should render this lane as illustrated art, not pixel art; avoid `shape-rendering="crispEdges"` and avoid CSS `image-rendering: pixelated` on player, armor, and future production equipment sheets.
- No paid AI, paid marketplace asset, unverified download, or franchise-derived silhouette is used in this batch.
- Runtime PNGs are generated outputs; edit the SVG sources first, then regenerate.
- Any future animation strip should start from these approved seed frames, keep a fixed bottom-center anchor, and preserve silhouette, palette family, and transparent background.
