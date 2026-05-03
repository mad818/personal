# Aether Reliquary Asset Intake

This folder is for staging real game assets before they are optimized and committed to runtime.

## Folders

- `raw/` is for downloaded official archives. It is intentionally ignored by git.
- `work/` is for extracted packs, selected GLB/glTF files, texture copies, and conversion work-in-progress. It is intentionally ignored by git.
- `approved/` is for small source-side proof files that are safe to commit, such as license notes, attribution screenshots, redacted commercial-license proof records, or import checklists.

## Rule

Only optimized, manifest-tracked runtime assets move into `public/arpg/imported/` or `public/arpg/3d/`. Do not commit raw archives, marketplace previews, ripped files, unclear-license assets, private purchase receipts, or franchise-derived art.

Cheap paid packs are allowed only when Mario explicitly approves the pack and a redacted proof record in `approved/` confirms commercial browser-game runtime rights. The proof record should describe the license, provider, source URL, selected files, import date, and transformations without exposing order numbers, account emails, or payment details.

Every accepted asset needs a `lib/arpgAssetManifestData.json` entry and must pass `npm run arpg:assets:check`.

## Import Command

After placing extracted files under `work/<candidate-id>/`, run:

```powershell
npm run arpg:assets:import
```

The importer copies browser-safe `.glb`, `.gltf`, textures, and preview images into `public/arpg/imported/<candidate-id>/`. It rejects raw archives in `work/`, oversized browser files, unknown candidate folders, and malformed glTF/GLB files. It does not update the manifest automatically; review the imported files, add explicit manifest entries, then run the asset checks.
