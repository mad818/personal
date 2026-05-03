# MW6W Production Menus + Codex Runtime

## Purpose

This slice completes the MW6W menu/codex layer for `Aether Reliquary` inside `/hq`. The Phaser playfield remains the game surface, while text-heavy RPG systems live in compact DOM drawers so the first viewport still reads as a game.

No `/game` route, cloud save, account system, multiplayer, or fake asset replacement is added. Real asset intake remains blocked until approved files exist locally.

## Runtime Surface

The `/hq` Production drawer now renders the validated 14-panel menu matrix from `lib/arpgProductionReadinessContent.json` as production launch cards. Each panel declares:

- drawer target
- test id
- empty state
- keyboard-safe posture
- reduced-motion rule
- runtime coverage

Launching a panel opens the real target drawer and shows an active menu context strip so the player can see which production menu is being used without losing the compact playfield-first layout.

The 14 production menu panels are:

- Start / Continue
- Character sheet
- Inventory grid
- Armory comparison
- Skill tree
- Quest journal
- Codex
- World map
- City map
- Reputation
- Companions
- Settings / controls
- Credits
- Save recovery

## Gameplay UI Coverage

- `Start / Continue` and `Save recovery` use the MW6X autosave/manual/checkpoint slot controls in the Room drawer.
- `Character sheet`, `Inventory grid`, `Armory comparison`, and `Skill tree` route to the existing Hero, Kit, Armory, and Skills drawers.
- `Quest journal` and `Codex` route to Journal, preserving enemy codex and story/log proof without expanding persistent HUD text.
- `World map` and `City map` route to Map and keep the 12-city / 48-sub-city content visible.
- `Reputation` and `Companions` route to People and preserve companion recruitment/perk visibility.
- `Credits` routes to Assets and keeps the real model preview blocked until approved packs are imported.
- `Settings / controls` includes the command-room fallback plus a compact tutorial/control panel for WASD, attacks, skills, dodge, interact, and playfield resizing.

## Validation

- `npm run arpg:production:check` now rejects menu panels missing drawer target, test id, empty state, keyboard-safe flag, or reduced-motion rule.
- `npm run arpg:release:check` requires E2E proof signals for all menu launchers, active menu context, production menu cards, and tutorial controls.
- `npm run hq:e2e` covers the launcher routing, compact drawer behavior, command input usability, save controls, and command-room fallback.

## Remaining Closure

MW6W is complete for the production menu/codex runtime. Later slices closed `MW6Y` content tooling and `MW6Z` balance/playtests; the MW6 parent remains open because `MW6U`, `MW6V`, and `MW6AA` still need asset pipeline closure, production art/audio/VFX, real asset intake, and final release gates.
