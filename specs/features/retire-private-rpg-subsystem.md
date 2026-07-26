# Retire Private RPG Subsystem

## Problem

Nexus Prime still contains a complete private browser-RPG subsystem inside the
main intelligence product. It owns an `/hq` mode, persisted game state, more
than two hundred runtime/content/asset files, dedicated verification commands,
generated desktop copies, and current planning language. The user has now
explicitly asked to remove RPG/game-related material.

Keeping that subsystem in the active tree increases install size, verification
time, state complexity, and product-identity ambiguity without advancing the
Nexus intelligence mission.

## Scope

- Retire the Aether Reliquary/private ARPG mode from the HQ console.
- Remove game-only Zustand state, settings, actions, migrations, and persistence.
- Delete dedicated game components, libraries, assets, generated desktop
  copies, current game docs/specs, generation/import scripts, and validators.
- Remove game-only package commands and canonical-verifier stages.
- Remove current source-intelligence, planning, and handoff references that
  present the game as active or pending work.
- Remove special non-game toolchain exclusions that existed only to tolerate the
  private subsystem.
- Add a deterministic retirement check for active game paths, package commands,
  imports, persisted state, and current handoff positioning.

## Historical boundary

Old completed feature specs, prior plans, shipped-history prose, and repository
hygiene reports may continue to mention the retired subsystem as historical
evidence. Git history remains the recovery path. They must not import, execute,
publish, or schedule game code.

Generic simulations, maps, visualization tools, and intelligence workflows are
not games merely because they use graphics or scenario modeling; they remain in
scope for Nexus.

## Safety

- Preserve unrelated uncommitted design work.
- Do not touch phone/PWA implementation.
- Do not move private game content into another tracked directory.
- Do not retain a hidden runtime, downloadable bundle, or active archive.
- Do not broaden removal to generic Nexus visualization or simulation features.

## Acceptance

- No tracked active path remains under `components/home/arpg/`, `lib/arpg*`,
  `assets/arpg/`, `public/arpg/`, `desktop/frontend-dist/public/arpg/`,
  `docs/game/aether-reliquary/`, or dedicated ARPG script/spec paths.
- HQ exposes only intelligence-product modes.
- Zustand has no RPG state, action, migration, or persistence key.
- `package.json` has no game command and canonical verification no longer runs a
  game gate.
- Current handoff, active queue, source-intelligence, and product-planning
  surfaces do not present RPG work as active.
- The retirement validator, TypeScript, lint, formatting, reachability, handoff,
  and canonical verification pass.
