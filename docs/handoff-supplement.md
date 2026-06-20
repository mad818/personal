<!-- Compact companion to the generated Codex handoff. Keep this short. -->

**Codex operating spine**

- `AGENTS.md` — session startup rules and repo-specific coding constraints.
- `docs/SYSTEM_STATE.md` — current shipped state, active architecture, and known blockers.
- `tasks/todo.md` — active queue; use `## Next Up` as the work selector.
- `tasks/lessons.md` — corrections and rules from past sessions.

**Operator workflow (2026-06-20)**

- Codex and Cursor are **interchangeable** on the main PC — run `npm run handoff:pull`, read `## Next Up`, ship one slice, `npm run verify`, `handoff:write` when the queue changes.
- **Out of scope unless Mario explicitly raises priority:** phone/LAN/PWA acceptance, private RPG (`/hq`, all `MW6*` / `lib/arpg*`), and staged-host release proof (FD2 / CP2.1).
- **Shipped (2026-06-20):** Feynman source parity complete; RECON Blackbird/WhatsMyName; CP2 local gates; **master improvement plan** (`master:platform:check`, GA surface hardening specs, RECON casefile seed, Feynman HQ tool rail, RAG entity boost, Tauri MSI + checksums).
- **Active queue:** `DEPENDABOT-SECURITY-AUDIT` (GitHub dismiss) → `CP2.4-LIVE-LAUNCH-GATE` → `CP2.3-SIGNING`.
- **Deferred:** phone, local-AI acceptance, and RPG sections at the bottom of `tasks/todo.md`.

**Private RPG lane**

- `Aether Reliquary` is a personal/private RPG world currently housed inside `/hq`; do not frame it as public Nexus Prime positioning.
- Keep landing, README, and product-shell copy focused on Homefront/Nexus command intelligence, local memory, protected tools, and route proof.
- The RPG world is expected to move into its own separate thing later, so keep boundaries clean and avoid tying public product identity to it.
- MW5 shipped the Phaser RPG replacement foundation; MW6 now has the Bible-first spine, MW6F-H playable character foundation, MW6I-L/V first-zone combat art, MW6I-S systems/world loop foundation, MW6T dungeons/endgame foundation, an MW6V real-asset intake bridge, an MW6W image-driven browser-RPG shell, and a completion control plane for MW6U-AA closure.
- Keep `/hq` route-stable, preserve the command input, and keep the game local-first.

**Game production anchors**

- `docs/game/aether-reliquary/README.md` — MW6 production spine, canon docs, and validation gates.
- `lib/arpgProductionContent.json` and `lib/arpgProductionContent.ts` — typed 12-city, 48-sub-city production registry.
- `lib/arpgCharacterContent.json`, `lib/arpgCharacterContent.ts`, and `docs/game/aether-reliquary/character-foundation.md` — playable lineages, class trees, subclasses, palettes, starter skills, and v3 character identity rules.
- `lib/arpgCombatContent.ts` and `docs/game/aether-reliquary/combat-art-foundation.md` — first-zone combat profiles, damage/status rules, generated sprite/icon sheets, HUD/codex proof, and validation gates.
- `lib/arpgEnemyTaxonomyContent.*`, `lib/arpgArmoryEconomyContent.*`, `lib/arpgWorldLoopContent.*`, and `docs/game/aether-reliquary/mw6-i-s-systems-world-foundation.md` — MW6I-S enemy, armory/economy, quest/faction/companion/NPC, and travel-event systems.
- `lib/arpgEndgameContent.*` and `docs/game/aether-reliquary/mw6-t-dungeons-endgame.md` — MW6T repeatable dungeons, relic trials, boss rematches, treasure maps, arena challenges, collection goals, cosmetics, and postgame state.
- `docs/game/aether-reliquary/image-driven-browser-rpg.md` and `components/home/arpg/ArpgHud.tsx` — MW6W click-to-travel/fight/loot/story card shell and compact Adventure drawer.
- `lib/arpgCompletionContent.*` and `docs/game/aether-reliquary/mw6-full-game-completion.md` — MW6 parent completion registry, `/hq` Production drawer, save export/import recovery proof, and remaining MW6U-AA gate tracking.
- `lib/arpgAssetCandidateSources.json`, `lib/arpgAssetIntake.ts`, `scripts/import-arpg-real-assets.mjs`, and `docs/game/aether-reliquary/real-asset-acquisition.md` — MW6V real 3D asset candidate queue, import bridge, and blocked-until-pack-placement proof lane.
- `docs/superpowers/plans/2026-04-25-arpg-phaser-rpg-replacement.md` — MW5 outcome and proof.
- `docs/assets/arpg-asset-ledger.md` — asset provenance and CC0/CC-BY intake rules.
- `lib/arpgGame.ts` and `lib/arpgGameContent.ts` — save contract, systems, and authored content.

**Handoff rule**

- Run `npm run handoff:write` after task/docs state changes.
- Run `npm run handoff:check` before calling handoff docs synced.
- Do not expand Claude/Cursor mirrors unless Mario explicitly asks; this repo is Codex-first now.
