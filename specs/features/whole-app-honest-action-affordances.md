# Whole-App Honest Action Affordances

## One-sentence contract

Eliminate every source-proven dead action outside the private RPG lane by implementing honest local behavior where the data model supports it, removing impossible actions, and rejecting future actionless controls through the accessibility gate.

## Surface and scope

- Active React surfaces under `app/` and `components/`, excluding `components/home/arpg/`.
- IoT Device Registry add/configure/remove controls that currently discard input or have no handler.
- The Security camera screenshot button whose handler only suppresses event propagation and cannot capture the passive placeholder feed.
- The Vehicle `Return Base` button with no handler or command path.
- Native, Framer Motion, and shared shell buttons covered by the existing interactive accessibility validator.

## Visual, content, and interaction thesis

- **Visual:** preserve the existing dense operator panels and modal material; add only one terse session-scope note and reuse the product-native confirmation/toast surfaces.
- **Content:** say exactly what happens: session inventory, no hardware provisioning, staged local simulation, and no transmitted vehicle command.
- **Interaction:** Add and Configure open one focus-contained editor, Remove requires explicit confirmation, the impossible screenshot control disappears, and base return updates local simulation state with immediate feedback.

## Data and state

- Device edits remain component-local and reset on reload; they do not imply network discovery, MQTT enrollment, hardware provisioning, or durable persistence.
- Seeded device rows remain a local reference dataset.
- New session devices start `Offline` with unreported firmware and no claimed live telemetry.
- Vehicle return-to-base changes only existing local mode/waypoint state and emits a toast; it never calls an API, bridge, drone, or physical vehicle.
- No new Zustand field, provider, API route, key, dependency, or private data storage.

## Implementation

1. Replace the UI-only Device Registry modal with a controlled add/configure editor using the shared modal-focus contract.
2. Store session inventory in component state, add or update rows, and remove rows only after the shared action dialog confirms.
3. Add concise toast feedback for add/update/remove actions and explicit session/non-provisioning copy.
4. Remove the passive-feed screenshot control because no source image or capture capability exists.
5. Wire Vehicle `Stage Base Return` to the existing local mode and waypoint state with an explicit no-command-sent toast.
6. Extend the TypeScript-AST validator with actionless and suppression-only button detection plus fixture proof.

## Acceptance criteria

- The independent source audit reports zero actionless or suppression-only buttons outside the private RPG lane.
- IoT add/configure/remove visibly mutate only the current session inventory and do not overclaim hardware effects.
- The editor has a programmatic dialog name, initial focus, focus containment, Escape/backdrop cancellation, and native form submission.
- Removal uses the product-native confirmation dialog and all mutations report concise toast feedback.
- Camera UI no longer exposes an impossible screenshot action.
- Vehicle base-return wording and feedback explicitly describe a local simulation with no transmitted command.
- The validator fails on actionless and suppression-only fixtures while accepting click handlers and form-submit controls.
- `npm run shell:accessibility:check`, `npx tsc --noEmit`, targeted lint, `npm run verify`, `npm run build`, and `git diff --check` pass.

## Benefits

- Operators no longer lose input to a form that silently discards it.
- Every visible action either works within its stated boundary or is removed.
- Destructive session changes are reviewable and reversible by reload.
- Physical-world surfaces stop implying capabilities Nexus does not execute.
- Future dead buttons fail the normal repository gate.
