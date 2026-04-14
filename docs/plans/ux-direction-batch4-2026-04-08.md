# UX Direction Batch 4 — Post-Action Continuation Chips

Date: 2026-04-08
Owner: Codex

## Why this batch

The mission handoff strip now preserves intent after route changes, but continuity still drops after
high-value actions inside the surfaces themselves.

Two places still feel colder than they should:

1. HQ chronicle replies finish with useful output, but the operator has to decide the next screen
   from scratch.
2. VAULT graph/detail surfaces show useful context, but they do not yet turn archived artifacts
   back into action with one compact step.

## Goal

Add lightweight continuation chips that appear after important outputs and let the operator keep moving
without introducing a second navigation system or another wall of controls.

## Scope

1. Add a shared continuation helper/component that:
   - reuses the existing route-intent detector
   - normalizes old route hints into current app routes
   - provides compact next-step actions instead of page-sized guidance
2. Use it in HQ replies:
   - beside existing `Ask memory` / `+ VAULT` actions
   - only when there is a useful next route
3. Use it in VAULT focus/detail:
   - offer `Ask memory`
   - offer `Continue in …` when the artifact clearly points to INTEL, CYBER, VEHICLE, or VAULT
   - offer `Return to HQ`

## Constraints

- Keep the control surface compact.
- Preserve existing actions; improve, do not replace.
- Reuse centralized routing logic whenever possible.
- Keep free-first/local-first unchanged.
- Avoid surfacing restricted content in chips or route labels.

## Success criteria

- HQ replies feel like they naturally lead somewhere next.
- VAULT artifacts can reopen the right working lane with one click.
- The continuation chips stay visually lightweight and context-aware.
- Verification and live route checks remain green.
