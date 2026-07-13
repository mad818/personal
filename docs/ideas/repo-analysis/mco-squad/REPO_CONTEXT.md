# mco-org/squad — repository context

## Snapshot

- Source: <https://github.com/mco-org/squad>
- Reviewed: 2026-07-13
- Version inspected: `0.7.6` from `Cargo.toml` on the default `main` branch
- License: MIT
- Primary files inspected: `README.md`, `Cargo.toml`, `src/main.rs`, and `LICENSE`

## What it is

Squad is a small Rust command-line coordination layer for multiple AI CLI sessions. A manager, workers, and an inspector communicate through one-shot shell commands backed by a project-local SQLite database. It deliberately avoids a daemon: each CLI invocation opens the shared workspace state, performs one operation, and exits.

## How it runs

The upstream workflow installs the `squad` binary, runs `squad init` in a project, installs optional slash-command templates with `squad setup`, and opens separate AI terminals for manager/worker/inspector roles. The core requires Rust 1.77+ to build; release binaries are also documented. Its optional tmux launcher is separate from the core CLI.

## Architectural choices

1. **Shared local state:** `.squad/messages.db` is the task/message bus.
2. **One-shot commands:** join, send, receive, task lifecycle, history, and diagnostics do not require a background service.
3. **Role prompts:** built-in manager, worker, and inspector Markdown files define behavior; YAML files describe teams.
4. **Structured lifecycle:** tasks can be created, acknowledged, completed, listed, and requeued.
5. **Machine envelopes:** JSON modes expose message, agent, and capability metadata for automation.
6. **Session safety:** active-agent/session tokens detect replacement and preserve unread work when an agent leaves.

## Important code

- `src/main.rs` owns CLI argument parsing and dispatch, task commands, JSON envelopes, session validation, history output, setup, and doctor diagnostics.
- The `squad::store`, `squad::tasks`, `squad::roles`, `squad::teams`, `squad::session`, and `squad::setup` modules are the library boundaries referenced by the CLI.
- `Cargo.toml` confirms the lightweight stack: `rusqlite` with bundled SQLite, Serde JSON/YAML, UUIDs, chrono, filesystem locking, and CLI test dependencies.

## What Nexus should adapt

- One operator-facing manager that owns decomposition and synthesis.
- Bounded role-aware worker assignments.
- A strict machine-readable completion envelope.
- Explicit worker status, risks, evidence, verification, and next action.
- Failure normalization so the manager remains in control when a worker fails.

## What Nexus should not copy

- The Rust executable, SQLite message bus, terminal topology, or slash-command installers.
- Arbitrary durable roles that bypass Nexus's governed five-agent taxonomy.
- Automatic external terminal or Git worktree launches.

## Native Nexus mapping

MAX is the manager and only operator-facing orchestrator. EL, DUSTIN, HOPPER, and LUCAS are temporary specialist workers. `delegate_specialist` is the bounded assignment command, and `SpecialistHandoff` is the completion envelope. The existing tool-risk and ProposedEditPanel policies remain authoritative; workers are advisory and cannot mutate state.

## Deeper inspection next

If Nexus later adds resumable long-running workers, inspect upstream store migrations, task lease/requeue invariants, session replacement tests, and doctor diagnostics before designing durable receipts or heartbeat recovery.
