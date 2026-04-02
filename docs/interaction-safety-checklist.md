# Nexus Prime Interaction Safety Checklist

Use this checklist before shipping UI changes to auth, navigation, drawers, floating panels, or segmented controls.

## Form and submit safety

- Buttons inside any form must declare an explicit `type`.
- Native form submit is only allowed when the page intentionally posts and preserves state.
- Auth flows must not trigger a full-page reload for token validation.
- Pressing `Enter` and clicking the primary action must run the same submit path.
- Loading, success, and error states must be visible without clearing the user input unexpectedly.

## Overlay and pointer safety

- Hidden overlays, backdrops, and decorative layers must be inert when closed.
- Decorative fixed layers must use click-through behavior when they are not interactive.
- Open drawers and dialogs must own their z-index intentionally and release focus when closed.
- Always-mounted floating UI must be tested for click access to underlying controls.

## Route and navigation safety

- Canonical GA routes must match the release matrix.
- Legacy aliases must resolve to the canonical route without breaking bookmarks.
- Main nav must only show supported GA surfaces for the current cycle.
- Root entry must resolve to `/hq`.
- No UI affordance should link to deprecated paths directly.

## Control consistency

- Segmented tabs must use one interaction primitive consistently.
- Shared button primitives should be preferred over one-off clickable divs.
- Disabled, hover, focus, and active states must be visually distinct.
- Controls that perform network work must expose loading state and retry paths where appropriate.

## Regression pass

- Auth screen: token success, invalid token, unreachable runtime, no reload on connect.
- Nav: primary route switching, active state, settings open/close.
- Overlays: dismiss, focus return, no click traps.
- Supported GA pages: view-switch controls work with mouse and keyboard.
- Canonical and alias routes both resolve correctly in browser smoke checks.
