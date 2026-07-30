## Repository Analysis Complete
**Repo:** `mco-org/squad`
**What it is:** A Rust CLI that coordinates manager, worker, and inspector AI sessions through one-shot commands and project-local SQLite state.
**Stack:** Rust 2021, rusqlite, Serde JSON/YAML, UUID, chrono, fs2, shell-based AI CLI integration.
**Architecture:** Command dispatcher → workspace/session checks → task/message store → role/team templates → JSON or human-readable envelopes.
**Where to start:** `README.md`, then `src/main.rs`, then the store/task/session modules referenced by the CLI.
**Important notes:** The useful Nexus pattern is structured manager-owned delegation, not the upstream terminal or database runtime.
**Important notes:** Version `0.7.6` and MIT licensing were verified from primary repository files on 2026-07-13.
**Important notes:** Durable leases, requeue, heartbeat, and history remain later-phase capabilities for Nexus.
**Next 3 actions:** Run the central-orchestrator focused checks and inspect the typed handoff contract.
**Next 3 actions:** Exercise a cross-domain HQ prompt and confirm MAX receives bounded specialist outputs.
**Next 3 actions:** Revisit durable receipts only after privacy, retention, cancellation, and recovery rules are specified.
**Context files created:** `REPO_CONTEXT.md`, `AGENTS.md`, `.cursorrules`, `response.md`.
**Source parity:** `docs/ideas/source-parity/mco-squad.json` tracks adapted, pending, and excluded capabilities.
The folder is ready for another agent to continue from here.
