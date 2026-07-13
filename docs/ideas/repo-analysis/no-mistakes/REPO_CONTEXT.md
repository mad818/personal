# REPO_CONTEXT.md

## What this is

`kunchenguid/no-mistakes` is an MIT-licensed Go release gate that places an isolated validation pipeline between a working branch and its configured push target. It combines intent-aware review, tests, documentation, linting, operator decisions, push/PR creation, and CI monitoring.

## Stack

- Go 1.25
- Cobra CLI
- Bubble Tea, Bubbles, and Lip Gloss terminal UI
- SQLite-backed local run state
- Git worktrees and Git remote orchestration
- Agent skill plus non-interactive AXI/TOON protocol

## How it works

The operator initializes a local gate and pushes a committed feature branch to the `no-mistakes` remote. The daemon validates the change inside a disposable worktree, advances through ordered review/test/docs/lint gates, pauses on findings that require a human decision, and only forwards the branch and creates a pull request after the local gates pass. It then observes CI and reports a terminal outcome.

## File map

- `README.md` — product behavior, trigger modes, operator flow, and development commands
- `.no-mistakes.yaml` — deterministic repository-specific test, lint, format, and documentation commands
- `go.mod` — Go version and CLI/TUI/persistence dependencies
- `cmd/` — command entry points
- `internal/` — gate lifecycle, pipeline, worktree, agent, persistence, and Git integration
- `skills/no-mistakes/SKILL.md` — agent-facing task-first and validate-only protocol
- `.no-mistakes/evidence/` — repository-owned validation evidence

## Entry points

- `no-mistakes init` configures the gate.
- `git push no-mistakes <branch>` starts the Git-remote flow.
- `no-mistakes` opens the TUI.
- `no-mistakes axi ...` exposes the non-interactive agent protocol.

## Dependencies

- Git provides branches, remotes, disposable worktrees, rebases, and forwarding.
- Bubble Tea/Lip Gloss provide the terminal interface.
- SQLite persists gate runs and findings.
- A configured supported coding agent performs AI-driven review and fixes.
- GitHub or another configured remote supplies pull-request and CI state.

## Plan

### To use / integrate

1. Adapt the intent requirement and ordered check/outcome model into a Nexus-owned read-only CLI.
2. Reuse `handoff:check`, `ops:preflight`, `verify`, and Git status instead of installing another daemon.
3. Keep remote writes, PR creation, CI mutation, auto-fixes, and rebase/merge actions operator-controlled.
4. Add focused static/runtime gates and wire them into the existing `npm run verify` chain.

### To extend / modify

Add future isolation or evidence persistence only as separate reviewed tranches. Any disposable-worktree mode must preserve Nexus's existing main-branch workflow, Git ACL recovery wrapper, local-only evidence boundary, and explicit approval for external writes.

## Open questions

- Whether a later tranche should run full verification in a disposable worktree rather than the current checkout.
- Whether sanitized release-gate evidence should be persisted under ignored `.nexus/` state.
