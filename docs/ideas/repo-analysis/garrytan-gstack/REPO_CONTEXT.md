# REPO_CONTEXT.md

## Repository Thesis

`garrytan/gstack` is an MIT-licensed TypeScript/Bun skill and tooling pack that
organizes AI-assisted product work as a gated sprint: discovery, product and
engineering planning, design/DX review, implementation, code review, browser
QA, shipping, and retrospective. Its strongest Nexus value is the phase
contract, not a second agent runtime or a Claude-branded virtual company.

## Repository Shape

- The current `main` tree exposes role/workflow directories such as
  `office-hours`, plan reviews, design, review, QA, security, ship, investigate,
  and retro, plus `agents`, `browser`, `codex`, scripts, and a Bun manifest.
- The README currently describes 23 specialists and eight power tools and
  documents host support for Claude Code plus Codex, Cursor, OpenCode, Factory,
  Kiro, Hermes, and others.
- Installation mutates host skill directories and can add team-mode
  auto-update/bootstrap behavior. Nexus did not execute it.

## Execution Model

The source chains Markdown skills and supporting scripts so one phase writes
artifacts consumed by the next. Browser QA and shipping can perform real
external actions; some flows can spawn agents, install/update the pack, manage
cookies, or deploy. Those capabilities require explicit authority and cannot be
inherited from a source-review request.

## Nexus Adaptation

- Use the existing production-engineering router for the discovery-to-ship
  sequence.
- Keep the smallest applicable phase set; simple changes must not pay the full
  orchestration cost.
- Reuse Nexus specs, task plan, tests, browser evidence, review, security,
  handoff, and git workflows as the durable artifacts.
- Do not install gstack, create a competing root instruction file, or enable its
  team auto-update.

## Quality Signals and Risks

The repository has explicit host paths, an MIT license, tests, and a visible
workflow architecture. Its breadth is also the main risk: automatic role-play,
browser state, deployment, subagents, and updater behavior can widen a narrow
Nexus task. Current evidence was reviewed from the default branch and README on
2026-07-27.
