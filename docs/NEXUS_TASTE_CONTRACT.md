# Nexus Taste Contract

This file translates upstream taste-oriented design guidance into a Nexus-native contract.

It is a reference for shell, route, and interaction work. It is not a runtime dependency and it does not replace `docs/STANDARDS.md`.

## Translation Profile

- `DESIGN_VARIANCE`: `7`
- `MOTION_INTENSITY`: `6`
- `VISUAL_DENSITY`: `7`

## Plugin References

- Canva concept board view: `https://www.canva.com/d/FZ3EWE2EOWssOoF`
- Canva concept board edit: `https://www.canva.com/d/IAVbi_asV5rgiY8`
- Repo-native implementation rules: `docs/NEXUS_FIGMA_IMPLEMENTATION_RULES.md`

## Core Rules

1. One dominant visual idea per route.
2. Keep first-view compositions cardless or near-cardless.
3. Let the workplane lead before support chrome or telemetry.
4. Use typography, spacing, and image/plate hierarchy before decorative effects.
5. Motion must explain hierarchy, interaction, or live state change.
6. Trust posture must feel like command instrumentation, not bolt-on admin UI.

## Nexus-Specific Interpretation

- HQ remains a 3D flagship surface, but the chronicle/composer stays primary.
- COMMAND, INTEL, ALPHA, CYBER, RECON, VAULT, RESOURCES, SECURITY, SKILLS, and VEHICLE all share one cinematic command-room family.
- Route differences come from plates, overlays, scan geometry, and accent bias, not from separate design systems.
- The shell now resolves through obsidian, graphite, smoked glass, liquid chrome, electric cyan, and restrained amber alerts instead of older brass-heavy residue.
- Typography should read as compressed display plus disciplined operator text.
- Trust chrome should read like instrument status: summary first, detail on demand.

## Material and Motion Rules

- Backgrounds stay near-black or graphite, never navy-brass by default.
- The primary accent is electric cyan / ice blue.
- Amber is reserved for readiness, warnings, and escalation.
- Borders stay thin, cool, and contour-like instead of embossed.
- Workplanes should feel paneled into the room, not stacked as cards.
- Motion should follow one sequence: environment fade, route plate lock-in, workplane reveal, support rail arrival, continuity pulse.
- Scene sweeps and hover response should feel deliberate and cinematic, not busy or game-like.

## Motion Decision Gate

Before adding motion, decide its frequency, purpose, input mode, surface, and exact animated property. Constant or frequent keyboard actions remain immediate. Decorative movement cannot compete with data, and rare delight belongs outside operational workplanes.

- Immediate feedback targets 160ms or less; other frequent motion targets 180ms or less.
- Occasional state or spatial transitions target 300ms or less.
- Only rare overlay transitions may extend to 500ms.
- Animate named properties such as `opacity`, `transform`, or `width`; never use `transition-all` or a broad `transition: var(--t)`.
- Prefer transform and opacity when they express the change, and preserve the global `prefers-reduced-motion` fallback.
- Frequent keyboard operations, decorative data motion, and repeated explanatory sequences fail the gate.

## Anti-Patterns

- Reintroducing boxed dashboard mosaics as the first impression
- Letting support rails compete with the main workplane
- Decorative motion that is louder than the workspace
- Treating trust posture as a separate security dashboard
- Using upstream design prompts or skills verbatim without translating them into Nexus-specific behavior
