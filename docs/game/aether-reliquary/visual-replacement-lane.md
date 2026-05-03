# Aether Reliquary Visual Replacement Lane

## Purpose

This lane starts replacing older or rejected imagery without pretending the final prologue art already exists. The rejected Bellroot prologue SVG/glyph sheets stay in the repo as provenance only; they must not lead `/hq` production visuals.

## Contract

- Machine-readable source: `lib/arpgVisualReplacementContent.json`
- Runtime helper: `lib/arpgVisualReplacementContent.ts`
- Validation gate: `npm run arpg:visual-replacements:check`
- Queued replacement batch: `prologue-hifi-story-pack`
- Retired sheets: `prologue-location-cards`, `prologue-companion-portraits`, `prologue-story-prop-icons`

## Replacement Targets

The queued pack covers Bellroot Vestibule, Warden's Antechamber, Ilo, Keeper Elian, Descent Ledger, oath-lamp, oracle cradle, Gate Monolith, Loom-Shard, and Quiet Forge.

Until those assets are approved and normalized, `/hq` can use only approved fallback sheets such as the Hero Kit, active location seeds, enemy/boss high-fidelity cards, and arsenal VFX. The validation script rejects any fallback with `style-rejected` or `reference-only` tags.

## UI Surface

The `/hq` Production drawer now shows the replacement lane alongside presentation readiness. The Assets/Credits drawer shows the replacement queue so the retired art status is visible where asset provenance already lives.
