# Arsenal Visual Itemization Generation Record

## Batch

- Slice: `MW6V/W-ARPG-ARSENAL-VISUAL-ITEMIZATION`
- Asset lane: illustrated 2D asset bench
- Source mode: project-original seed art
- Runtime outputs:
  - `public/arpg/illustrated/arsenal-weapon-icons.png`
  - `public/arpg/illustrated/arsenal-quality-overlays.png`
  - `public/arpg/illustrated/arsenal-named-weapon-cards.png`
  - `public/arpg/illustrated/arsenal-vfx-drops.png`

## Prompt And Provenance

No paid AI, marketplace preview, external pack, ripped file, or franchise-derived source was used for this batch. The source sheets are project-original SVG art committed under `assets/arpg/illustrated/source/` and normalized locally with `npm run arpg:illustrated:generate`.

The design prompt used for the hand-authored source was:

```text
Aether Reliquary illustrated 2D RPG arsenal assets, low-tech hand weaponry, warm brass and ember lighting, ancient techno-fantasy, centered readable inventory objects, base weapon art plus quality overlays, no text, no logos, no firearms, no modern sci-fi, no franchise-derived silhouettes, no marketplace previews.
```

## Review Notes

- Operator approval posture: approved by the implementation request to build the arsenal visual itemization slice.
- Rights posture: project-original, operator-verified commercial-use.
- Cost posture: free-tier-or-existing-access; no forced paid dependency.
- Rejected-output notes: none. This batch avoids raw generated outputs entirely.
- Normalization: fixed 96px weapon/quality frames, 256x384 named weapon cards, and 128px VFX frames.
- Reduced-motion posture: the VFX registry includes low-flash or calm fallback frames for drop and upgrade cues.

## Final Manifest Entries

- `arsenal-weapon-family-icons`
- `arsenal-quality-overlays`
- `arsenal-named-weapon-cards`
- `arsenal-vfx-drops`
