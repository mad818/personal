# REPO_CONTEXT.md

## Repository Thesis

`vercel-labs/skills` is an MIT-licensed TypeScript CLI for discovering,
installing, linking, using, updating, and removing portable Agent Skills across
Codex, Claude Code, Cursor, OpenCode, and many other hosts. It is a distribution
tool, not a trust verdict.

## Repository Shape

- The current `main` repository contains a CLI, source modules, tests, a
  `find-skills` skill, and package/build configuration.
- It accepts GitHub/GitLab/git/local sources, project or global scope, selected
  skills, selected agents, symlink or copy installation, and interactive or
  non-interactive execution.
- `skills use` can materialize a temporary skill and launch a supported agent;
  update/remove commands mutate installed skill state.

## Execution Model

The CLI resolves a source, identifies Agent Skills-format folders, copies or
links them into host-specific locations, and tracks enough state for list,
update, and remove operations. Cross-host format support does not inspect
whether the instructions, hooks, scripts, permissions, or dependencies are safe
for Nexus.

## Nexus Adaptation

`review-external-agent-skill` adds the missing trust step before any
distribution action: deduplication, source/license/version review, hidden
content, hooks, scripts, dependencies, writes, network, credentials,
auto-update, rollback, and host-compatibility analysis. No CLI was installed.

## Quality Signals and Risks

The source has an explicit license, tests, narrow CLI purpose, and portable
format. Its convenience can spread an untrusted skill to multiple global agent
directories or auto-update it, so Nexus keeps distribution behind explicit
operator approval and prefers project-owned adaptations. Reviewed 2026-07-27.
