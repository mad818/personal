# Whole-App Pointer Control Semantics

## One-sentence contract

Replace every simple active pointer-only `div` outside the private RPG lane with a native keyboard-operable control, remove the dead VAULT folder affordance, and reject future definite regressions through the shell accessibility gate.

## Surface and scope

- Active React surfaces under `app/` and `components/`, excluding `components/home/arpg/`.
- Six source-proven pointer-only controls with `cursor: "pointer"`, an `onClick` handler, no nested interactive descendants, and no native or complete fallback keyboard semantics.
- IoT automation switches and device detail rows, Knowledge Base entries, the floating agent-status control, VAULT category folders, and vehicle camera tiles.
- The nonfunctional VAULT `Bookmarks` tile, which looks actionable but cannot change the active category.
- Existing button-like wrappers (`motion.button`, `motion.a`, and `ShellButton`) are added to the interactive-name validator's coverage.

## Visual, content, and interaction thesis

- **Visual:** preserve the exact tile, switch, row, widget, and camera composition; native-control reset styles prevent browser chrome from changing layout.
- **Content:** reuse existing visible labels and add concise state-aware names only where the action is otherwise ambiguous.
- **Interaction:** pointer behavior remains unchanged, while Enter/Space activation and native focus semantics become available automatically; expanded and switch state are exposed through ARIA.

## Data and state

- No APIs, providers, Zustand fields, persistence, routes, or new runtime state.
- Existing component-local state and callbacks remain authoritative.
- The redundant `Bookmarks` tile is removed rather than adding a fake category or duplicating the existing `All` saved-article view.

## Implementation

1. Convert the six audited controls to `button`, `motion.button`, or a native button with `role="switch"` as appropriate.
2. Preserve layout through explicit reset styles and expose `aria-expanded`, `aria-pressed`, `aria-checked`, or an action label where state matters.
3. Remove the dead VAULT `Bookmarks` tile and its unreachable branch.
4. Extend the TypeScript-AST accessibility validator to cover shared button wrappers and reject simple pointer-only containers, with positive and negative fixture proof.

## Acceptance criteria

- The source audit reports zero simple pointer-only controls outside the private RPG lane.
- Every converted control works with pointer, Enter, and Space through native semantics.
- No nested interactive controls, visible redesign, routing change, or persistence change is introduced.
- The validator fails on a pointer-only fixture and symbol-only wrapper controls, while accepting native/wrapper controls with meaningful names and complete semantic fallbacks.
- `npm run shell:accessibility:check`, `npx tsc --noEmit`, targeted lint, `npm run verify`, `npm run build`, and `git diff --check` pass.

## Benefits

- Keyboard and switch-device users can operate controls that previously required a mouse or touch.
- Screen readers receive switch and expanded-state information instead of generic clickable regions.
- The VAULT no longer advertises an inert folder.
- Shared Framer Motion and shell buttons are included in the same naming guarantee as native controls.
