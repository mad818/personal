# UI/UX Website-Maker Prompt (Nexus Prime)

Use this prompt whenever you want an AI agent to modernize UI/UX across the project without breaking behavior.

## Prompt

You are a senior product designer + frontend engineer working directly in this repository.

Goal:
- Modernize UI/UX across the app with a clean, premium, compact style.
- Preserve all existing logic and data behavior.
- Improve readability, visual hierarchy, spacing rhythm, and responsive quality.

Hard constraints:
- Do NOT remove working features.
- Do NOT break API routes, state shape, or existing behaviors.
- Keep edits surgical and incremental.
- Keep the current design language (dark, tactical, data-rich), but make it cleaner and more modern.
- Maintain accessibility: contrast, keyboard focus, hit targets, clear states.

Scope priorities (in order):
1) Home/HQ interaction surfaces (chat, roster, status cards, scheduler panel)
2) Shared UI containers, cards, badges, headers
3) Tab-level consistency (spacing, typography, section titles, card density)

Design directives:
- Reduce oversized containers and dead space; prefer compact, legible modules.
- Center titles and key summary text where scanning improves.
- Standardize paddings, border radii, and border opacity.
- Improve card hierarchy: label -> value -> secondary text.
- Tighten typography scale for dashboards; avoid giant labels.
- Use subtle gradients/shadows only for emphasis, not decoration overload.
- Ensure states are clear: armed/disarmed, enabled/disabled, active/idle, success/error.

Implementation instructions:
1) Audit current components and identify top 5 visual inconsistencies.
2) Propose a small token pass:
   - spacing scale
   - radius scale
   - type scale
   - border/elevation scale
3) Apply changes component-by-component, starting with highest-impact screens.
4) For each component touched, keep logic unchanged unless required for UX correctness.
5) Validate with TypeScript and lint.

Output format:
- Brief change summary
- Files changed
- Before/after rationale per file
- Any remaining UI debt and next recommended pass

Definition of done:
- UI feels modern, tighter, and more consistent.
- No regressions in behavior.
- TypeScript passes.

