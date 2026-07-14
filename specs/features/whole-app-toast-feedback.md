# Whole-App Toast Feedback

## What it does

Make transient Nexus notifications readable, keyboard-safe, motion-aware, and limited to genuinely new events instead of replaying persisted notification history on launch.

## Surface

- React/Next.js shared shell only.
- Applies to module-level `toast()` calls and the notification-to-toast bridge.
- Adds no route, panel, navigation item, or new persistent surface.
- Leaves notification-center history and the private Aether Reliquary playfield unchanged.

## Data and state

- Uses the existing notification store selector and in-memory toast queue.
- Adds no store slice, persistence, fetch, API key, provider call, telemetry, or background work.
- The bridge seeds its in-memory seen set from the first hydrated notification snapshot so prior history remains in the notification center without becoming launch-time toast noise.

## Experience contract

- Visual thesis: a compact monochrome signal strip with one severity edge, hairline structure, and no floating-card ornament.
- Content plan: title, optional message, terse severity label, one dismiss control, and a quiet remaining-time indicator.
- Interaction thesis: motion is a restrained lateral entrance only when allowed; countdown pauses while hovered, keyboard-focused, or backgrounded; critical and high signals announce assertively while lower severities remain polite.

## Requirements

1. Toast presentation uses shared CSS tokens and the `nexus-toast` prefix; no severity color or surface color is hardcoded in the component.
2. Critical and high toasts expose alert/assertive semantics; medium and low toasts expose status/polite semantics; each announcement is atomic.
3. Hover, focus-within, and hidden-document states pause expiration without resetting or consuming the remaining duration.
4. The dismiss control has a toast-specific accessible name and a touch-safe target.
5. Framer Motion entrance/exit travel is removed when the user prefers reduced motion, with a CSS profile fallback for transitions.
6. The toast region remains responsive, bounded to three visible items, and does not create a redundant live region around individually announced items.
7. The notification bridge does not replay notifications present in the first hydrated store snapshot, but emits later unseen notifications normally.
8. The focused shell accessibility gate proves semantics, pause states, reduced motion, token-only styling hooks, and first-snapshot seeding.

## Edge cases

- The app starts with persisted notifications already loaded.
- A toast receives focus and the pointer leaves it.
- The document becomes hidden while a toast is counting down.
- Duration is missing or unexpectedly short.
- Several new notifications arrive together; only the newest three remain visible.
- Reduced motion is enabled through either the OS preference or the Nexus motion profile.

## Acceptance proof

- `npm run shell:accessibility:check`
- `npm run type-check`
- `npm run lint`
- `npm run verify`
- `npm run build`
- `npm run handoff:write`
- `npm run handoff:check`
- `git diff --check`
