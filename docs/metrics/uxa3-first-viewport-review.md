# UXA3 First-Viewport Authenticated Review

Date: 2026-04-24

Runtime: `http://127.0.0.1:3100`

Auth path: Playwright seeded the protected shell with the already-configured local `NEXUS_TOKEN`; no token value was read, printed, copied, or typed by the agent.

In-app browser status: the visible tab at `http://127.0.0.1:3100/resources` was still on the protected token gate, so no manual token entry was attempted there. Authenticated route acceptance was completed through the repo's existing local Playwright seed helper.

## Acceptance Summary

`tests/e2e/uxa3-first-viewport.spec.ts` now guards the UXA3 target routes at `1440x900` and `1366x768`. Each target must load authenticated, expose its primary workplane, start that workplane in the first viewport, and show at least `80px` of meaningful workplane content.

Measured result after the UXA3 authenticated compaction pass: pass.

## Route Measurements

| Route request | Final path | Viewport | Primary top | Visible px | Result |
| --- | --- | ---: | ---: | ---: | --- |
| `/hq?focus=hq-chronicle` | `/hq?focus=hq-chronicle` | `1440x900` | `548` | `166` | Pass |
| `/command` | `/command?focus=runtime-efficiency` | `1440x900` | `498` | `308` | Pass |
| `/security` | `/labs/security` | `1440x900` | `582` | `267` | Pass |
| `/vault` | `/vault?focus=vault-memory-spine` | `1440x900` | `585` | `210` | Pass |
| `/resources` | `/resources` | `1440x900` | `604` | `296` | Pass |
| `/hq?focus=hq-chronicle` | `/hq?focus=hq-chronicle` | `1366x768` | `573` | `166` | Pass |
| `/command` | `/command?focus=runtime-efficiency` | `1366x768` | `504` | `264` | Pass |
| `/security` | `/labs/security` | `1366x768` | `581` | `187` | Pass |
| `/vault` | `/vault?focus=vault-memory-spine` | `1366x768` | `584` | `184` | Pass |
| `/resources` | `/resources` | `1366x768` | `603` | `165` | Pass |

## Measured Design Fixes

- Added a short-viewport Homefront shell compaction rule for authenticated desktop/laptop heights up to `920px`: one-row primary tabs, slimmer trust/action chrome, smaller compact route plates, tighter mission strips, and preserved route identity.
- Kept `VAULT` exact-memory behavior intact while preventing broad archive state from keeping the memory rail expanded after returning to `/vault` without a focus.
- Updated the public landing auth E2E copy to expect the current `Launch Homefront` CTA.

## Verification Recorded

- `npm run build`: pass after stopping the managed runtime and rebuilding the production bundle.
- `npm run auth:e2e`: pass with the new UXA3 guard included (`17 passed`, `3 skipped`).
