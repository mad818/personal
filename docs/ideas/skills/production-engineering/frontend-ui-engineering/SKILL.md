---
name: frontend-ui-engineering
description: Builds accessible, responsive Nexus interfaces inside existing React and shell conventions. Use when adding or changing components, panels, interaction states, responsive layouts, visual hierarchy, keyboard behavior, or user-facing error feedback.
---

# Frontend UI Engineering

## Overview

Deliver one reachable interface state machine that matches Nexus visual contracts, accessibility expectations, and existing data boundaries.

## Authority boundaries

- Follow the active React app; never restore or import the archived HTML app.
- Reuse existing shell primitives, design tokens, helpers, routes, and Zustand selectors.
- Do not add external assets, providers, telemetry, or persistent state without explicit scope.

## Workflow

1. Read the parent route, neighboring components, design tokens, and relevant feature spec.
2. Shape the interface before JSX: audience, primary job, hierarchy, content,
   and the one interaction that must feel effortless.
3. Define states: idle, loading, success, empty, invalid, degraded, and error as applicable.
4. Map keyboard, focus, pointer, and responsive behavior before JSX.
5. Critique hierarchy, clarity, density, brand fit, and avoidable template
   patterns against `DESIGN.md` and `docs/NEXUS_TASTE_CONTRACT.md`.
6. Implement the smallest component and connect it through the existing reachable parent.
7. Wrap asynchronous fetches in `try/catch` and surface useful failure state.
8. Harden overflow, long text, localization pressure, missing data, slow
   responses, reduced motion, and narrow viewports.
9. Polish only after behavior is correct. Use purposeful motion; when GSAP is
   already selected, scope selectors, clean up timelines on unmount, favor
   transforms and opacity, and never add it as an implicit dependency.
10. Run focused runtime, accessibility, reachability, type-check, lint, and performance gates.

## Stop conditions

- The necessary owning component has unrelated dirty changes that cannot be isolated.
- The design requires a new route or global overlay outside approved scope.
- Accessibility or failure states are undefined.

## Verification

- [ ] The feature is reachable from an existing user path.
- [ ] Keyboard and pointer flows are equivalent.
- [ ] Empty, loading, and failure behavior are truthful.
- [ ] Responsive and reduced-motion behavior pass.
- [ ] Visual polish follows the project design authority instead of importing
  an external style pack.
