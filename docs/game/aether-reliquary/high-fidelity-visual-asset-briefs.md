# MW6V High-Fidelity Visual Asset Briefs

This doc records the next production art briefs for `Aether Reliquary`.

The machine-readable source is `lib/arpgVisualAssetBriefs.json`, validated by `npm run arpg:visual-briefs:check`.

## Direction

Use the approved Hero Kit character, outfit, weapon, and armor quality as the baseline:

- High-fidelity illustrated 2D browser RPG art.
- Painted or rendered material depth.
- Readable silhouettes at card and icon scale.
- Warm ancient techno-fantasy materials.
- No flat vector glyphs, dashboard icons, minimal symbolic cards, text, logos, or franchise-derived cues.

## Brief Packs

| Pack | Count | Target |
| --- | ---: | --- |
| Enemy and boss high-fidelity cards | 8 | First-zone enemies, Brass Warden, city champion, Hollow Regent seed |
| Bellroot prologue high-fidelity story pack | 10 | Bellroot locations, Ilo, Keeper Elian, and story props |
| Weapon quality variant cards | 14 | Common through mythic weapon/material identity and quality frames |
| City and region high-fidelity cards | 12 | The 12 major cities |

## Production Flow

1. Use a brief item prompt from `lib/arpgVisualAssetBriefs.json`.
2. Generate or source the image through an operator-approved path.
3. Review against the Hero Kit quality target.
4. Reject anything that looks like flat UI/glyph art.
5. Normalize approved outputs into `public/arpg/illustrated/`.
6. Add a prompt/provenance record under `docs/game/aether-reliquary/generation-records/`.
7. Add manifest records in `lib/arpgAssetManifestData.json`.
8. Run `npm run arpg:visual-briefs:check`, `npm run arpg:assets:check`, and `npm run verify`.

## Next Recommended Batch

`enemy-boss-hifi-cards` has been promoted into runtime production art.

Reason: enemies and bosses will make the live game feel less like a UI prototype fastest. The first eight prompts cover Hollow Sentry, Ashling Scout, Rune Husk, The Brass Warden, Glass Gnawer, Ember Mote, a Veyrhold Champion, and a Hollow Regent seed.

Next start with `prologue-hifi-story-pack` so Bellroot location, NPC, and story-prop art replaces the rejected flat glyph/vector sheets.
