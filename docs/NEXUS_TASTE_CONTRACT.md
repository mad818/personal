# Nexus Taste Contract

This file translates upstream taste-oriented design guidance into a Nexus-native contract.

It is a reference for shell, route, and interaction work. It is not a runtime dependency and it does not replace `docs/STANDARDS.md`.

## Translation Profile

- `DESIGN_VARIANCE`: `7`
- `MOTION_INTENSITY`: `6`
- `VISUAL_DENSITY`: `4`

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
7. Proportion before chrome: panels expand with the viewport; center the shell column.
8. Phone is single-focus: one primary panel full-width; secondary modules stack below.
9. Aurora materials: deep obsidian + ice cyan edge light; slim top rail; snappy enters.

## Nexus-Specific Interpretation

- Homefront Aurora is the active shell grammar.
- HQ remains flagship; chronicle/composer stays primary.
- All GA routes share one command-room family with ice-cyan instrumentation.
- Typography: clear display scale + disciplined operator text.
- Motion sequence: environment → plate → workplane → rail → continuity.
- Ambient loops stay quiet; interaction feedback stays immediate (≤160ms).

## Motion Decision Gate

Before adding motion, decide its frequency, purpose, input mode, surface, and exact animated property. Constant or frequent keyboard actions remain immediate. Decorative movement cannot compete with data, and rare delight belongs outside operational workplanes.

- Immediate feedback targets 160ms or less; other frequent motion targets 180ms or less.
- Occasional state or spatial transitions target 300ms or less.
- Only rare overlay transitions may extend to 500ms.
- Animate named properties such as `opacity`, `transform`, or `width`; never use `transition-all` or a broad `transition: var(--t)`.
- Prefer transform and opacity when they express the change, and preserve the global `prefers-reduced-motion` fallback.
- Frequent keyboard operations, decorative data motion, and repeated explanatory sequences fail the gate.

## Anti-Patterns

- Equal-weight card mosaics as the first impression
- Tall multi-band top headers competing with the workplane
- Decorative motion louder than data
- Fixed mini-tiles leaving empty margins on wide desktops
- Phone layouts that only shrink the desktop mosaic
- Letting support rails compete with the main workplane
- Treating trust posture as a separate security dashboard
