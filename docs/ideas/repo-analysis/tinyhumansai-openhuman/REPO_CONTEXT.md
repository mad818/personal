# REPO_CONTEXT.md

## What this is

`tinyhumansai/openhuman` is a GPL-3.0, early-beta personal AI desktop platform. Its current README describes three main systems: persistent local memory, durable graph-based orchestration, and a researcher/doer runtime that gathers context before answering.

## Stack

- Rust core and desktop runtime
- TypeScript/JavaScript application UI
- Tauri-oriented desktop packaging
- Local SQLite and Markdown/Obsidian-style memory representation
- Agent graphs, workflows, connectors, MCP, web/browser, voice, and media capabilities

## How it works

OpenHuman ingests operator-approved data into a local memory model, selects relevant context before a turn, routes work through a fast/deep agent architecture, and can propose visible workflows for review. Its broader product claims include background ingestion, meeting attendance, multi-channel messaging, media generation, encrypted agent-to-agent communication, and payments.

## Important source caveats

- The repository calls itself an early beta; README behavior is treated as source capability claims, not independently verified production reliability.
- The license is GPL-3.0, not MIT. Nexus must not copy or vendor implementation code into the MIT runtime.
- The current repository is much broader than the older Nexus note that described persona sliders and emotional-state modeling.

## File map

- `README.md` — product surface, architecture claims, setup, and capability overview
- `LICENSE` — GPL-3.0 terms
- `Cargo.toml` and `src/` — Rust runtime and core
- `package.json`, `app/`, and `packages/` — application and TypeScript workspace
- `docs/` and `gitbooks/` — deeper product and architecture material
- `tests/` and `e2e/` — automated acceptance surfaces

## Nexus plan

### Adapt now

1. Compile the existing explicit Personal Profile fields into one bounded context contract.
2. Show the operator what profile categories are active in Settings.
3. Feed the same block to direct chat and the existing MAX/specialist agent runtime.
4. Keep profile text subordinate to security, tool policy, and approval rules.

### Keep separate or later

- Durable hierarchical memory, editable wiki synchronization, resumable graph checkpoints, semantic tool-output compression, meeting agents, broad messaging, media generation, encrypted-at-rest memory, theme studio, and replay/cost journals remain later reviewed tranches.
- Silent account ingestion, opaque subconscious goal changes, payments/trading, emotional-companion behavior, and GPL source vendoring are excluded.

## Open questions

- Whether a later memory-tree tranche should compile only approved Nexus records or also operator-selected local documents.
- Whether durable orchestrator checkpoints belong in the existing run artifact store or a new privacy-scoped ledger.
