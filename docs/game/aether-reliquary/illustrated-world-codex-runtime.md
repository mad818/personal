# MW6V Illustrated World And Codex Runtime

`MW6V-ILLUSTRATED-WORLD-CODEX-RUNTIME` continues the high-quality illustrated 2D path for `Aether Reliquary` without waiting on external 3D packs.

## Runtime Use

| Surface | Runtime art promoted |
| --- | --- |
| Hotbar | Equipped active skills now show approved skill/VFX icons. |
| Skills drawer | Skill rows use illustrated VFX icons before the action text. |
| Map drawer | The selected region and city storyline rows now use illustrated location cards. |
| Journal / Codex | Combat codex rows now pair enemy lore with illustrated enemy cards. |
| People drawer | Recruitable companion rows now include character portrait seed art. |

## Guardrails

- No new external art, paid AI dependency, or unverified download was added.
- Real 3D/pack intake remains blocked until approved local assets exist under the intake folders.
- The seed sheets are already manifest-tracked through the illustrated asset bench and remain gated by `npm run arpg:assets:check`.
- Phaser remains the playfield renderer; DOM drawers carry text-heavy and accessibility-heavy UI.

## Acceptance

- The first playable view and main drawers read more like a browser RPG because actions, map regions, enemies, and companions have visual identity.
- The implementation keeps the playfield dominant and avoids expanding permanent HUD chrome.
- `/hq`, command input, local-first saves, reduced-motion behavior, route stability, and no-`/game` posture remain unchanged.

## Verification

- Passed: `npm run arpg:content:check`, `npm run arpg:asset-candidates:check`, `npm run arpg:assets:check`, `npm run arpg:production:check`, `npm run arpg:save:check`, `npm run arpg:balance:check`, `npm run arpg:release:check`, `npm run type-check`, `npm run build`, `npm run hq:e2e`, `npm run route:e2e`, `npm run tabs:e2e`, and `npm run verify`.
- Note: the first `hq:e2e` attempt reused a stale managed `3100` runtime and passed after `npm run runtime:stop:3100` let Playwright boot a fresh server.
