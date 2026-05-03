# MW6V/W Arsenal Visual Itemization

`MW6V/W-ARPG-ARSENAL-VISUAL-ITEMIZATION` makes weapons a real game system instead of static icons. The slice adds a validated arsenal registry, project-original illustrated sheets, quality rules, named weapon cards, drop/upgrade VFX cues, and `/hq` UI proof across Kit, Gear, loadout, and reward surfaces.

## Runtime Contract

- `lib/arpgArsenalContent.json` is the canonical data contract for weapon templates, quality rules, named weapon samples, and VFX frames.
- `lib/arpgArsenalContent.ts` exposes helper functions for item visuals, upgrade caps, affix counts, drop previews, and comparison copy.
- `lib/arpgGameContent.ts` now supports the full quality ladder: `common`, `uncommon`, `rare`, `epic`, `relic`, `ancient`, and `mythic`.
- `lib/arpgGame.ts` keeps save version `3`; item quality behavior is additive and local-first.

## Visual Assets

The first arsenal sheet uses base weapon family art plus quality overlays, not 147 separate weapon images. This keeps the system broad enough to cover the full armory while leaving bespoke relic/mythic art for later boss rewards.

- `arsenal-weapon-family-icons`: 21 weapon family frames at `96x96`.
- `arsenal-quality-overlays`: 7 quality frames at `96x96`.
- `arsenal-named-weapon-cards`: 8 named weapon cards at `256x384`.
- `arsenal-vfx-drops`: 12 drop/upgrade/salvage frames at `128x128`.

All four sheets are project-original source SVG files under `assets/arpg/illustrated/source/`, rasterized into `public/arpg/illustrated/`, manifest-tracked in `lib/arpgAssetManifestData.json`, and recorded in `docs/game/aether-reliquary/generation-records/2026-04-27-arsenal-visual-itemization.md`.

## Gameplay Proof

- Enemy drops can now award weapon instances from the arsenal sample set.
- Equipping those items updates the loadout strip with arsenal icons and quality overlays.
- Upgrades use quality-specific caps instead of a single global cap.
- Collected equipment gains deterministic affixes from its quality budget.
- The Gear drawer shows power score, sockets, remaining upgrade rank, salvage output, named weapon cards, weapon families, and VFX cues.
- The Kit drawer exposes the arsenal icon grid and a compact "Claim arsenal drop" proof action for manual browser testing.

## Acceptance

This slice is accepted when:

- `npm run arpg:illustrated:generate` creates the four runtime sheets.
- `npm run arpg:assets:check` validates source, runtime paths, frame metadata, prompt/provenance records, and no forced paid dependency.
- `npm run arpg:content:check` validates arsenal count coverage and content references.
- `/hq` shows arsenal visuals in the loadout, Kit, Gear, reward, and Assets surfaces without hiding the command input or creating a `/game` route.
