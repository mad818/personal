# MW6V Hero Kit Visual Style Lock

`Aether Reliquary` now has an explicit visual target: the approved Hero Kit character, outfit, weapon, and armor sheets are the baseline for future production art.

## Approved Direction

- High-fidelity illustrated 2D browser RPG art.
- Painted or rendered depth rather than flat vector shapes.
- Strong RPG silhouettes for characters, enemies, weapons, armor, and props.
- Warm ancient techno-fantasy materials: brass, leather, ash, glass, nacre, stone, root, cloth, and ember light.
- Readable at game scale in Phaser and DOM drawers.

## Rejected Direction

- Flat vector glyphs.
- Dashboard-style icon cards.
- Minimal symbolic cards.
- Placeholder source-sheet look.
- Low-detail token characters.
- Pixel art as the default direction.

## Approved Reference Assets

The machine-readable contract is `lib/arpgVisualDirectionContent.json`.

| Asset | Runtime |
| --- | --- |
| Hero Kit character portraits | `public/arpg/illustrated/hero-kit-character-portraits.png` |
| Hero Kit class outfits | `public/arpg/illustrated/hero-kit-class-outfits.png` |
| Hero Kit weapon and item icons | `public/arpg/illustrated/hero-kit-weapons-items.png` |
| Hero Kit armor and equipment icons | `public/arpg/illustrated/hero-kit-armor-equipment.png` |

## Next Visual Batches

- Enemy and boss high-fidelity cards.
- Bellroot prologue high-fidelity story replacement pack.
- Weapon quality variant cards.
- Twelve city and region high-fidelity cards.

Detailed prompt briefs for these batches live in `lib/arpgVisualAssetBriefs.json` and `high-fidelity-visual-asset-briefs.md`.

## Validation

`npm run arpg:visual:check` validates that approved style-target assets exist, are Hero Kit tagged, are operator-approved, and are not marked `style-rejected` or `reference-only`. It also verifies rejected prologue batches stay rejected in the illustrated bench and manifest.

`npm run arpg:visual-briefs:check` validates the next production prompts, sheet specs, style-reference links, and blocked visual cues before generation or artist intake begins.
