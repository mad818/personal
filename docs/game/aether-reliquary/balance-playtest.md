# MW6Z Balance And Playtest Foundation

`MW6Z-ARPG-BALANCE-PLAYTEST` turns balance from a release-readiness summary into a validated full-game contract for `Aether Reliquary`.

## Runtime Contract

- Canon data lives in `lib/arpgBalancePlaytestContent.json`.
- Typed access lives in `lib/arpgBalancePlaytestContent.ts`.
- Validation runs through `npm run arpg:balance:check`.
- `/hq` exposes the contract inside the Production drawer with `arpg-balance-playtest` proof chips.

## Coverage

- Session targets cover prologue onboarding, city arcs, sub-city arcs, travel routes, dungeons, boss attempts, and endgame trials.
- XP anchors cover level 1 through the level-50 cap with phase labels.
- Level bands cover the prologue, five acts, and postgame.
- Loot cadence covers normal enemies, elites, sub-city chests, city bosses, act bosses, the final boss, and relic trials.
- Boss timing covers The Brass Warden, city bosses, act bosses, the three Hollow Regent forms, and postgame world-boss pressure.
- Viability fixtures cover all eight classes and all eight lineages.
- Upgrade economy fixtures cover +1 through +5 with anti-grind intent.
- Browser budgets cover first interaction, drawer opening, combat input latency, FPS floor, small viewport playfield share, and reduced-motion flash posture.

## Playtest Matrix

The checklist validates player-facing acceptance for:

- The First Reliquary prologue.
- Act I through Act V.
- The Hollow Regent finale.
- Postgame relic trials.
- All 12 major city hubs.

Each checklist row requires at least three assertions so future playtest work does not become a vague smoke test.

## Closeout

This slice closes `MW6Z` only. `MW6U`, `MW6V`, `MW6AA`, and the MW6 parent remain open until production assets, real asset intake, final release E2E coverage, browser acceptance, and canon handoffs are complete.
