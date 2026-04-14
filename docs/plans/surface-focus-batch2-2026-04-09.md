# Surface Focus Batch 2 — support/internal route panel landing

## Why this batch exists

`Resources > Surfaces` is now good at explaining what SECURITY and SKILLS are for, but its best links still land at the top of those routes instead of the exact working panel. That adds avoidable clicks and makes the audit feel less like a real operator tool.

The next useful step is to extend the existing focused-session pattern into the remaining high-signal support/internal routes:

- SECURITY
- SKILLS

## Goals

1. Reuse the same mission handoff + focus strip + scroll-target pattern already used by COMMAND, RECON, VAULT, INTEL, CYBER, ALPHA, and VEHICLE.
2. Make the `Surfaces` audit links land on the real panel that matters more often.
3. Preserve the existing segmented-view structure instead of creating a second navigation model.
4. Keep the implementation local-first, static, and low-risk.

## Scope

### In
- Add `focus`-aware landings to SECURITY
- Add `focus`-aware landings to SKILLS
- Add stable target ids and compact focus strips on both routes
- Update `lib/surfaceCapabilities.ts` to use the better deep links

### Out
- No backend or API changes
- No route restructuring
- No tab removals
- No new navigation system

## Implementation plan

1. Add the plan/task entry before editing.
2. Extend SECURITY with `focus` parsing, view self-correction, a focus strip, and stable panel target ids.
3. Extend SKILLS with the same focused-session pattern.
4. Expand mission-handoff support so these routes can participate in the same continuity model.
5. Update the surface capability audit links to use the new focused landings.
6. Re-verify code, handoff, and live route reachability.

## Design rules

- Focus strips should explain why the operator landed there, not restate the route description.
- Focus params should narrow the existing segmented route, not replace it.
- Stable target ids should live on the real panel wrapper, not an arbitrary spacer.
- Only use focused links where the target panel is genuinely high-value.

## Verification

- `npm run type-check`
- `npm run verify`
- `npm run handoff:write`
- Live checks on:
  - `/security?view=ai&focus=security-ai-surface`
  - `/security?view=physical&focus=security-physical`
  - `/skills?view=forge&focus=skills-forge`
  - `/skills?view=blacksite&focus=skills-blacksite`
