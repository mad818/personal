# REPO_CONTEXT.md

## What this is

`mvanhorn/last30days-skill` is a cross-host agent skill that researches a recent topic across social, community, market, code, paper, news, and web sources, ranks the collected material by engagement signals, and synthesizes a cited brief. It is an external research runtime, not a replacement for Nexus's NOVA, Feynman, INTEL, protected AI route, or VAULT evidence lanes.

## Stack

- Python 3.12+ package, currently version 3.14.0.
- A large `SKILL.md` runtime contract plus Python scripts under `skills/last30days/scripts/`.
- No declared production Python dependencies in `pyproject.toml`; optional source coverage relies on Node/Python CLIs, API keys, browser sessions, and external services.
- Host manifests for Codex and other agent/plugin environments, plus an optional MCP lane.
- Pytest and coverage gates for the Python runtime.

## How it works

The skill turns a topic into parallel source searches, normalizes posts and engagement, ranks the results, and asks an agent judge to assemble a grounded recent-signal brief. Some sources work without operator keys, while broader coverage requires explicit setup, credentials, browser-session access, or additional CLIs. A preflight/doctor path reports planned writes, source health, missing commands, and authentication problems.

## File map

- `README.md` — current v3 overview, install paths, source coverage, setup, and behavior notes.
- `pyproject.toml` — version, Python requirement, tests, and coverage policy.
- `skills/last30days/SKILL.md` — source of truth for runtime instructions, environment variables, tool permissions, and workflow.
- `skills/last30days/scripts/last30days.py` — primary Python entry point.
- `skills/last30days/scripts/` — source adapters, scoring, diagnostics, output, and configuration logic.
- `.codex-plugin/` and `.agents/` — host integration metadata.
- `mcp/` — optional MCP packaging.
- `tests/` — runtime and connector tests.

## Entry points

- Cross-host install: `npx skills add mvanhorn/last30days-skill -g`.
- Codex-targeted install: add `-a codex` to the cross-host command.
- Source-checkout preflight: `python3 skills/last30days/scripts/last30days.py --preflight`.
- Research invocation: ask the host to run `last30days <topic>` after installation and reviewed setup.

## Nexus fit

- Primary department: Research & Knowledge, owned by NOVA.
- Secondary department: Marketing & Social for current audience and channel signals.
- Useful patterns: bounded recency windows, cross-source normalization, engagement-aware ranking, source-health diagnostics, and one cited brief.
- Existing Nexus seams: NOVA deep research, Feynman evidence workflows, INTEL feeds, protected server routes, and VAULT artifacts.

## Plan

### To use / integrate

1. Keep the repository review-first and optional; do not auto-install it from the Nexus UI.
2. If Mario chooses to use it in Codex, pin a reviewed version and run preflight before any research or credential setup.
3. Keep browser cookies, account tokens, and API keys outside tracked Nexus state and require explicit operator authorization per source.
4. Bring only reviewed results into Nexus through existing source-ledger and VAULT flows.

### To extend / adapt

1. Prefer adapting the recent-window, engagement-scoring, and diagnostics concepts into existing NOVA/Feynman contracts.
2. Route any provider use through `lib/ai.ts` and any external data access through protected `app/api/` routes.
3. Preserve source attribution, fact/inference separation, rate limits, and degraded-source warnings.
4. Do not add direct browser-cookie extraction, hidden installer writes, or duplicate provider routing to the Next.js runtime.

## Open questions

- Whether Mario wants the external Codex skill installed after reviewing its preflight output.
- Which optional social sources are worth their credential and maintenance cost versus Nexus's current public-source coverage.
- Whether a later tranche should adapt only the scoring/diagnostics pattern instead of executing the external runtime.
