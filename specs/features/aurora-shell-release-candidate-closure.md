# AURORA-SHELL-RELEASE-CANDIDATE-CLOSURE

## Outcome

The existing Homefront Aurora worktree becomes one coherent, desktop-ready,
fully verified release-candidate commit. Aurora is the canonical visual shell
for every GA route without changing provider behavior, API contracts, security
policy, authentication, Zustand state, persistence, operator data, or the
free/local-first product guarantee.

## Operator benefit

- The slim top rail and lower visual density leave more room for actual work.
- One dominant workplane leads each route while support rails remain reachable.
- Proportional grids use wide desktop space without fixed-width dead zones.
- Ice-cyan instrumentation, restrained glass, disciplined typography, and
  quieter motion give every GA route one recognizable command-room grammar.
- One trust surface avoids duplicate polling and conflicting security posture.
- The exact redesign becomes reviewable, reversible, and safe to build on
  instead of remaining mixed into an uncommitted worktree.

## Source truth and ownership

- `DESIGN.md` owns palette, typography, spacing, density, shell proportions,
  motion timing, and generated CSS variables.
- `app/design-md.generated.css` and `lib/generated/designMdRuntime.ts` are
  generated outputs and must reproduce from `DESIGN.md`.
- `docs/NEXUS_TASTE_CONTRACT.md` and `lib/nexusTasteContract.ts` own the written
  and executable Aurora hierarchy contract.
- `components/nav/Nav.tsx` owns global route navigation and top-rail posture.
- `components/ui/shell.tsx` owns shared shell, header, workplane, rail, and grid
  primitives.
- `components/ui/PageTransition.tsx` and `lib/surfaceMotion.ts` own route-entry
  motion and reduced-motion behavior.
- `components/ui/TrustOperationsRail.tsx` owns reachable trust diagnostics and
  step-up behavior after the duplicate top-rail strip is retired.
- `lib/opsLayoutRegistry.ts` and `lib/surfaceRedesignRegistry.ts` own route
  layout intent and review posture.
- The eight GA route pages own their route-specific hierarchy and content.
- Existing focused validators plus `npm run verify` own regression proof.

## Starting worktree inventory

Baseline content diff: 26 paths, 1,455 additions, 914 deletions, zero staged
paths. The pre-edit binary diff SHA-256 is
`85254F4846B2E70F2EB9071970E93AA3A3295484E9B3D2325354E85D6A788F4B`.

### Intentional design source and runtime behavior

- `DESIGN.md`
- `app/globals.css`
- `app/alpha/page.tsx`
- `app/command/page.tsx`
- `app/cyber/page.tsx`
- `app/intel/page.tsx`
- `app/recon/page.tsx`
- `app/resources/page.tsx`
- `components/nav/Nav.tsx`
- `components/resources/ResourcesWorkbench.tsx`
- `components/ui/PageTransition.tsx`
- `components/ui/TrustOperationsRail.tsx`
- `components/ui/shell.tsx`
- `lib/nexusTasteContract.ts`
- `lib/opsLayoutRegistry.ts`
- `lib/surfaceMotion.ts`
- `lib/surfaceRedesignRegistry.ts`

### Generated outputs

- `app/design-md.generated.css`
- `lib/generated/designMdRuntime.ts`

### Intentional obsolete-surface reconciliation

- delete `components/ui/TrustPostureStrip.tsx`
- update `docs/NEXUS_FIGMA_IMPLEMENTATION_RULES.md`
- update `docs/plans/m4-trust-substrate-replay-paths.txt`
- update `lib/repoAssimilation.ts`
- update `scripts/validate-shell-accessibility.mjs`
- update `scripts/validate-smoothness-guardrails.mjs`

### Closure-owned planning and generated handoff truth

- add `specs/features/aurora-shell-release-candidate-closure.md`
- update `tasks/todo.md`
- update `docs/SYSTEM_STATE.md`
- regenerate `docs/AGENT_HANDOFF.md`, `docs/CODEX_HANDOFF.md`,
  `docs/CLAUDE_HANDOFF.md`, and `docs/CURSOR_HANDOFF.md`; all four are
  content-identical after refresh and are not part of the final diff

### Status-only, no content diff

These paths are not part of the Aurora commit unless a later intentional edit
creates a real reviewed diff:

- `docs/plans/design-ux-wave-7.md`
- `scripts/cp2-operational-live-gate.mjs`
- `scripts/desktop-signing-operator-guide.mjs`
- `scripts/validate-design-taste-contract.mjs`

Finalization also observed 23 unrelated CRLF/status-only source paths with no
Git content diff. They remain unstaged and untouched. The repository-wide
formatter reports those excluded paths, while the exact changed Aurora
TypeScript/TSX allowlist passes Prettier.

### Excluded local file

- `main.bat` remains untracked and excluded. `NexusPrime.bat` is the one
  supported launcher.

## Functional contracts

1. The top rail is slim and preserves the brand, active-route orientation,
   every GA navigation target, bounded operational lights, keyboard route
   shortcuts, command entry, and free/local posture.
2. Every GA route has one visually dominant workplane. Support rails,
   disclosures, and secondary tools remain reachable without competing with
   the primary job.
3. Wide desktop layouts use proportional recipes at 1280x800, 1440x900, and
   1920x1080 without clipping, sticky-rail obstruction, unusable empty space,
   or fixed mini-tile layouts.
4. Shared shell changes preserve route titles, descriptions, loading, empty,
   retained-data, unavailable, error, dialog, keyboard, pointer, and focus
   behavior.
5. Page transitions use bounded transform/opacity motion, never hide content,
   and become immediate when the operator or OS requests reduced motion.
6. `TrustOperationsRail` preserves authentication diagnostics, provider
   posture, Privacy Shield posture, high-risk state, protected-action cues,
   step-up access, retry feedback, hidden-tab polling suspension, abort-safe
   requests, and listener/timer cleanup.
7. `TrustPostureStrip` and every code, documentation, validator, replay-list,
   and style reference to it are removed only after contract 6 is proven.
8. `DESIGN.md` deterministically regenerates the tracked CSS and TypeScript
   outputs with no independent edits or drift.
9. The redesign adds no provider call, route, dependency, API, state field,
   persistence path, secret, telemetry, external asset, or product charge.
10. Desktop acceptance covers `/hq`, `/command`, `/intel`, `/alpha`, `/cyber`,
    `/recon`, `/vault`, and `/resources`. For this release only, Mario's
    authenticated manual visual confirmation is the accepted visual gate;
    automated Browser DOM, screenshot, console, network, keyboard, focus,
    reduced-motion, and multi-viewport evidence is unavailable due local-URL
    policy and is recorded as unavailable rather than passed.
11. Physical phone/PWA acceptance remains deferred. Existing responsive rules
    may receive static regression proof but cannot reopen the device workflow.
12. Completion produces one exact-scope commit with zero staged/unstaged
    overlap. Remote publication is reported separately from local readiness.

## Failure behavior and stop conditions

- If an existing dirty hunk cannot be tied to this contract, leave it
  unstaged and report it instead of guessing.
- If retiring `TrustPostureStrip` loses reachable behavior, restore or move the
  missing behavior before deletion; never weaken the trust contract.
- If browser evidence contradicts a static gate, runtime evidence wins and the
  defect remains open.
- If fixing a defect requires provider, phone, deployment, dependency, state,
  or unrelated subsystem work, stop that path and surface the boundary.
- If generated outputs do not reproduce from `DESIGN.md`, correct the source or
  generator; do not hand-edit around drift.
- A failed, skipped, stale, or simulated required gate blocks completion unless
  the operator explicitly revises that release's acceptance contract, as
  recorded below.

## Release-specific desktop acceptance revision — 2026-07-29

Mario authenticated into the owned local Nexus runtime, confirmed that the
interface loaded and displayed correctly, and explicitly accepted that manual
visual confirmation as the desktop visual gate for this Aurora release.

The in-app Browser could claim the attached `127.0.0.1` tab, but policy rejected
page-state, screenshot, console, and network reads. No alternate browser
automation or policy workaround was used. This release therefore makes no claim
of automated Browser QA, breakpoint-by-breakpoint viewport proof, or automated
interaction proof. Deterministic shell validators, the production build,
performance and secure-start checks, the eight-route authenticated release
smoke, and Mario's manual visual confirmation are the accepted evidence.

This revision applies only to this Aurora closure. It does not waive future
automated browser evidence when the policy allows it, and it does not reopen the
deferred phone/PWA lane.

## Boundaries and exclusions

- No new feature, tab, route, provider, API, dependency, persistent state,
  migration, telemetry, or external asset.
- No change to `lib/ai.ts`, provider selection, protected-route policy,
  Privacy Shield, approval tiers, or operator data.
- No phone/PWA, Docker, Coolify, signing, deployment, Dependabot, or RPG work.
- No broad formatting, unrelated cleanup, `git add .`, or staging of status-only
  paths.
- No tracked screenshot, token, cookie, auth header, LAN address, private vault
  content, prompt, response, transcript, or browser session state.
- No claim that static checks alone prove desktop visual acceptance.

## Verification matrix

### Focused static and runtime gates

- `npm run design:check`
- `npm run surface:polish:check`
- `npm run smoothness:check`
- `npm run components:detached:check`
- `npm run shell:accessibility:check`
- `npm run type-check`
- `npm run lint`
- `npm run format:check` for the canonical run; on final rerun, record the
  excluded CRLF/status-only paths and require the exact changed Aurora
  TypeScript/TSX allowlist to pass Prettier
- `git diff --check`
- `npm run publication:safety:check`
- `npm run security-scan`

### Desktop browser evidence

- accepted: Mario's authenticated manual visual confirmation
- accepted: authenticated release smoke across all eight GA routes
- unavailable due policy, not passed: automated DOM and screenshot inspection
- unavailable due policy, not passed: automated console and failed-request
  inspection
- unavailable due policy, not passed: automated keyboard, focus,
  reduced-motion, disclosure, and 1280x800/1440x900/1920x1080 viewport evidence
- no private content captured or tracked
- owned runtime shut down and its port independently confirmed released

### Release-candidate proof

- `npm run verify`
- `$env:NEXUS_NEXT_SKIP_BUILD_CHECKS='1'; npm run build`
- `npm run performance:check`
- `npm run secure:start -- --check`
- `npm run operational:start -- --smoke --port=<verified-free-port>`
- `npm run handoff:write`
- `npm run handoff:check`
- exact staged allowlist, zero overlap, staged diff inspection, commit, and push
  attempt

## Rollback

Keep Aurora closure in one commit with no data or schema migration. A later
regression can revert that commit to the previous shell without modifying
operator configuration or data. The pre-edit diff hash and Git history preserve
the starting evidence.
