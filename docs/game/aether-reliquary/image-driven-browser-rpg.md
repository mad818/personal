# Aether Reliquary Image-Driven Browser RPG Shell

## Intent

`Aether Reliquary` should feel closer to a classic browser RPG: the player can click scene cards, choose routes, fight enemies, claim loot, and accept story beats without needing the whole experience to depend on full 3D movement.

The Phaser canvas remains useful for movement, collision, combat proof, and future animation work, but the primary interaction language can now be image-led: illustrated cards, inventory icons, map choices, enemy encounter panels, and compact drawers.

## MW6W Slice

- The first viewport shows a compact `Click RPG` scene deck over `/hq`.
- The `Adventure` drawer exposes four browser-RPG card lanes: world travel, encounter, loot, and story.
- Travel cards reuse the validated world-loop route-event registry.
- Encounter cards reuse deterministic combat, enemy target state, statuses, codex, and rewards.
- Loot cards reuse item icons, inventory state, and equipment progression.
- Story cards reuse city storyline and sub-city quest registries.
- The HQ playfield supports explicit `S / M / L / XL` game-window presets for constrained browser panes. The selected size persists in settings, drives the existing HQ split height when possible, and always resizes the actual playable frame inside the shell.
- The ARPG HUD runs in compact density by default: objective, loadout, combat, prompt, AI indicators, drawer nav, and drawer body chrome should stay small enough that the game remains the visual priority.

## Asset Direction

- Final art should be real project-owned, CC0, or properly attributed CC-BY art, never ripped/franchise-derived work.
- The shell is ready for high-quality character, armor, weapon, city, enemy, and item images once the asset intake lane has approved files.
- Until real assets are imported, CSS scene cards and existing validated icon sheets are allowed as interface structure, not final art claims.

## Product Guardrails

- Keep the game embedded in `/hq`; do not add `/game` in this slice.
- Keep the HQ command input, auth behavior, route names, local-first saves, reduced-motion behavior, and command-room fallback intact.
- Keep heavy text inside drawers. The first viewport should read as a game surface with clickable choices.
- Keep resize controls visible beside the ARPG/Command-room toggle. The old drag splitter remains supported, but the game should not require hidden gestures to fit inside the Codex in-app browser.
- Phaser scenes stay thin; simulation/rules remain in `lib/`.
