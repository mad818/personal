# MW4 PixiJS + GSAP ARPG Game UI/VFX Lab

## Objective

Make `Aether Reliquary` feel more like a browser game without replacing the current React Three Fiber room. MW4 adds a non-intercepting 2D VFX overlay below the DOM HUD for loot, equip, hit, objective, oracle, and ambient cues while preserving `/hq`, the command input, the command-room fallback, and local-first save state.

## Implementation Boundary

- The R3F reliquary remains the primary playfield.
- The VFX layer is decorative only and always uses `pointer-events: none`.
- HUD text, drawers, credits, controls, and command-room fallback remain normal DOM for accessibility.
- Reduced-motion mode disables or compresses nonessential motion.
- No `/game` route, auth flow, API route, or asset-ledger bypass is added.

## Runtime Shape

- `lib/arpgVfx.ts` derives the current effect kind from `arpgSave.lastEvent`, active agent posture, runtime status, and reduced-motion policy.
- `components/home/arpg/pixi/ArpgPixiStage.tsx` mounts a Pixi-ready stage above the R3F canvas and below the HUD.
- `components/home/arpg/pixi/arpgOptionalMotion.ts` centralizes optional GSAP/Pixi loading and reduced-motion duration helpers.
- `components/home/arpg/ArpgHud.tsx` keeps DOM controls but uses optional GSAP timelines when available.

## Dependency Note

The intended production dependency set is `pixi.js`, `@pixi/react`, `gsap`, and `@gsap/react`. In the current Codex sandbox, `npm install pixi.js @pixi/react gsap @gsap/react --save` fails because registry fetches are blocked with `EACCES`, so the implementation ships the contract, overlay mount point, reduced-motion behavior, Web Animations DOM fallback, and Canvas VFX fallback until the operator can install and bundle the packages in a network-enabled shell.

## HTML-In-Canvas Note

HTML-in-Canvas is a useful future direction for richer game UI composition, but it is not a production dependency for Nexus yet. The WICG proposal remains experimental and browser-flag dependent, so MW4 keeps all readable UI, credits, settings, inventory, and command controls in accessible DOM.

## Acceptance

- `/hq` shows the ARPG room with an `arpg-pixi-stage` overlay and compact DOM HUD.
- The overlay reacts to loot, equip, hit, objective, oracle, and ambient save-state transitions.
- The overlay never blocks command input or drawer interactions.
- Reduced-motion browser settings mark the VFX layer calm through `data-reduced-motion="true"`.
- Resources marks the active massive-win lane as `PixiJS + GSAP game-feel lab`.
