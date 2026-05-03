# 2026-04-27 Illustrated 2D Seed Batch

## Batch

- Tool id: `other-operator-approved`
- Tool name: `Aether Asset Bench`
- Model name: `project-original-vector-seed`
- Cost posture: `free-tier-or-existing-access`
- Rights posture: `operator-verified-commercial-use`
- Operator approval: approved for project-original seed art
- Runtime output path: `public/arpg/illustrated/`
- Source path: `assets/arpg/illustrated/source/`

## Intent

This batch establishes the approved illustrated 2D production lane for `Aether Reliquary`. It is not GPT Image 2 output. The source art is project-original SVG seed art authored inside the repo so the pipeline can prove prompt records, local normalization, manifest intake, and `/hq` preview wiring without waiting on paid AI or external downloads.

## Prompt Templates

These are the locked templates for future GPT Image 2 or operator-provided batches:

- Character portrait: `Aether Reliquary illustrated 2D RPG portrait of [lineage/class], warm ancient techno-fantasy, detailed armor silhouette, centered bust, painterly game card, no text, no logo, no famous franchise influence, clean readable face, amber relic light.`
- Class outfit: `Aether Reliquary class outfit concept for [class/subclass], low-tech hand-weapon fantasy, layered cloth/leather/metal, warm danger, full-body readable silhouette, neutral background, no text, no franchise armor cues.`
- Gear icon: `Aether Reliquary item icon, [item name], detailed illustrated RPG inventory icon, centered object, strong silhouette, warm brass and ember lighting, neutral matte background, no text, no logo.`
- Enemy card: `Aether Reliquary enemy card art for [enemy name], ancient techno-fantasy monster, readable attack shape, warm dangerous lighting, vertical game card composition, no text, no franchise-derived design.`
- Location card: `Aether Reliquary illustrated browser RPG location card for [city/sub-city], warm heroic adventure, ancient ruins and relic machinery, atmospheric depth, no text, no logo, no modern sci-fi.`
- Skill/VFX icon: `Aether Reliquary skill icon for [skill/status], circular magical effect, warm relic energy, readable at small UI size, dark neutral background, no text, no logo, no photorealism.`

## Outputs

| Manifest ID | Source | Runtime | Frames |
| --- | --- | --- | --- |
| `illustrated-character-portrait-seeds` | `assets/arpg/illustrated/source/character-portraits.svg` | `public/arpg/illustrated/character-portraits.png` | 3 portraits |
| `illustrated-enemy-card-seeds` | `assets/arpg/illustrated/source/enemy-cards.svg` | `public/arpg/illustrated/enemy-cards.png` | 4 enemy cards |
| `illustrated-location-card-seeds` | `assets/arpg/illustrated/source/location-cards.svg` | `public/arpg/illustrated/location-cards.png` | 3 location cards |
| `illustrated-gear-icon-seeds` | `assets/arpg/illustrated/source/gear-icons.svg` | `public/arpg/illustrated/gear-icons.png` | 8 gear icons |
| `illustrated-skill-vfx-icon-seeds` | `assets/arpg/illustrated/source/skill-vfx-icons.svg` | `public/arpg/illustrated/skill-vfx-icons.png` | 6 skill/VFX icons |

## Review

- No paid AI was used.
- No external asset pack was used.
- No franchise-derived prompt, character, logo, armor silhouette, or marketplace preview was used.
- Runtime files are generated locally by `npm run arpg:illustrated:generate`.
- Manifest entries carry generation/provenance metadata and are checked by `npm run arpg:assets:check`.
