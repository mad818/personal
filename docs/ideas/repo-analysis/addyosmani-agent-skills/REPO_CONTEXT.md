# REPO_CONTEXT.md

## What this is

`addyosmani/agent-skills` is an MIT-licensed pack of production-engineering
workflows for AI coding agents. Its current `main` README advertises 24 skills:
23 lifecycle skills across define, plan, build, verify, review, and ship plus
one routing meta-skill.

This was a strategic remote review of the current README, license, Codex
plugin manifest, skill-anatomy guide, meta-skill, and representative review,
test, performance, and documentation workflows. The local shell could not
reach GitHub over port 443, so no clone or exhaustive source audit is claimed.

## Stack

- Markdown `SKILL.md` workflow definitions.
- YAML-compatible skill frontmatter and per-host plugin metadata.
- Optional scripts and reference checklists.
- Host adapters for Codex, Claude Code, Cursor, Gemini, OpenCode, Copilot, and
  other agent environments.

## How it works

The meta-skill classifies a development task, selects one or more lifecycle
skills, and runs their ordered processes. Each skill uses trigger metadata,
workflow steps, guardrails, common failure patterns, and evidence-based exit
criteria. Host-specific manifests expose the same Markdown workflows without
making one host's configuration authoritative everywhere.

## File map

- `README.md` - current 24-skill inventory, lifecycle map, setup, and design
  principles.
- `.codex-plugin/plugin.json` - Codex plugin identity and skill-root metadata.
- `skills/using-agent-skills/SKILL.md` - lifecycle router and shared operating
  behavior.
- `skills/*/SKILL.md` - one on-demand workflow per engineering concern.
- `docs/skill-anatomy.md` - required metadata and recommended workflow anatomy.
- `references/` - shared verification and quality checklists.
- `agents/` and host configuration folders - optional personas and adapters.
- `LICENSE` - MIT license.

## Entry points

- Start with `README.md` for inventory and lifecycle shape.
- Use `skills/using-agent-skills/SKILL.md` for routing.
- Read only the selected `skills/<name>/SKILL.md` workflows after routing.
- Use `.codex-plugin/plugin.json` when installing the upstream pack as a Codex
  plugin; Nexus does not need that installation path.

## Dependencies

The core capability is Markdown procedure rather than a runtime library.
Optional host tooling, scripts, personas, and shared references expand the
upstream distribution but are not required for the bounded Nexus adaptation.

## Plan

### To use / integrate

1. Keep the workflows tracked inside Nexus rather than installing a mutable
   global plugin.
2. Represent the exact current 24-skill inventory in
   `docs/ideas/skills/production-engineering/`.
3. Adapt each workflow to Nexus paths, commands, privacy rules, and authority
   boundaries.
4. Route future work through the meta-skill from `AGENTS.md`.
5. Validate frontmatter, UI metadata, workflow sections, dependency graph, and
   source parity in canonical verification.

### To extend / modify

- Add a lifecycle skill only when it has a distinct trigger and evidence
  contract.
- Keep frontmatter to `name` and `description`.
- Put authority boundaries, ordered workflow, stop conditions, and
  verification in every skill.
- Keep cross-skill dependencies centralized in the meta-skill so the graph
  remains acyclic.
- Update the exact-inventory validator and source-parity matrix together.

## Open questions

None for the bounded project-native adaptation. Upstream host hooks, personas,
slash-command adapters, and installer behavior are distribution features, not
missing Nexus engineering workflows.
