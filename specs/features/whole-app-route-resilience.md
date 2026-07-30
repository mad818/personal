# Whole-App Route Resilience

## What it does

Give every Nexus navigation, missing-route, segment-error, and root-layout failure a deliberate product-native state instead of a blank frame, generic framework fallback, or legacy boxed fault panel.

## Surface

- React/Next.js App Router only.
- Shared across the public landing, authenticated Nexus shell, supported routes, and internal routes.
- Reuses the current shell and route hierarchy; adds no top-level route or navigation item.
- Leaves the private Aether Reliquary playfield unchanged.

## Data and state

- Uses only App Router loading/error/not-found state and caught React errors.
- Adds no fetch, API key, provider call, store slice, persistence, telemetry endpoint, or background work.
- Existing `system:error` event-bus diagnostics remain local and receive segment/root-boundary failures.

## Experience contract

- Visual thesis: one quiet, cardless recovery plane with hairline structure, monochrome instrument text, and a single state signal.
- Content plan: terse state label, actionable heading, one-sentence scope/recovery guidance, then only the controls needed to continue.
- Interaction thesis: loading uses one restrained signal pulse; retry remounts the failed segment without a reload; return/reload actions use the same focus-visible treatment and reduced-motion behavior as the shell.

## Requirements

1. `app/loading.tsx` provides a labeled, polite, atomic, busy loading state without creating a nested main landmark on authenticated routes.
2. `app/error.tsx` records a local diagnostic, offers segment retry and HQ return, and never exposes stack traces in production UI.
3. `app/global-error.tsx` supplies its own `html`, `body`, and main landmark with retry and safe entrypoint recovery when the root layout fails.
4. `app/not-found.tsx` explains that the requested route is unavailable and offers HQ plus prior-page recovery.
5. `components/system/ErrorBoundary.tsx` retains its existing event-bus and retry behavior but renders the same shared route-state plane instead of legacy rose/gold inline chrome.
6. Public-root fallbacks own the canonical `nexus-main-content` landmark; authenticated fallbacks render as labeled sections inside the existing main landmark.
7. Motion is decorative, restrained, and disabled by both the Nexus reduced-motion profile and `prefers-reduced-motion`.
8. The existing shell accessibility gate proves file presence, semantic state, recovery controls, production diagnostic hiding, shared-boundary reuse, and reduced-motion styling.

## Edge cases

- Public `/` suspends or throws before landing content resolves.
- An authenticated route fails after the shared shell has mounted.
- The root layout itself throws and no shell CSS or navigation can be assumed.
- A missing protected path is visited with or without an authenticated session.
- Retry fails repeatedly; the operator can still return to the safe default entrypoint or reload.
- Development diagnostics may show the caught message/stack behind a disclosure; production output must not.

## Acceptance proof

- `npm run shell:accessibility:check`
- `npm run type-check`
- `npm run lint`
- `npm run verify`
- `npm run build`
- `npm run handoff:write`
- `npm run handoff:check`
- `git diff --check`
