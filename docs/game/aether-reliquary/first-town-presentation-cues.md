# First-Town Presentation Cues

`MW6V-ARPG-ART-AUDIO-VFX` now has a first production-feel layer that does not depend on deployment, drone hardware, or external asset packs.

## What Shipped

- `lib/arpgFirstTownPresentationContent.json/.ts` defines six Bellroot and Veyrhold presentation cues.
- Each cue records ambient copy, VFX intent, audio intent, UI proof surface, approved runtime asset ids, and a reduced-motion alternative.
- `/hq` Adventure shows the active presentation cue beside the current travel/story context.
- `/hq` Map shows Veyrhold district presentation cues for the town arrival, Oathmarket, Warden's Steps, and Bellroot Commons.
- `/hq` Production shows a compact readiness proof for cue count, approved asset references, surfaces, and rejected-art posture.

## Guardrails

- The rejected prologue SVG/glyph sheets remain reference-only and are not used by the cue registry.
- Audio entries are staging intent only; no autoplay audio engine or external dependency was added.
- VFX cues use existing approved runtime sheets, especially `arsenal-vfx-drops`, `illustrated-skill-vfx-icon-seeds`, Hero Kit sheets, and approved location/enemy cards.
- Reduced-motion alternatives are required for every cue.

## Verification

- `npm run arpg:presentation:check`
- `npm run type-check`
- `npm run verify`
