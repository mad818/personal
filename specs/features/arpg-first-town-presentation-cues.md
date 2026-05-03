# ARPG First-Town Presentation Cues

## Goal
Make the current Bellroot -> Veyrhold slice feel more production-ready without waiting on deployment, drone hardware, or approved external asset packs.

## Scope
- Add a small typed presentation registry for Bellroot, Veyrhold, Oathmarket, Warden's Steps, and Bellroot Commons.
- Include ambient copy, VFX intent, audio intent, reduced-motion alternatives, and approved existing runtime art references.
- Surface the registry in existing `/hq` drawers: Adventure, Map, and Production.
- Add validation so cues cannot point at rejected/reference-only art or untracked runtime sheets.

## Out Of Scope
- No new route.
- No paid dependency.
- No external asset import.
- No promotion of rejected prologue SVG/glyph sheets.
- No final audio engine or browser autoplay work.

## Verification
- `npm run arpg:presentation:check`
- `npm run type-check`
- `npm run verify`
