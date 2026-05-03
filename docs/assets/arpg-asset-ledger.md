# Aether Reliquary ARPG Asset Ledger

This ledger is the legal and production handoff record for any `Aether Reliquary` sprite, tilemap, tileset, icon, FX sheet, model, texture, audio, or procedural fallback committed to Homefront.

Accepted runtime asset licenses are `project-original`, `CC0-1.0`, clean `CC-BY-4.0`, and `commercial-license` only after a redacted operator proof record is committed under `assets/arpg/intake/approved/`. Commercial-license entries must not contain receipts, account details, private customer data, marketplace previews, personal-use-only terms, or unreviewed samples.

## Current Committed Assets

| Asset ID | Type | Local path | Source | License | Credit posture | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `procedural-first-reliquary-tilemap` | Tilemap | `components/home/arpg/phaser/ArpgPhaserGame.tsx` | Repo-authored | `project-original` | No visible credit required | Active Phaser fallback |
| `procedural-reliquary-floor-tileset` | Tileset | `components/home/arpg/phaser/ArpgPhaserGame.tsx` | Repo-authored | `project-original` | No visible credit required | Active Phaser fallback |
| `procedural-player-sprite` | Sprite sheet | `components/home/arpg/phaser/ArpgPhaserGame.tsx` | Repo-authored | `project-original` | No visible credit required | Active Phaser fallback |
| `procedural-enemy-sprites` | Sprite sheet | `components/home/arpg/phaser/ArpgPhaserGame.tsx` | Repo-authored | `project-original` | No visible credit required | Active Phaser fallback |
| `procedural-loot-and-lore-icons` | UI icon | `components/home/arpg/phaser/ArpgPhaserGame.tsx` | Repo-authored | `project-original` | No visible credit required | Active Phaser fallback |
| `procedural-rune-vfx-sheet` | FX sheet | `components/home/arpg/pixi/ArpgPixiStage.tsx` | Repo-authored | `project-original` | No visible credit required | Active VFX fallback |
| `original-first-reliquary-enemy-sheet` | Sprite sheet | `public/arpg/enemies-first-reliquary.png` | `assets/arpg/original/first-reliquary-enemies.svg` | `project-original` | No visible credit required | Active combat art |
| `original-first-reliquary-item-icons` | UI icon | `public/arpg/items-first-reliquary.png` | `assets/arpg/original/first-reliquary-items.svg` | `project-original` | No visible credit required | Active item art |
| `original-first-reliquary-status-icons` | FX sheet | `public/arpg/status-effects.png` | `assets/arpg/original/first-reliquary-status.svg` | `project-original` | No visible credit required | Active combat status art |
| `original-armory-weapon-icons` | UI icon | `public/arpg/armory-weapon-icons.png` | `assets/arpg/original/armory-weapon-icons.svg` | `project-original` | No visible credit required | Active armory drawer art |
| `original-economy-material-icons` | UI icon | `public/arpg/economy-material-icons.png` | `assets/arpg/original/economy-material-icons.svg` | `project-original` | No visible credit required | Active economy drawer art |
| `original-player-character-sprites` | Sprite sheet | `public/arpg/player-character-sprites.png` | `assets/arpg/original/player-character-sprites.svg` | `project-original` | No visible credit required | Active illustrated playable class art |
| `original-armor-cosmetic-icons` | UI icon | `public/arpg/armor-cosmetic-icons.png` | `assets/arpg/original/armor-cosmetic-icons.svg` | `project-original` | No visible credit required | Active illustrated armor drawer art |
| `enemy-boss-hifi-cards` | Enemy/boss cards | `public/arpg/illustrated/enemy-boss-hifi-cards.png` | `assets/arpg/illustrated/generated-source/enemy-boss-hifi-cards.png` | `project-original` | No visible credit required | Active high-fidelity enemy/boss card art |
| `arsenal-weapon-family-icons` | Gear icon | `public/arpg/illustrated/arsenal-weapon-icons.png` | `assets/arpg/illustrated/source/arsenal-weapon-icons.svg` | `project-original` | No visible credit required | Active arsenal weapon art |
| `arsenal-quality-overlays` | Gear icon | `public/arpg/illustrated/arsenal-quality-overlays.png` | `assets/arpg/illustrated/source/arsenal-quality-overlays.svg` | `project-original` | No visible credit required | Active quality overlay art |
| `arsenal-named-weapon-cards` | Gear icon cards | `public/arpg/illustrated/arsenal-named-weapon-cards.png` | `assets/arpg/illustrated/source/arsenal-named-weapon-cards.svg` | `project-original` | No visible credit required | Active named weapon cards |
| `arsenal-vfx-drops` | FX sheet | `public/arpg/illustrated/arsenal-vfx-drops.png` | `assets/arpg/illustrated/source/arsenal-vfx-drops.svg` | `project-original` | No visible credit required | Active arsenal drop and upgrade VFX |
| `prologue-location-cards` | Location cards | `public/arpg/illustrated/prologue-location-cards.png` | `assets/arpg/illustrated/source/prologue-location-cards.svg` | `project-original` | No visible credit required | Rejected/reference-only; not production game art |
| `prologue-companion-portraits` | Character portrait | `public/arpg/illustrated/prologue-companion-portraits.png` | `assets/arpg/illustrated/source/prologue-companion-portraits.svg` | `project-original` | No visible credit required | Rejected/reference-only; not production game art |
| `prologue-story-prop-icons` | Gear icon | `public/arpg/illustrated/prologue-story-props.png` | `assets/arpg/illustrated/source/prologue-story-props.svg` | `project-original` | No visible credit required | Rejected/reference-only; not production game art |

The machine-readable source for this table is `lib/arpgAssetManifestData.json`; `npm run arpg:assets:check` validates provenance, license proof, frame metadata, optimization state, and CC-BY credit requirements.

## Project-Original Art Lane

The first committed art packs are hand-authored SVG source rasterized locally through `npm run arpg:art:generate` using `sharp`. The current direction is illustrated/vector fantasy game art, not pixel art; keep player, armor, and future equipment sheets anti-aliased unless a later art-direction note explicitly reintroduces retro sprites. These slices do not use paid AI, paid marketplaces, external downloads, or franchise-derived silhouettes. Runtime PNG sheets live under `public/arpg/`, while editable source remains under `assets/arpg/original/`.

## Illustrated 2D Asset Bench

`MW6U/V-ILLUSTRATED-2D-ASSET-BENCH` makes high-quality illustrated 2D the primary visual production lane for `Aether Reliquary`. Bench source sheets live under `assets/arpg/illustrated/source/`, normalized runtime sheets live under `public/arpg/illustrated/`, and the machine-readable contract lives in `lib/arpgIllustratedAssetBenchContent.json`.

The first validated seed batch includes character portraits, enemy cards, location cards, gear icons, and skill/VFX icons. It is project-original seed art generated locally with `npm run arpg:illustrated:generate`, while GPT Image 2 remains optional for future operator-approved batches.

`MW6U/V-HERO-KIT-IMAGE-ASSETS` adds the first operator-approved generated production batch: 3 hero/class portraits, 3 class outfit cards, 12 weapon/item icons, and 8 armor/equipment icons. Source contact sheets are stored in `assets/arpg/illustrated/generated-source/`, runtime sheets are stored in `public/arpg/illustrated/`, and the prompt/provenance record is `docs/game/aether-reliquary/generation-records/2026-04-27-hero-kit-image-assets.md`.

`MW6V/W-ARPG-ARSENAL-VISUAL-ITEMIZATION` adds the first broad weapon-system visual batch: 21 weapon-family icons, 7 quality overlays, 8 named weapon cards, and 12 drop/upgrade/salvage VFX frames. The batch is project-original SVG source, not paid AI output, and the provenance record is `docs/game/aether-reliquary/generation-records/2026-04-27-arsenal-visual-itemization.md`.

`MW6V-ENEMY-BOSS-HIFI-STORY-INTRO` adds the first Hero Kit-quality enemy/boss production card sheet: Hollow Sentry, Ashling Scout, Rune Husk, The Brass Warden, Glass Gnawer, Ember Mote, Veyrhold Champion, and The Hollow Regent seed. The generated source contact sheet is stored under `assets/arpg/illustrated/generated-source/`, normalized runtime output is stored under `public/arpg/illustrated/`, and the prompt/provenance record is `docs/game/aether-reliquary/generation-records/2026-04-29-enemy-boss-hifi-cards.md`.

`MW6V-ARPG-PROLOGUE-VISUAL-ASSETS` attempted the first prologue-specific story art batch: 2 Bellroot location cards, 2 companion portraits, and 6 intro prop icons for the Descent Ledger, oath-lamps, Ilo's cradle, Gate Monolith, Loom-Shard, and Quiet Forge. Mario rejected this flat SVG/glyph style on 2026-04-28 as not appropriate for production game art, so the files remain provenance-only and must be replaced by high-fidelity painted/rendered 2D or approved clean-license assets before they lead `/hq` visuals.

`PREMIUM-LIVE-RPG-VISUAL-EXPANSION` adds the first explicit replacement contract for those retired prologue sheets. `lib/arpgVisualReplacementContent.json` maps `prologue-location-cards`, `prologue-companion-portraits`, and `prologue-story-prop-icons` to the queued `prologue-hifi-story-pack` targets, lists approved fallback sheets, and is validated by `npm run arpg:visual-replacements:check` so rejected/reference-only art cannot quietly become leading runtime imagery again.

`MW6V-ARPG-HERO-KIT-STYLE-LOCK` records the approved visual target: Hero Kit character portraits, class outfits, weapons/items, and armor/equipment are the quality reference for the next asset batches. The contract is `lib/arpgVisualDirectionContent.json`, and `npm run arpg:visual:check` verifies that approved target assets are not rejected/reference-only.

Every illustrated batch must keep a prompt/provenance record under `docs/game/aether-reliquary/generation-records/`, a manifest entry in `lib/arpgAssetManifestData.json`, runtime output dimensions that match the bench contract, and a cost posture that is not a forced paid dependency.

## Real 3D Asset Acquisition Lane

The locally generated vector/procedural 3D-preview experiment was rejected as below the quality bar. This lane remains available for optional reference or future model previews, but it is no longer the main visual blocker now that the illustrated 2D bench is the primary game-art path. The next accepted 3D character lane must use real CC0, clean CC-BY, or redacted commercial-license asset packs as source material, then customize and optimize them for Aether Reliquary.

The candidate registry is `lib/arpgAssetCandidateSources.json`, the intake guide is `docs/game/aether-reliquary/real-asset-acquisition.md`, and raw downloads stay in ignored `assets/arpg/intake/raw/` or `assets/arpg/intake/work/` folders until a small optimized runtime file is ready for `public/arpg/imported/` or `public/arpg/3d/`. Any accepted model still needs a manifest entry and must pass `npm run arpg:assets:check`.

If a cheap paid pack is selected, add a redacted proof JSON under `assets/arpg/intake/approved/` first. The proof must state provider, official source URL, license summary, commercial browser-game runtime rights, selected files, import date, and transformation notes. Do not commit purchase receipts, order numbers, account emails, or private customer data.

`npm run arpg:assets:import` is the current bridge from local intake work to runtime files. It scans `assets/arpg/intake/work/<candidate-id>/`, rejects archives and malformed or oversized files, copies accepted `.glb`, `.gltf`, texture, and preview assets into `public/arpg/imported/<candidate-id>/`, and prints an import report. It intentionally does not create manifest records automatically because each runtime asset still needs human provenance review before it becomes visible in the game.

No accepted real 3D runtime model is committed yet. The next accepted preview must come from an official CC0 or fully attributed CC-BY pack with a matching proof record, not from another generated/vector placeholder.

## Generator-Assisted Art Lane

GPT Image 2 and Seedance 2.0 are allowed as optional operator-approved game-art tools for `Aether Reliquary`, not as mandatory dependencies. Use GPT Image 2 first for illustrated portraits, enemy cards, city/location cards, weapon and armor icons, skill icons, sprite seeds, tileset references, and VFX reference sheets. Use Seedance 2.0 primarily for animation timing, motion studies, attack readability, hit reactions, and VFX movement reference.

Generated output may enter `public/arpg/` only when all of these are true:

- The tool access path does not create a forced paid dependency for the project.
- The operator explicitly approved that tool/model for the asset batch.
- The terms and output rights were reviewed for the committed runtime use.
- A prompt and output review record is stored in the repo, preferably under `docs/game/aether-reliquary/generation-records/`.
- The asset was hand-spliced, cleaned, normalized, or redrawn enough to fit the warm pixel ARPG style and avoid raw one-shot drift.
- Illustrated card/icon outputs are cropped or normalized through the illustrated bench before runtime use.
- `lib/arpgAssetManifestData.json` includes `generation` metadata plus the `generator-assisted` tag.
- `npm run arpg:assets:check` passes before the asset is accepted.
- `npm run arpg:production:check` confirms generator-assisted art remains optional and not a forced paid dependency.

The detailed workflow lives in `docs/game/aether-reliquary/generator-assisted-art-pipeline.md`.

## Optional Sprite Tooling Lane

`lib/arpgAssetToolCandidateSources.json` tracks operator-reviewed helper tools that can support sprite or map production without becoming runtime assets. The first guarded candidates are `Agent Sprite Forge` and `Sprite Fusion Pixel Snapper`, both recorded as MIT-licensed tooling references. They do not unblock `MW6V` real asset intake, do not grant rights to generated or cleaned images, and do not let output bypass prompt/provenance records, frame normalization, visible-credit rules, or `npm run arpg:assets:check`.

These tools may be used only as local production helpers for original Aether Reliquary prompts, approved source frames, or already-cleared art. Do not vendor the repositories, add runtime dependencies, or copy showcase assets/examples into the game without a separate explicit plan and rights review.

## Approved Source Policy

| Source | Default posture | Best use in Aether Reliquary | Notes |
| --- | --- | --- | --- |
| Kenney | CC0-first | Low-poly props, icons, small game-ready kits | Use official asset pages or included license files before committing. |
| Quaternius | CC0-first | Stylized low-poly fantasy ruins, props, modular kits | Good fit for the current art direction. |
| Poly Haven | CC0-first | HDRIs, neutral props, material references | Prefer small/optimized assets only. |
| ambientCG | CC0-first | Stone, bronze, floor, cloth/leather PBR textures | Downsample to the actual on-screen need. |
| Sketchfab | CC-BY guarded | One-off models only when attribution is complete | Reject NC, ND, SA, editorial, unknown, ripped, or franchise-derived assets. |

## Intake Checklist

- Record `id`, `label`, `kind`, `role`, `localPath`, `sourceUrl`, `licenseProofUrl`, `author`, `license`, `attribution`, `visibleCreditRequired`, `optimized`, frame sizing, anchor, and `tags` before committing.
- Commit only optimized runtime files under `public/arpg/`; keep raw downloads outside the repo or in an ignored source-assets folder.
- Default 2D shipping formats are PNG/WebP sprite sheets, Tiled-compatible JSON tilemaps, compact audio, and transparent UI icons. Future 3D support can still use GLB/glTF 2.0 where needed.
- Default illustrated shipping formats are PNG/WebP card sheets and icon sheets with fixed frame dimensions. Future 3D support can still use GLB/glTF 2.0 where needed, but 3D is optional/reference until a real pack is approved.
- Normalize sprite sheets to fixed frame size, bottom-center character anchors, transparent backgrounds, and no per-frame style drift before committing.
- Use glTF Transform or an equivalent repeatable step for prune, dedup, resize, mesh compression, and texture compression if external 3D assets are introduced later.
- CC-BY assets must appear in the in-game Assets drawer. CC0 assets should still be tracked here for provenance.
- Do not commit marketplace previews, generator-assisted assets without prompt/rights records, ripped game files, Warhammer-derived assets, or any source with unclear licensing.
