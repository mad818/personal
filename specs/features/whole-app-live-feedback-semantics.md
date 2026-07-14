# Whole-App Live Feedback Semantics

## One-sentence contract

Every active non-RPG error, success, progress, and transient operator message that appears after an action or async result must be announced with the correct live-region semantics without changing the visible interface.

## Surface and scope

- Conditional feedback rendered from identifiers ending in `Error`, `Message`, `Msg`, or `Status` across active `app/` and `components/` TSX sources.
- Direct text feedback and shared `SurfaceCallout` descriptions for loads, runs, copies, imports, saves, comparisons, connectivity, and protected actions.
- Excludes `components/home/arpg/`, static informational copy, durable result workplanes, and object-valued state whose presence renders a full dashboard rather than one feedback message.
- No new route, provider, dependency, visual component, persistent state, external contact, or background task.

## Visual, content, and interaction thesis

- **Visual:** zero visible redesign; retain every current callout, inline label, spacing rule, color, and workplane hierarchy.
- **Content:** preserve existing operator-facing words; failure copy remains specific and progress/success copy remains terse.
- **Interaction:** actionable failures use assertive `alert` semantics, while success, progress, copy, import, and recoverable connectivity messages use polite `status` semantics; no focus is moved and no dialog is added.

## Data and state

- Existing component-local error/message/status state stays authoritative.
- `role="alert"` is reserved for newly rendered failures that require awareness or retry.
- `role="status"` is used for non-urgent completion, progress, import/copy, audit, and connectivity updates.
- A TypeScript-AST validator inspects conditional JSX branches only when the feedback identifier itself is rendered as text or a component property; full result/dashboard branches are not treated as announcements.

## Implementation

1. Add AST fixture coverage for conditional `Error`, `Message`, `Msg`, and `Status` feedback rendered without `role="alert"`, `role="status"`, or `aria-live`.
2. Add alert semantics to dynamic failure callouts and inline error regions across active non-RPG surfaces.
3. Add polite status semantics to transient success, progress, copy, import, audit, and recoverable connectivity messages.
4. Confirm the source tree independently and keep the gate inside `npm run shell:accessibility:check`.

## Acceptance criteria

- The AST fixture rejects unannounced error and status branches while accepting correctly typed and dynamically typed live regions.
- The active non-RPG source audit reports zero rendered feedback branches without live-region semantics.
- Full dashboards, result grids, static callouts, and the private RPG lane are not made into noisy live regions.
- No visible copy, layout, styling, action, route, state, or persistence behavior changes.
- `npm run shell:accessibility:check`, `npm run surface:polish:check`, `npx tsc --noEmit`, targeted lint, `npm run verify`, `npm run build`, handoff checks, and `git diff --check` pass.

## Benefits

- Screen-reader users receive the same failure, retry, copy, import, and completion feedback visible users already receive.
- Urgent failures and routine updates no longer compete at the same announcement priority.
- Focus remains on the operator's current control instead of being stolen by a modal or forced navigation.
- Future definite live-feedback regressions fail the existing accessibility and full verification lanes.
