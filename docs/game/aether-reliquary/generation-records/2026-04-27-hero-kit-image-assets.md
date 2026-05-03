# Hero Kit Image Assets Generation Record

## Batch

- Batch id: `MW6U/V-HERO-KIT-IMAGE-ASSETS`
- Game: `Aether Reliquary`
- Generated on: `2026-04-27`
- Source path: `assets/arpg/illustrated/generated-source/`
- Runtime path: `public/arpg/illustrated/`
- Operator approval: approved by Mario for image generation in this slice
- Rights posture: `operator-verified-commercial-use`
- Cost posture: `free-tier-or-existing-access`
- Forced paid dependency: no
- Franchise posture: original Aether Reliquary prompts only; no Warhammer, Space Marine, Titus, Homefront, logos, famous characters, ripped assets, marketplace previews, or protected armor silhouettes

## Tool

- Tool id: `gpt-image-2`
- Tool name: `GPT Image 2 / Codex image generation`
- Model name recorded in manifest: `gpt-image-2`
- Runtime use: static illustrated cards and icons only

## Accepted Outputs

| Output | Source file | Runtime file | Frames | Frame size |
| --- | --- | --- | ---: | --- |
| Hero/class portraits | `assets/arpg/illustrated/generated-source/hero-kit-portraits-outfits.png` | `public/arpg/illustrated/hero-kit-character-portraits.png` | 3 | 256x256 |
| Class outfit cards | `assets/arpg/illustrated/generated-source/hero-kit-portraits-outfits.png` | `public/arpg/illustrated/hero-kit-class-outfits.png` | 3 | 256x384 |
| Weapon and item icons | `assets/arpg/illustrated/generated-source/hero-kit-weapons-items.png` | `public/arpg/illustrated/hero-kit-weapons-items.png` | 12 | 96x96 |
| Armor and equipment icons | `assets/arpg/illustrated/generated-source/hero-kit-armor-equipment.png` | `public/arpg/illustrated/hero-kit-armor-equipment.png` | 8 | 96x96 |

## Prompts

### Portraits And Outfits

Create a high-quality illustrated 2D browser RPG asset sheet for `Aether Reliquary`, an original warm ancient techno-fantasy RPG. Make a clean 3x2 contact sheet, no text and no logos. Top row: three bust portraits for Wardbreaker, Relicweaver, and Ashrunner. Bottom row: three full-body class outfit cards for heavy oath armor, relic scholar robes, and ash scout leathers. Style: detailed painterly game art, heroic adventure, low-tech hand weapon fantasy, brass, amber relic light, worn leather, cloth, stone, ancient runes, warm danger, clean silhouettes, neutral dark background. Avoid modern sci-fi, guns, power armor, franchise likenesses, Warhammer, Space Marine, Titus, Homefront, logos, captions, watermarks, and UI text.

### Weapons And Items

Create a high-quality illustrated 2D browser RPG inventory icon sheet for `Aether Reliquary`, an original warm ancient techno-fantasy RPG. Make a clean 4x3 grid of isolated item icons on a dark neutral background, no text and no logos. Items in order: sword, shield, relic staff, dagger, bow, axe, mace, spear, health vial, relic dust, upgrade shard, gate fragment. Style: detailed painterly game icons, readable silhouettes, low-tech hand weapon fantasy, brass, amber crystal, worn steel, leather wraps, warm relic light. Avoid modern sci-fi, guns, franchise likenesses, Warhammer, Space Marine, Titus, Homefront, logos, captions, watermarks, and UI text.

### Armor And Equipment

Create a high-quality illustrated 2D browser RPG equipment icon sheet for `Aether Reliquary`, an original warm ancient techno-fantasy RPG. Make a clean 4x2 grid of isolated gear icons on a dark neutral background, no text and no logos. Items in order: helm, chest armor, boots, gloves, belt, cloak, ring, amulet. Style: detailed painterly fantasy game icons, low-tech ancient techno-fantasy, brass trim, worn steel, leather, cloth, amber relic gem accents, readable silhouettes. Avoid modern sci-fi, guns, franchise likenesses, Warhammer, Space Marine, Titus, Homefront, logos, captions, watermarks, and UI text.

## Review Notes

- Accepted sheets were reviewed visually before runtime promotion.
- No visible text, logos, watermarks, franchise references, or modern sci-fi elements were accepted.
- The portrait/outfit sheet was split into separate portrait and outfit runtime sheets.
- Weapon/item and armor/equipment sheets were cropped by grid cell and normalized into fixed-size runtime icon frames.
- No rejected output was committed for runtime use.

## Transformations

- `npm run arpg:illustrated:generate` uses local `sharp` processing only.
- Source contact sheets are retained under `assets/arpg/illustrated/generated-source/`.
- Runtime sheets are generated under `public/arpg/illustrated/`.
- Manifest entries record source path, prompt record path, review path, dimensions, tags, tool metadata, rights posture, and cost posture.

## Validation

- Required gates: `npm run arpg:illustrated:generate`, `npm run arpg:asset-candidates:check`, `npm run arpg:assets:check`, `npm run arpg:production:check`, and `npm run arpg:release:check`.
- `/hq` surfaces: Assets drawer, Hero drawer, Inventory drawer, and Armory drawer.
