# Whole-App Clipboard Feedback

## One-sentence contract

Every active copy action must announce success only after the browser accepts the clipboard write and must expose a clear, recoverable failure when clipboard access is unavailable.

## Surface and scope

- Vehicle connector onboarding: command, profile JSON, and setup guide.
- Vehicle bench, first-hardware-day, drone-ops, session bundle, imported bundle, and render-brief copy actions.
- Settings PM checklist diagnostics.
- VAULT graph-view summary and visible-node exports.
- One shared clipboard-feedback helper and active TSX sources under `app/` and `components/`, excluding the private `components/home/arpg/` lane.
- No new route, provider, dependency, persistent state, fallback clipboard API, download path, or background behavior.

## Visual, content, and interaction thesis

- **Visual:** keep every current workplane and control unchanged; reuse the existing compact toast signal instead of adding inline cards, banners, or modal feedback.
- **Content:** name the copied artifact, confirm only a completed write, and tell the operator to keep the panel open and retry when browser clipboard access is unavailable.
- **Interaction:** one click starts one browser write; success is polite, failure is explicit, and rejected promises never disappear or surface as unhandled event errors.

## Data and state

- Clipboard text remains transient and is never written to Zustand, VAULT, URLs, logs, or run artifacts.
- The shared helper checks clipboard availability, awaits `writeText()`, emits the existing low-severity success toast only after fulfillment, and emits a medium-severity failure toast after absence or rejection.
- Existing direct copy paths that already provide truthful local feedback remain unchanged.
- The helper returns a boolean result for future callers without requiring component-local state.

## Implementation

1. Add a small client-only `copyTextWithFeedback()` helper that uses the existing toast surface and never includes the copied text in feedback.
2. Replace the eleven empty clipboard catches across vehicle and Settings surfaces with labeled helper calls.
3. Route both unhandled VAULT graph copy awaits through the same helper.
4. Extend the secondary-surface TypeScript-AST validator to reject empty clipboard catches and unhandled clipboard writes while accepting substantive `try/catch`, delegated rejection handlers, and deliberately forwarded promises.

## Acceptance criteria

- The thirteen confirmed gaps use the shared helper and retain their existing controls, labels, payloads, and layout.
- Success feedback is emitted only after `navigator.clipboard.writeText()` fulfills.
- Clipboard absence and rejection produce a named failure toast with one recovery instruction.
- An independent audit reports zero silent or unhandled direct clipboard writes across active non-RPG TSX sources.
- AST fixtures cover empty catch blocks, unhandled awaits, bracket-access equivalents, substantive catch blocks, delegated handlers, and raw promise forwarding.
- `npm run surface:polish:check`, `npx tsc --noEmit`, targeted lint, `npm run verify`, `npm run build`, handoff checks, and `git diff --check` pass.

## Benefits

- Operators know whether a command, runbook, bundle, checklist, or VAULT summary actually reached the clipboard.
- Browser permission and secure-context failures become recoverable instead of silent.
- Repeated copy behavior uses one concise product language without adding visual clutter.
- Future definite clipboard-feedback regressions fail the normal repository gate.
