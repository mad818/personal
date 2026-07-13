# REPO_CONTEXT.md

## What this is

`mattpocock/skills` is an MIT collection of small, composable engineering and productivity skills for coding agents. It covers discovery, domain language, specs, ticketing, TDD, debugging, architecture, research, implementation, review, handoff, and teaching; it is a workflow catalog rather than a Nexus runtime.

PR #505, merged into `main` on 2026-07-10, adds `setup-ts-deep-modules` under the repository's `in-progress` bucket. The merged final shape treats every root file of a TypeScript package as a public entry point, hides every subfolder, protects tests, rejects cycles through `dependency-cruiser`, and intentionally remains outside the released plugin/router surface.

## Stack

- Markdown Agent Skills organized by engineering, productivity, in-progress, deprecated, misc, and personal status.
- Shell and JavaScript helper scripts.
- Claude plugin and cross-host Agent Skills metadata.
- Private npm metadata package at version 1.1.0 with Changesets for releases.
- Optional external issue trackers and tools selected by individual skills.

## How it works

The repository separates user-invoked orchestration skills from model-invoked reusable disciplines. A setup skill records issue-tracker, label, and documentation preferences; subsequent workflows interview the user, create shared language and ADRs, produce specs or dependency-aware tickets, implement through TDD, and review against both standards and the originating spec. In-progress skills are deliberately excluded from the public plugin and router until promoted.

## File map

- `README.md` — philosophy, install/setup, and released skill catalog.
- `package.json` — version 1.1.0, release tooling, and MIT metadata.
- `skills/engineering/` — released engineering orchestration and disciplines.
- `skills/productivity/` — general interview, handoff, teaching, and skill-writing workflows.
- `skills/in-progress/` — experimental skills not exposed by the plugin/router.
- `skills/in-progress/setup-ts-deep-modules/` — PR #505 skill and dependency-cruiser template.
- `.claude-plugin/` and `.agents/` — host metadata.
- `docs/` and `CONTEXT.md` — project vocabulary and contributor context.
- `scripts/` — repository maintenance helpers.

## Entry points

- Install selectively: `npx skills@latest add mattpocock/skills`.
- First-run configuration: `/setup-matt-pocock-skills` after selecting that skill.
- Read released skill folders directly for review without installing.
- Treat `setup-ts-deep-modules` as an in-progress reference, not a released command.

## Dependencies

- Released skills may connect to GitHub, Linear, or local files depending on operator setup.
- PR #505 installs `dependency-cruiser` as a dev dependency and modifies repo checks/config/docs.
- Changesets manages the skill catalog release metadata.

## Plan

### To use / integrate

1. Add the released catalog as a review-first Engineering/Operations source.
2. Select individual workflows only where they improve existing Nexus specs, verification, or handoffs.
3. Keep issue-tracker writes and configuration changes behind explicit operator intent.
4. For ChatGPT, use a bounded copied workflow or an authorized app connection; normal chat does not inherit local skills or tracker access.

### To extend / modify

1. Compare each workflow against existing Nexus gates before adapting it; do not create duplicate orchestration, memory, or handoff systems.
2. Treat PR #505 as an architecture experiment: first inspect Nexus's actual module seams and import graph.
3. Do not install `dependency-cruiser`, scaffold packages, or rewrite checks as part of the Company Map intake.
4. If deep-module enforcement is later approved, write a separate spec and prove pass/fail/pass boundary behavior on Nexus fixtures.

## Open questions

- Which released engineering workflows add value beyond Nexus's existing Superpowers, spec, TDD, handoff, and review discipline.
- Whether Nexus's current application layout benefits from the PR #505 package-root model or a narrower dependency rule.
