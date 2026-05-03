# MW6W/X Menu + Save Runtime

## Purpose

This slice moves MW6W/X from readiness-only posture into visible runtime behavior inside `/hq`, then completes the MW6X save-action portion.

The game still stays local-first and embedded in the HQ shell. No `/game` route, cloud save, account system, multiplayer, or unverified asset path is added.

## Runtime Surface

The `/hq` Production drawer now exposes the full 14-panel game menu index as launcher buttons instead of only preview chips. This keeps the complete RPG UI target visible in the game surface and routes each item to the closest existing drawer:

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

The Room drawer now shows a compact `Start / Continue` save-slot control plane for autosave, manual save, and checkpoint recovery before the export/import controls. Continue loads the active local slot, manual and checkpoint saves create real persisted slot records, each slot row can be loaded, export emits an `aether-reliquary-save-envelope-v1` envelope with all three local slot kinds represented, and reset requires a second confirmation click.

## Save Contract

`lib/arpgSaveEnvelope.ts` now owns:

- `createArpgSaveSlot`
- `createArpgSaveSlotSet`
- `normalizeArpgSaveSlots`
- `syncArpgAutosaveSlot`
- `upsertArpgSaveSlot`
- `getArpgSaveSlotSummary`
- `createArpgSaveEnvelope`
- `normalizeArpgSaveImport`

The live envelope remains backward compatible with raw save imports and older envelope imports, while making the MW6X recovery model visible in runtime UI. Slot metadata stays outside `ArpgSaveState`, so the active save remains version `3`.

## Store Actions

`store/useStore.ts` now persists:

- `arpgSaveSlots`
- `arpgActiveSaveSlotId`
- `saveArpgManualSlot`
- `saveArpgCheckpointSlot`
- `loadArpgSaveSlot`
- `confirmResetArpgSave`

Older persisted state that only contains `arpgSave` normalizes into an autosave/manual/checkpoint slot set without dropping character identity, inventory, quests, combat, journey, endgame, or world flags.

## Validation

- `npm run arpg:save:check` now requires the live save-envelope module, persisted store actions, corrupted-import handling signals, and reset confirmation UI.
- `npm run arpg:release:check` now requires HQ E2E proof signals for menu launcher buttons and save-slot actions.
- `npm run hq:e2e` covers the 14-panel menu launcher, autosave/manual/checkpoint summary, manual save, slot load, checkpoint save, three-slot export envelope, raw and envelope import normalization, corrupted JSON blocking, reset confirmation, command input usability, and command-room fallback.

## Follow-On Closure

MW6X is closed for the current local-first save-action scope. MW6W is now completed by `docs/game/aether-reliquary/mw6w-production-menus-codex.md`, which promotes this launcher into validated production menu cards with active menu context, compact tutorial controls, codex/map/people routing, and release-gate E2E coverage.
