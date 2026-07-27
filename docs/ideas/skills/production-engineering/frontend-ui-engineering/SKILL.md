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
2. Define states: idle, loading, success, empty, invalid, degraded, and error as applicable.
3. Map keyboard, focus, pointer, and responsive behavior before JSX.
4. Implement the smallest component and connect it through the existing reachable parent.
5. Wrap asynchronous fetches in `try/catch` and surface useful failure state.
6. Verify semantic roles, labels, focus order, contrast, motion preferences, and viewport behavior.
7. Run focused runtime, accessibility, reachability, type-check, lint, and performance gates.

## Stop conditions

- The necessary owning component has unrelated dirty changes that cannot be isolated.
- The design requires a new route or global overlay outside approved scope.
- Accessibility or failure states are undefined.

## Verification

- [ ] The feature is reachable from an existing user path.
- [ ] Keyboard and pointer flows are equivalent.
- [ ] Empty, loading, and failure behavior are truthful.
- [ ] Responsive and reduced-motion behavior pass.
