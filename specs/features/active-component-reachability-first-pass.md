# Active Component Reachability — First Pass

## Purpose

Make the active React source tree reflect what Nexus can actually render. Unreachable component files currently add type/lint/format maintenance cost, preserve stale interfaces, and let some historical validators look greener than the live application deserves.

## Reachability contract

- Treat every JavaScript or TypeScript file under `app/` as an active application root.
- Follow static imports, re-exports, CommonJS `require()` calls, and literal dynamic imports through `app/`, `components/`, `lib/`, and `store/`, resolving the project `@/` alias plus normal relative paths.
- Resolve TypeScript, JavaScript, CSS, JSON, and directory-index targets without executing application code.
- Fail when a non-RPG file under `components/` is unreachable unless it appears in the explicit reviewed-detached inventory.
- Fail when a reviewed-detached entry disappears or becomes reachable so the inventory cannot drift after a restore-or-retire decision.
- Keep `components/home/arpg/` outside this work. Keep `components/home/office/palette.tsx` outside this work because private RPG tooling imports it even though it is not an application-root dependency.

## First-pass cleanup

- Remove the 35 unreachable non-RPG component files that have no current validator, feature-contract, or source-parity dependency.
- Retain 26 detached files that still require an explicit restore, replacement-proof, or retirement decision and list them in the executable gate.
- Replace the stale root `CLAUDE.md` instruction body with a short legacy pointer to the Codex-first authority chain.
- Correct current non-historical references to the retired `AgentOffice` name; preserve dated historical plans and completed task evidence unchanged.

## Verification

- Red proof reports the 35 unreviewed unreachable paths before removal.
- Green proof reports zero unreviewed unreachable components, exactly 26 reviewed-detached files, and the explicit private-tooling exclusion.
- Run current instruction, documentation, source-parity, type, lint, format, publication, canonical verification, handoff, and changed-path checks.

## Boundaries

- No reachable component, route, API/runtime behavior, provider, dependency, product capability, deployment, phone/PWA implementation, or RPG implementation changes.
- No claim that the remaining 26 reviewed-detached files are live; they are explicit reconciliation debt.
- No rewrites of historical snapshot bodies or old implementation plans.
