# Whole-App Interactive Control Names

## One-sentence contract

Give every active symbol-only or title-only button/link outside the private RPG lane a stable programmatic name, and reject future definite regressions through the existing shell accessibility check.

## Surface and scope

- React App Router surfaces under `app/` and `components/`.
- Native `button` and `a` elements, Next.js `Link`, and literal `role="button"` controls.
- Excludes `components/home/arpg/` to preserve the private RPG lane boundary.
- Covers definite source-level failures: controls whose only static descendant text is punctuation, emoji, or symbols, and controls relying on `title` alone.
- Does not reject controls whose accessible text is data-driven or state-driven and therefore cannot be proven empty statically.

## Visual, content, and interaction thesis

- **Visual:** zero visible redesign; preserve every icon, glyph, layout, token, focus ring, and animation.
- **Content:** add concise action-oriented accessible names that identify the target or current toggle action where context is available.
- **Interaction:** preserve handlers, focus order, pointer/keyboard behavior, disabled states, navigation, submission, and persistence.

## Data and state

- No API, provider, store, persistence, or new runtime state.
- Dynamic labels may reuse existing local state only to distinguish actions such as save/remove bookmark or start/stop recording.

## Implementation

1. Remediate every confirmed symbol-only or title-only active control with a non-empty `aria-label` or existing visible text where appropriate.
2. Add a TypeScript-AST validator with a negative self-test, exact file/line diagnostics, recursive `app/` and `components/` coverage, and the private RPG exclusion.
3. Chain the validator into `npm run shell:accessibility:check` so it runs under the normal surface-polish and full verification lanes.

## Acceptance criteria

- All confirmed active symbol-only/title-only controls have stable programmatic names.
- No visible copy, styling, layout, event handler, route, or state behavior changes.
- The validator fails on symbol-only and title-only fixture controls, passes explicit ARIA and meaningful text controls, and reports exact source locations.
- `npm run shell:accessibility:check`, `npx tsc --noEmit`, targeted lint, `npm run verify`, `npm run build`, and `git diff --check` pass.

## Benefits

- Screen readers and voice-control tools can identify icon and glyph actions reliably.
- Tooltip-only naming no longer disappears for keyboard, touch, or assistive-technology users.
- Future definite interaction-name regressions fail the same repository gate already used for shell and form accessibility.
