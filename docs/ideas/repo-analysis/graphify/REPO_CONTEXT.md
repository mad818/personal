# REPO_CONTEXT.md

## What this is

Graphify is a Python CLI and assistant skill that converts code, documents, schemas, and optional media into a queryable knowledge graph. It is a codebase-understanding tool, not an AI-company or department orchestration framework.

## Stack

- Python 3.10+ with setuptools packaging.
- tree-sitter parsers for deterministic multi-language code extraction.
- NetworkX, NumPy, and RapidFuzz for graph construction and resolution.
- Optional MCP, Neo4j, FalkorDB, document, media, SQL, Ollama, OpenAI-compatible, Anthropic, Gemini, Bedrock, and Azure extras.

## How it works

The `graphify` CLI extracts explicit code and document relationships, resolves additional inferred edges, detects communities, and writes `graph.json`, `GRAPH_REPORT.md`, and an interactive `graph.html`. Query, explain, and path commands reuse the saved graph instead of rereading the source tree. Assistant installers register host-specific skills and optional always-on guidance for Codex and other coding agents.

## File map

- `README.md` — capability overview, installation, host support, commands, and output contract.
- `pyproject.toml` — package metadata, dependencies, optional extras, CLI entry points, and test tooling.
- `ARCHITECTURE.md` — extraction, resolution, graph, query, and export architecture.
- `graphify/__main__.py` — package CLI entry point.
- `graphify/cli.py` — command parsing and top-level command handlers.
- `graphify/extractors/` — format and language extraction modules.
- `graphify/exporters/` — graph output integrations.
- `tests/` — unit and integration coverage.

## Entry points

- Install: `uv tool install graphifyy`.
- Register for Codex: `graphify install --platform codex` or project-local `graphify install --project --platform codex`.
- Build: `graphify <folder>` in PowerShell or `/graphify <folder>` in supported slash-command hosts.
- Query: `graphify query`, `graphify explain`, and `graphify path`.

## Dependencies

- tree-sitter packages provide local AST extraction across many languages.
- NetworkX models and traverses the generated graph.
- Optional model/provider extras support semantic passes for non-code material.
- Optional MCP support exposes the saved graph through a tool server.

## Plan

### To use / integrate

1. Keep Graphify as optional external tooling; do not vendor it into the Next.js runtime.
2. If adopted, pin a reviewed package version and install project-local Codex guidance only after reviewing generated instruction changes.
3. Generate artifacts outside tracked product state by default, then expose only reviewed summaries through existing Nexus repo-intel or VAULT lanes.
4. Preserve Graphify's extracted-versus-inferred distinction in any Nexus presentation.

### To extend / modify

1. Prefer a protected adapter around fixed Graphify query commands rather than modifying Graphify internals.
2. Keep any execution explicit, local-only, size-bounded, and review-gated.
3. Do not confuse the graph engine with Nexus agent orchestration or the department map.

## Open questions

- Whether Mario wants Graphify installed as optional local repo tooling after the company-map feature is complete.
- Whether generated graph artifacts should remain ignored or be selectively filed into VAULT.
