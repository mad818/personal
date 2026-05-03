# MW6 Production Readiness Foundation

This slice turns the remaining MW6 completion work into enforceable gates instead of only roadmap copy.

## Asset Intake

- Runtime assets may use `project-original`, `CC0-1.0`, clean `CC-BY-4.0`, or `commercial-license`.
- Commercial-license assets require a redacted proof record under `assets/arpg/intake/approved/` before manifest intake.
- Illustrated 2D is now the primary visual production lane. `npm run arpg:illustrated:generate` normalizes approved bench sheets before manifest validation.
- GPT Image 2 and Seedance 2.0 remain optional operator-approved tools only. Generated runtime art still needs prompt records, rights review, normalization, and `npm run arpg:assets:check`.
- Real 3D asset intake remains available as optional/reference material and stays blocked until official pack files are placed in the ignored intake folders and imported into `public/arpg/imported/`.

## Save Readiness

`lib/arpgSaveEnvelope.ts` defines `aether-reliquary-save-envelope-v1` around the existing v3 save payload. The `/hq` Room drawer exports the envelope and can import either the envelope or a legacy raw save, so old v3 and MW5-style saves can keep normalizing through the existing save path.

## Production Gate

`lib/arpgProductionReadinessContent.json` records the MW6U-AA production checks: accepted licenses, save envelope rules, content tooling fixtures, balance targets, 12-city playtest coverage, browser budgets, and release commands.

`npm run arpg:production:check` validates the umbrella readiness contract and is part of `npm run verify`.

The large-chunk closeout gates are now split out as well:

- `npm run arpg:save:check` validates save fixtures, slot kinds, migrations, recovery scenarios, and envelope source support.
- `npm run arpg:balance:check` validates the MW6Z balance/playtest registry: XP/session pacing, loot cadence, boss timing, potion pressure, class and lineage viability, upgrade economy, browser budgets, city playtests, and endgame anchors.
- `npm run arpg:release:check` validates release-flow coverage, required scripts, HQ E2E proof signals, and blocked/current completion posture.

## Acceptance

- `/hq` Production drawer shows license, menu, save, migration, city, balance, and release-gate readiness.
- `/hq` Assets drawer shows the illustrated 2D bench plus the real-model preview as blocked until a real imported model exists; no placeholder model is substituted.
- `MW6U/V-GENERATOR-ASSISTED-GAME-ART` is closed as an optional policy/tooling lane, not as a forced paid-art dependency.
- `MW6W`, `MW6X`, `MW6Y`, and `MW6Z` are closed by their verified runtime slices. `MW6U`, `MW6V`, `MW6AA`, and the MW6 parent remain open until production assets, real imported previews, and final release-grade acceptance are proven.
