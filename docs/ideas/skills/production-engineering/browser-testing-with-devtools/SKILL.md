---
name: browser-testing-with-devtools
description: Collects runtime browser evidence for reachable Nexus behavior. Use when verifying navigation, interaction, responsive layout, accessibility, console errors, network behavior, rendering, or performance in a real browser session.
---

# Browser Testing With Devtools

## Overview

Prove the user-visible flow at runtime with the narrowest browser tool and preserve evidence that directly supports acceptance.

## Authority boundaries

- Browser control does not authorize account changes, purchases, publishing, messages, or other external side effects.
- Prefer local Nexus routes and test data.
- Never expose tokens, private vault content, or personal session data in screenshots or logs.

## Workflow

1. State the exact route, viewport, precondition, interaction, and expected result.
2. Reuse an existing local runtime when safe; otherwise start only an approved project command.
3. Load the route and inspect semantic structure, visible state, console,
   uncaught errors, and failed network requests before interacting.
4. Perform the keyboard path first, then pointer and responsive variants.
5. Run the narrowest relevant accessibility and performance checks. Record Web
   Vitals or component-render evidence only when the available browser tool
   measures them directly.
6. Capture only the evidence needed for the acceptance criterion: semantic
   snapshot, screenshot, trace, console/network excerpt, accessibility result,
   or measured performance result.
7. Re-run after the change and compare the same path and viewport.
8. Shut down any runtime started for the test and remove temporary traces or
   saved browser state that are not deliberate artifacts.

## Stop conditions

- The flow requires credentials or external state not authorized by the user.
- Runtime provenance is unclear.
- A screenshot would expose private information.
- The only available path would import or persist browser authentication state
  without explicit authority.

## Verification

- [ ] The tested flow is reachable in the real app.
- [ ] Console and network failures were inspected.
- [ ] Keyboard, focus, and viewport behavior are covered where relevant.
- [ ] Accessibility, performance, and trace claims come from measured tool
  output rather than visual inference.
- [ ] Temporary runtime state was cleaned up.
