# Enemy/Boss High-Fidelity Cards Generation Record

Date: 2026-04-29

Batch id: `enemy-boss-hifi-cards`

Runtime output: `public/arpg/illustrated/enemy-boss-hifi-cards.png`

Source output: `assets/arpg/illustrated/generated-source/enemy-boss-hifi-cards.png`

Tool/model: GPT Image 2 / Codex image generation

Operator approval: approved for runtime normalization in this MW6V slice.

Rights posture: project-original prompt material, non-franchise, reviewed for Homefront/Aether Reliquary use.

Cost posture: optional generator-assisted lane, not a forced paid dependency.

Rejected-output notes: no flat vector glyph replacement was accepted for this batch; output must read as painted/rendered browser RPG card art.

## Prompt

Create a single high-fidelity illustrated 2D browser RPG enemy/boss contact sheet for the original game `Aether Reliquary`. Use the approved Hero Kit quality direction: painted/rendered material depth, warm ancient techno-fantasy, brass, ash, glass, nacre, stone, ember light, leather, cloth, and low-tech hand-weapon fantasy. Format as a 4 columns x 2 rows contact sheet, each cell a full-body enemy or boss card on a dark neutral card background, no text, no labels, no logos, no watermark, no UI mockup, no pixel art, no flat vector glyphs, no modern firearms, no sci-fi guns, no Warhammer, no Space Marine, no Titus, no franchise-derived armor silhouettes.

Frames:

1. Hollow Sentry: oath-forged empty armor with brass ribs, cracked ward shield, ember eye slit, reliquary guard posture.
2. Ashling Scout: wiry ash-cloaked raider with short blade, soot leather, ember scarf, fast ambusher pose.
3. Rune Husk: stone-and-root undead shell with glowing carved runes, broken civic robes, slow curse posture.
4. The Brass Warden: towering brass oath automaton mini-boss with heavy glaive, furnace chest, layered ceremonial armor.
5. Glass Gnawer: small jagged glass beast with prism teeth, lean crawling body, teal reflection highlights.
6. Ember Mote: floating cinder spirit with cracked coal shell, tiny ember wings, heat shimmer, mischievous danger.
7. Veyrhold Champion: oath-city shield duelist in heavy civic armor, banner cloth, hand weapon and buckler.
8. The Hollow Regent seed: regal empty crown silhouette, black-gold reliquary robes, fractured mask, void-lit chest scar.

## Normalization

- Source sheet dimensions: `1536x1024`.
- Runtime sheet dimensions: `2560x448`.
- Frame size: `320x448`.
- Frame count: `8`.
- Transformation: local `sharp` grid extraction from the 4x2 source sheet, normalized into one horizontal PNG strip with palette compression to stay below the 2MB illustrated asset budget.

## Runtime Uses

- `/hq` Adventure encounter art.
- `/hq` target/encounter context.
- `/hq` Journal combat codex rows.
- `/hq` Assets drawer illustrated bench preview grid.

## Guardrails

- Keep Phaser gameplay sprites as-is until approved sprite frames exist.
- This batch supersedes the older flat `enemy-cards.png` seed sheet for game-facing enemy cards.
- Do not use this output as proof of approved character, city, armor, accessory, or animation art; those stay separate batches.
