# REPO_CONTEXT.md

## Repository Thesis

`jarrodwatts/claude-hud` is an MIT-licensed Claude Code status-line plugin. It
summarizes project/git state, native context and usage data, tools, skills, MCP
activity, agents, todos, and session metadata. Nexus can adapt the operator
questions and compact layout, but not Claude's host-only status-line API.

## Repository Shape

- The current `main` tree contains JavaScript/TypeScript source, commands,
  scripts, tests, distribution output, Claude plugin metadata, and a Node
  manifest.
- Setup installs a Claude plugin and configures Claude Code's native status
  line.
- Rendering consumes host-provided stdin plus Claude transcript JSONL and local
  git/config state.

## Execution Model

The host invokes the status-line program after interactions. It parses native
context/usage data and optional transcript activity, then renders configurable
compact or expanded terminal lines. Some options read account/config metadata
or write local usage snapshots.

## Nexus Adaptation

`run-status-summary` reports `Now`, `Done`, `Checks`, `Blocked`, and `Next` from
current project/tool evidence. The production observability workflow now
forbids estimating host-only fields. ChatGPT/Codex commentary supplies live
progress; final output remains self-contained.

## Quality Signals and Risks

The project exposes extensive configuration, tests, and an explicit license.
Its native token values, transcript parser, account fields, and status-line
callbacks are specific to Claude Code. Claiming them in ChatGPT/Codex would be
false parity and could expose private metadata, so they are excluded. Reviewed
2026-07-27.
