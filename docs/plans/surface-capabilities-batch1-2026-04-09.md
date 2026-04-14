# Surface Capabilities Batch 1 — cross-tab ability audit inside Resources

## Why this batch exists

Nexus has real depth now, but too much of the "what is this surface for, what are its best sub-sections, and where should I go next?" model still lives in route copy and memory. That makes the product stronger for repeat users than for a user who is trying to orient quickly after login.

The best low-risk fix is not another doc. It is a first-class in-app capability lane inside Resources that turns the current tabs into a readable system map:

- what each surface is best at
- what its sub-sections actually do
- when to choose it over another surface
- how free-first / offline posture affects it
- what should be strengthened next

## Goals

1. Make the app easier to understand without removing any existing tabs or flows.
2. Strengthen route cohesion by connecting surfaces to System Design and Impact.
3. Preserve local-first and free-first posture as an explicit product rule, not hidden implementation detail.
4. Keep the implementation static, fast, and low-risk.

## Scope

### In
- Add a new Resources workbench lane for surface capabilities
- Add a shared static contract for major surfaces and their sub-sections
- Include mission, strongest abilities, free-first posture, offline posture, best-fit use cases, next upgrades, and jump-offs
- Link into live routes, System Design, and Impact
- Refresh Resources route copy to acknowledge the new audit lane

### Out
- No tab removal or route restructuring
- No backend/API work
- No dynamic crawling of route definitions
- No new paid integrations

## Implementation plan

1. Add `lib/surfaceCapabilities.ts` with a typed contract for the major Nexus surfaces.
2. Add `components/resources/SurfaceCapabilitiesConsole.tsx`.
3. Update `components/resources/ResourcesWorkbench.tsx` to include a `Surfaces` view.
4. Update store typing/defaults for the new Resources view.
5. Refresh `app/resources/page.tsx` copy so the lane reads as a native part of the workbench.
6. Re-verify code health, handoff, and live route reachability.

## Design rules

- Prefer compact cards and chips over long paragraphs.
- Lead with "what this surface is best at" before architectural detail.
- Make sub-sections actionable with deep links where possible.
- Keep upgrade notes practical and implementation-oriented.
- Surface free-first and degraded/offline posture explicitly.

## Verification

- `npm run type-check`
- `npm run verify`
- `npm run handoff:write`
- Live checks:
  - `http://127.0.0.1:3000`
  - `http://127.0.0.1:3000/resources`
  - `http://127.0.0.1:3000/resources?view=surfaces`
