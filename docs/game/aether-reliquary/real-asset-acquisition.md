# MW6V Real Asset Acquisition Plan

The previous local vector/procedural approach is not the target quality bar. `Aether Reliquary` needs real character designs and production asset packs: rigged humanoid bases, modular fantasy outfits, animation clips, weapons, props, and PBR materials that can be customized into original Aether Reliquary identities.

Current MW6 visual priority has pivoted to high-quality illustrated 2D. This real 3D lane remains useful for optional reference, model previews, and future animation studies, but it is no longer the required blocker for making `/hq` read as a game.

## Quality Bar

- Use real 3D models only when they add value as references, previews, or a later runtime upgrade.
- Prefer rigged humanoid models with glTF/GLB export, clear topology, texture support, and animation compatibility.
- Keep the browser game lightweight by optimizing imported runtime assets before committing them.
- Use project styling through kitbashing, recolor, shader/material passes, custom UI presentation, and lore-specific naming, not by accepting raw pack identity as the game identity.
- Do not use paid marketplace dependency, forced-paid AI, ripped files, franchise-derived art, or unverified licensing.
- Cheap paid packs can be used only when Mario explicitly approves them and a redacted `commercial-license` proof record confirms commercial browser-game runtime rights.

## Primary Source Lane

The machine-readable candidate list is `lib/arpgAssetCandidateSources.json` and is checked by `npm run arpg:asset-candidates:check`.

| Priority | Source | Use |
| --- | --- | --- |
| Critical | Quaternius Universal Base Characters | Playable protagonist, NPC bases, race variants |
| Critical | Quaternius Modular Character Outfits - Fantasy | Class armor, city faction armor, outfit customization |
| Critical | Quaternius Universal Animation Library | Walk, idle, combat, hit, interact, death animation proof |
| High | Quaternius Fantasy Props MegaKit | Hand weapons, loot, forge props, city props, item renders |
| High | Kenney Fantasy Town Kit and Modular Dungeon Kit | City/dungeon environment replacement for procedural placeholders |
| Medium | Poly Haven and ambientCG | CC0 HDRIs, stone, brass, leather, cloth, and ruin materials |
| Guarded | OpenGameArt | Per-asset checked audio/art only when license and attribution are clean |

## Sprite Tooling References

`Agent Sprite Forge` and `Sprite Fusion Pixel Snapper` are now tracked as optional MIT tooling candidates in `lib/arpgAssetToolCandidateSources.json`. They can help future sprite, FX, and map work once an operator approves a batch, but they are not real asset packs and do not satisfy the blocked `MW6V` imported-model requirement.

Use them only for original Aether Reliquary prompts, approved seed frames, or cleared source art. Generated or cleaned outputs still require prompt/provenance records, rights review, fixed dimensions, bottom-center anchors where applicable, manifest entries, and `npm run arpg:assets:check`.

## Intake Workflow

1. Download the free/standard CC0 asset pack from the official source page.
2. Place raw archives under `assets/arpg/intake/raw/` and extraction/work files under `assets/arpg/intake/work/`; these folders stay uncommitted.
3. Record source URL, license, author/provider, pack version/date, and selected files under `assets/arpg/intake/approved/`.
4. Run `npm run arpg:assets:import` to copy browser-safe `.glb`, `.gltf`, texture, and preview files from `assets/arpg/intake/work/<candidate-id>/` into `public/arpg/imported/<candidate-id>/`.
5. Add each accepted runtime file to `lib/arpgAssetManifestData.json`.
6. Run `npm run arpg:asset-candidates:check`, `npm run arpg:assets:check`, and `npm run arpg:production:check`.
7. Only then wire assets into `/hq` preview, Hero/Armory drawers, or gameplay.

Commercial-license proof records must be redacted before commit. Keep provider, official source URL, license summary, selected files, import date, and transformation notes; remove order numbers, account emails, payment details, receipt images, or private customer identifiers.

## Current Implementation State

The import bridge is ready, but the environment cannot fetch Quaternius directly. The shell download attempt failed with a socket permission error, so no real pack files were committed and no placeholder model was substituted.

The operator-safe path is:

1. Download the free/standard Quaternius packs from the official pages above.
2. Place the untouched archives in `assets/arpg/intake/raw/`.
3. Extract selected runtime files into folders named after the candidate ids, for example `assets/arpg/intake/work/quaternius-universal-base-characters/`.
4. Run `npm run arpg:assets:import`.
5. Add reviewed manifest entries for the imported files and rerun `npm run arpg:assets:check`.

The `/hq` Assets drawer now exposes this readiness state and the approved source candidates without claiming that a model exists before the files are actually present.

## First Import Batch

The first real import should not be more generated art. It should be:

- One Quaternius humanoid base character.
- One fantasy outfit set mapped to Wardbreaker.
- One outfit or robe set mapped to Relicweaver.
- One light scout/rogue outfit mapped to Ashrunner.
- A starter weapon/prop selection for sword, shield, staff, dagger, potion, chest, book, and forge objects.
- A walk/idle/combat animation proof on one character.

## Acceptance

The next 3D-specific acceptance pass should show a real imported model or rendered asset preview, not a simplified SVG/card mock. If no external pack has been downloaded yet, the correct 3D state is `blocked awaiting asset intake`, while the main MW6 visual path continues through the illustrated 2D asset bench.
