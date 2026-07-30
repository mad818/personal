# Whole-App Action Dialogs

## What it does

Replace every blocking browser-native alert, confirm, and token prompt with one product-native, focus-contained action-dialog system across Nexus trust, phone onboarding, and Resources workflows.

## Surface

- React/Next.js shared UI only.
- Applies to trust step-up revalidation, phone PWA instructions, secure-link removal, media duplicate review and removal, media intake duplicate review, and Escape backup restore confirmation.
- Adds no route, panel, navigation item, provider, dependency, or persistent product surface.
- Leaves the private Aether Reliquary playfield unchanged.

## Data and state

- Confirmation and notice requests remain component-local and resolve in memory.
- The shared step-up dialog keeps the entered Nexus token only in local React state while open and passes it through the existing `validateToken()` helper.
- Successful token validation preserves the existing `persistOnSuccess` and elevated-session behavior; the dialog does not log, serialize, URL-encode, or otherwise persist token text itself.
- Adds no Zustand slice, fetch route, API key, telemetry, durable artifact, or background work.

## Experience contract

- Visual thesis: one quiet modal workplane with a dimmed canvas, hairline structure, monochrome instrument copy, and a single state edge.
- Content plan: terse context label, explicit action heading, one short consequence or instruction, then only the controls needed to continue or cancel.
- Interaction thesis: focus enters the safest control for confirmations and the protected input for step-up; Tab remains contained; Escape or backdrop cancels; focus returns to the opener; async validation exposes a busy state and inline result without blocking the browser.

## Requirements

1. A shared action-dialog controller supports confirmation and notice requests without persisting request content or leaving unresolved promises after unmount.
2. Shared dialogs render through a body portal so transformed route surfaces cannot clip or reposition the modal plane.
3. Confirmation dialogs use `alertdialog`, an explicit visible heading and description, `aria-modal`, focus containment, body-scroll lock, Escape cancellation, backdrop cancellation, and opener focus restoration through the existing `useModalDialog` contract.
4. Destructive actions focus Cancel first; notice dialogs focus the acknowledgement action first.
5. Step-up revalidation uses a labeled `type="password"` input, disables dismissal while validation is active, reports validation failures inline, clears token state when closed, and continues using `validateToken()` with `persistOnSuccess: true` and `elevate: true`.
6. Every existing `window.alert`, `window.confirm`, and `window.prompt` call under active `app/` and `components/` code is removed.
7. Phone PWA instructions preserve the existing platform guidance and refresh behavior without an alert.
8. Secure-link removal, duplicate-media overrides, media removal, intake import, and backup restore preserve their existing mutations and messages after explicit confirmation.
9. Styling uses the `nexus-action-dialog` prefix, shared design tokens only, responsive action stacking, visible focus, and both Nexus-profile and OS-level reduced-motion guards.
10. The focused shell accessibility gate recursively rejects future browser-native dialog regressions and proves the shared modal, protected-input, and styling contracts.

## Edge cases

- A second confirmation is requested before the first resolves.
- A component unmounts while a confirmation is open.
- The operator cancels with Escape, clicks the backdrop, or returns focus to the opener.
- Token validation is rejected, rate-limited, unavailable, or throws unexpectedly.
- A backup file is parsed successfully but restore is cancelled.
- A duplicate-media action is cancelled and the draft or intake item remains intact.
- The viewport is narrow or reduced motion is enabled.

## Acceptance proof

- `npm run shell:accessibility:check`
- `npm run type-check`
- `npm run lint`
- `npm run verify`
- `npm run build`
- `npm run handoff:write`
- `npm run handoff:check`
- `git diff --check`
