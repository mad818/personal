# Armory And Economy Icon Batch

This batch starts the MW6U/V production art lane with project-original, game-ready icon atlases for the `/hq` Phaser RPG.

## Output

| Sheet | Source | Runtime output | Frames | Runtime use |
| --- | --- | --- | --- | --- |
| Low-tech weapon families | `assets/arpg/original/armory-weapon-icons.svg` | `public/arpg/armory-weapon-icons.png` | 21 at 48x48 | Armory drawer weapon-family rows |
| Economy and rune materials | `assets/arpg/original/economy-material-icons.svg` | `public/arpg/economy-material-icons.png` | 16 at 48x48 | Armory drawer currency, material, consumable, and rune rows |

## Art Direction

- Warm pixel ARPG style with bronze, amber, iron, ember, moss, frost, void, and relic-blue accents.
- Low-tech hand weapon focus: swords, daggers, axes, maces, hammers, spears, bows, shields, fist wraps, claws, whips, flails, sickles, scythes, and relic foci.
- Economy icons emphasize readable silhouettes at small HUD scale: gold, dust, shards, catalysts, monster parts, city scrip, vials, key fragments, and elemental runes.

## Provenance

- License: `project-original`.
- Source method: repo-authored SVG source rasterized locally with `sharp`.
- No paid AI, paid marketplace asset, external download, franchise-derived prompt, or unclear-license source was used.
- Future GPT Image 2 / Seedance 2.0 outputs must use the generator-assisted record path before joining this ledger.

## Verification

- `npm run arpg:art:generate`
- `npm run arpg:assets:check`
- Armory drawer should show weapon-family and economy icons without covering the Phaser playfield.
