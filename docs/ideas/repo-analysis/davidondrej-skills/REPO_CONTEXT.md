# REPO_CONTEXT.md

## What this is

`davidondrej/skills` is an MIT catalog of reusable Markdown skills for coding agents, research agents, and workflow agents. It spans agent orchestration, skill authoring, research/web work, structured thinking/documentation, and operations/security setup, plus shell safety hooks.

## Stack

- Markdown `SKILL.md` packages grouped into five category folders.
- Shell hooks and setup scripts.
- No package manifest, application runtime, server, or published release.

## How it works

Each skill is a self-contained workflow loaded when its trigger matches. The catalog includes delegation and goal loops, browser and research workflows, skill distribution and context-file authoring, interviewing and teaching, and host/server/security setup. Some entries can schedule agents, launch tools, modify machine or server state, write GitHub content, or enforce shell-command guards, so compatibility must be reviewed skill-by-skill.

## File map

- `README.md` — purpose and five-category inventory.
- `skills/agent-orchestration/` — scheduling, subagents, delegation, goal loops, handoff, and deep engineering workflows.
- `skills/skill-authoring/` — effective skills, distribution, folder context, and GitHub publishing.
- `skills/research-and-web/` — browser harness, deep research/API work, shopping, web search, prompts, and YouTube transcripts.
- `skills/thinking-and-docs/` — idea-to-docs, learning, prompting, ADR reading, reminders, concise output, and teaching.
- `skills/ops-and-setup/` — anti-sleep, database roles, cyber audit, guardrails, safe browsing, custom models, setup, and VPS management.
- `hooks/` — dangerous-pattern inventory plus deny/test shell hooks.
- `LICENSE` — MIT terms.

## Entry points

- Read `README.md`, then the selected category and its `SKILL.md` directly.
- No canonical cross-host installer is documented in the repository README.
- Review `hooks/dangerous-patterns.txt` and `hooks/deny-dangerous.sh` before considering any hook use.

## Dependencies

- Dependencies vary by selected skill and can include Codex subagents, cmux, browsers, research APIs, Google Safe Browsing, GitHub, databases, custom models, and VPS access.
- Shell hooks assume a Unix-like shell and are not automatically portable to Nexus's Windows environment.

## Plan

### To use / integrate

1. Keep the catalog review-first under Operations, Engineering, and Research.
2. Select only a named skill after checking its commands, dependencies, external writes, and platform assumptions.
3. Prefer existing Nexus orchestration, research, security, and handoff seams over importing parallel systems.
4. Translate a selected workflow into a bounded ChatGPT brief or authorized app; normal chat cannot execute local hooks or server operations.

### To extend / modify

1. Adapt useful workflow ideas into existing Nexus contracts and validators, never by bulk copying the catalog.
2. Exclude automatic self-scheduling, anti-sleep mutation, and unsupervised machine/server changes from the Company Map intake.
3. Rebuild any useful shell guard as a cross-platform Nexus-owned check with fixtures rather than installing upstream hooks.
4. Keep skill publication and GitHub writes operator-controlled.

## Open questions

- Which named catalog skills Mario actually wants to activate after review.
- Whether the dangerous-command guard patterns add anything beyond current Nexus security and release gates.
