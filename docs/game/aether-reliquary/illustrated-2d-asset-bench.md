# MW6U/V Illustrated 2D Asset Bench

The visual direction for `Aether Reliquary` is now high-quality illustrated 2D browser RPG presentation. Phaser remains the runtime, while portraits, enemy cards, location cards, gear icons, and skill/VFX icons become the production surface that can be generated, reviewed, normalized, and promoted safely.

Correction from operator review on 2026-04-28: "illustrated 2D" does **not** mean flat SVG glyphs, dashboard icons, or minimal symbolic cards. Those assets are rejected/reference-only. Game-facing art should feel like painted or rendered browser-RPG art with believable materials, silhouettes, depth, and character.

The approved quality target is locked in `visual-direction-style-lock.md`: use the current Hero Kit character, outfit, weapon, and armor sheets as the style baseline for future enemies, bosses, locations, gear, and prologue replacements.

## Runtime Contract

- Source seed sheets live under `assets/arpg/illustrated/source/`.
- Runtime PNG sheets live under `public/arpg/illustrated/`.
- The machine-readable bench is `lib/arpgIllustratedAssetBenchContent.json`.
- The runtime manifest remains `lib/arpgAssetManifestData.json`.
- `npm run arpg:illustrated:generate` rasterizes the source sheets and rejects dimension drift or oversized outputs.
- `npm run arpg:assets:check` validates source paths, runtime files, prompt records, operator approval, rights posture, cost posture, tags, frame counts, and manifest alignment.
- `npm run arpg:visual:check` validates the approved Hero Kit style target and ensures rejected glyph batches stay rejected/reference-only.
- Bench batches may be marked `rejected` or `reference-only`; those batches remain provenance-tracked but must not be shown as approved production art in `/hq`.

## First Seed Batch

| Category | Count | Runtime file |
| --- | ---: | --- |
| Character/class portraits | 3 | `public/arpg/illustrated/character-portraits.png` |
| Enemy/boss cards | 4 | `public/arpg/illustrated/enemy-cards.png` |
| Location cards | 3 | `public/arpg/illustrated/location-cards.png` |
| Gear/item icons | 8 | `public/arpg/illustrated/gear-icons.png` |
| Skill/VFX icons | 6 | `public/arpg/illustrated/skill-vfx-icons.png` |

## Hero Kit Production Batch

`MW6U/V-HERO-KIT-IMAGE-ASSETS` is the first operator-approved generated image batch promoted through this bench. Its prompt and review record is `docs/game/aether-reliquary/generation-records/2026-04-27-hero-kit-image-assets.md`.

| Category | Count | Runtime file |
| --- | ---: | --- |
| Hero/class portraits | 3 | `public/arpg/illustrated/hero-kit-character-portraits.png` |
| Class outfit cards | 3 | `public/arpg/illustrated/hero-kit-class-outfits.png` |
| Weapon and item icons | 12 | `public/arpg/illustrated/hero-kit-weapons-items.png` |
| Armor and equipment icons | 8 | `public/arpg/illustrated/hero-kit-armor-equipment.png` |

## Enemy/Boss High-Fidelity Batch

`MW6V-ENEMY-BOSS-HIFI-STORY-INTRO` is the first Hero Kit-quality enemy/boss image batch promoted through the bench. Its prompt and review record is `docs/game/aether-reliquary/generation-records/2026-04-29-enemy-boss-hifi-cards.md`.

| Category | Count | Runtime file |
| --- | ---: | --- |
| Enemy/boss cards | 8 | `public/arpg/illustrated/enemy-boss-hifi-cards.png` |

## GPT Image 2 Posture

GPT Image 2 is optional. It can create drafts for the same categories, but generated images are not automatically shippable. Every GPT Image 2 batch must include a prompt record, operator approval, terms review date, rights posture, cost posture, source image path, normalized runtime path, manifest entry, and passing validation before `/hq` can prefer it over procedural or seed art.

## Rejected Style Guardrail

- Reject flat vector/glyph sheets, UI badges, symbolic dashboard cards, simple shape icons, and low-detail source-sheet art.
- Prefer high-fidelity 2D source: painted/generated art reviewed by the operator, clean-license pack art, or project-original art with real material/detail polish.
- If a batch fails visual review, keep the files only for provenance and replacement planning; do not render them as production game art.

## Acceptance

- `/hq` Assets drawer shows the illustrated 2D lane and previews approved sheets.
- Real 3D intake remains visible but optional/blocked until local packs exist.
- No fake 3D placeholder is substituted.
- No generated output ships without provenance.
- Rejected/reference batches do not appear in the approved preview grid.
- No forced paid dependency is introduced.
