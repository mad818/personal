# Route Entry Control Accessibility

## One-sentence outcome

Give the global command bar and the canonical operator entry control on every active Nexus workspace a stable programmatic name so screen-reader users can identify where to type or choose a value without relying on placeholder text or visual proximity.

## Surface

This is a shared React-app shell contract spanning the global command bar and the primary entry controls for HQ, COMMAND, INTEL, ALPHA, CYBER, RECON, VAULT, SKILLS, RESOURCES, IOT, and VEHICLE. It adds no route or top-level tab.

## Visual, content, and interaction thesis

- **Visual thesis:** zero visual redesign. Existing token, spacing, focus-ring, and workplane composition remain untouched.
- **Content plan:** each control receives one concise, task-specific accessible name that matches the operator action already visible in its surrounding workplane.
- **Interaction thesis:** pointer, keyboard, form submission, and route behavior remain identical; assistive technology gains a reliable name at the moment focus enters the control.

## Data and state

No data source, API call, provider, persistence, or Zustand state is introduced. The change is static JSX semantics plus a source-level verification contract.

## Implementation boundaries

- Preserve every existing placeholder because it still provides format guidance.
- Do not use placeholder text as the only accessible name.
- Prefer an existing associated label when one already exists; otherwise add a concise `aria-label` to the canonical route entry control.
- Keep the private RPG surface untouched.
- Extend `scripts/validate-shell-accessibility.mjs` with exact source assertions for the route-level contract.

## Acceptance criteria

1. The global command bar and one canonical entry control for every listed workspace have a stable programmatic name.
2. HQ's existing command-input name remains protected by the same gate.
3. The gate fails when any required route-level name is removed or renamed.
4. `npm run shell:accessibility:check`, `npx tsc --noEmit`, lint, and the full `npm run verify` lane pass.
5. No visual CSS, route, provider, store, or persistence behavior changes.

## Benefits

- Screen-reader users hear the purpose of each major work surface immediately on focus.
- Voice-control and accessibility tooling can target stable control names instead of brittle placeholder text.
- The regression gate turns route-level form naming into a durable project contract rather than a one-time cleanup.
