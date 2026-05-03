# MW6-AA Large-Chunk Readiness Foundation

## Purpose

This slice turns the remaining MW6 completion work into dedicated, repeatable gates instead of one umbrella readiness check.

`MW6V-REAL-ASSET-INTAKE` stays blocked until approved real packs exist locally. This readiness slice moves the rest of the program forward by proving save fixtures, balance fixtures, menu coverage, content tooling, and release coverage can be checked without fake art or a new route.

## Shipped Gates

- `npm run arpg:save:check` validates the save envelope contract, MW5 v2 fixture, raw MW6 v3 fixture, envelope v1 fixture, three slot kinds, recovery scenarios, and intentionally corrupted JSON fixture.
- `npm run arpg:balance:check` validates XP/session pacing, loot cadence, boss timing, potion pressure, class and lineage viability, +1 through +5 upgrade economy, browser budgets, 12-city playtest coverage, and endgame balance anchors.
- `npm run arpg:release:check` validates required scripts, release-flow coverage, browser routes, existing HQ E2E proof signals, MW6U-AA completion tracking, and the honest blocked state for real asset intake.

## Runtime Surface

The `/hq` Production drawer now shows:

- 14 required game menu panels.
- Four save fixture paths.
- Eight balance fixture suites plus the MW6Z balance/playtest registry.
- 19 release-flow targets.
- The new dedicated script gates: `arpg:save:check`, `arpg:balance:check`, and `arpg:release:check`.

The production drawer remains compact so the playfield/card game surface stays dominant.

## Runtime Follow-Through

The MW6W/X runtime bridge now consumes the readiness contract directly:

- The Production drawer renders the full 14-panel menu index instead of a five-panel preview.
- The Room drawer renders autosave, manual save, and checkpoint summaries before save export/import.
- `createArpgSaveEnvelope` exports all three local slot kinds.
- `arpg:save:check`, `arpg:release:check`, and `hq:e2e` verify the live slot/menu proof signals.

## Save Fixtures

The fixture set lives under `docs/game/aether-reliquary/save-fixtures/`:

- `legacy-mw5-v2-save.json` proves older MW5-style saves remain represented.
- `raw-mw6-v3-save.json` proves the current v3 shape carries character, journey, crafting, endgame, and combat state.
- `envelope-v1-save.json` proves autosave, manual, and checkpoint slots can be represented together.
- `corrupted-save.txt` proves corrupted JSON remains an explicit blocked/recovery scenario.

## Remaining Closure

This readiness foundation did not close `MW6W`, `MW6X`, `MW6Y`, `MW6Z`, or `MW6AA` by itself. Follow-up slices now close `MW6W`, `MW6X`, `MW6Y`, and `MW6Z` through runtime menu, save, content-tooling, and balance/playtest proof. `MW6AA` remains open for final release-grade E2E and browser acceptance.
