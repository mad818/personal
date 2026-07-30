# REPO_CONTEXT.md

## What this is

`mattpocock/skills` is an MIT-licensed collection of small composable
engineering and productivity workflows for coding agents. The current
`main` README lists 22 skills split by invocation authority: 13 explicit
user-invoked orchestrators and 9 model-invoked reusable disciplines.

This was a strategic remote review of the current README, package manifest,
license, router, setup, alignment, prototype, domain-modeling, merge-conflict,
code-review, and skill-writing sources. The local shell still could not reach
GitHub over port 443, so no local clone or exhaustive code audit is claimed.

## Stack

- Markdown `SKILL.md` workflows with YAML-compatible frontmatter.
- Optional sibling Markdown references and templates.
- `skills.sh` cross-host installation and a Claude Code plugin distribution.
- Private npm package metadata used for Changesets-based versioning.

## How it works

User-invoked skills orchestrate a full flow only after the operator selects
them. Model-invoked skills hold smaller disciplines an agent may apply when a
task fits. The `ask-matt` router maps idea, bug, architecture, large-project,
review, handoff, teaching, and research situations to those flows, while setup
records issue-tracker and domain-document conventions for later skills.

## File map

- `README.md` - current inventory, invocation split, lifecycle map, and setup.
- `package.json` - version `1.1.0`, MIT metadata, and Changesets tooling.
- `skills/engineering/ask-matt/SKILL.md` - user-invoked workflow router.
- `skills/engineering/setup-matt-pocock-skills/SKILL.md` - tracker, label, and
  domain-doc convention setup.
- `skills/engineering/grill-with-docs/SKILL.md` - interview plus domain docs.
- `skills/engineering/prototype/SKILL.md` - disposable logic/UI experiments.
- `skills/engineering/domain-modeling/SKILL.md` - glossary and ADR discipline.
- `skills/engineering/code-review/SKILL.md` - separate Standards and Spec axes.
- `skills/engineering/resolving-merge-conflicts/SKILL.md` - intent-based hunk
  resolution.
- `skills/productivity/writing-great-skills/SKILL.md` - invocation and skill
  design vocabulary.
- `LICENSE` - MIT license.

## Entry points

- Start with `README.md` for current inventory and invocation semantics.
- Use `ask-matt` when the operator wants routing.
- Run setup only when tracker or domain-doc conventions are genuinely missing.
- Read the selected user flow and only the reusable disciplines it references.

## Dependencies

Core workflows are Markdown. External issue trackers, `skills.sh`, Claude
plugins, GitHub or GitLab CLIs, subagents, and host-specific commands are
optional distribution or execution dependencies and are not assumed by Nexus.
The historical dependency-cruiser contribution from PR #505 intentionally remains outside the released plugin/router surface
and this adaptation.

## Plan

### To use / integrate

1. Preserve the 13/9 user/model invocation split in project-owned metadata.
2. Add the 13 orchestration entrypoints under a guarded tracked skill root.
3. Add only the three reusable disciplines Nexus actually lacks.
4. Reuse existing complete Nexus interview, diagnosis, research, TDD,
   interface-design, and review workflows for the other six disciplines.
5. Default task and document output to existing local Nexus authorities.
6. Require explicit authorization and available tooling for external writes,
   subagents, Git history changes, or publication.

### To extend / modify

- Keep user-only skills non-implicit in `agents/openai.yaml`.
- Keep the composition graph one-way from orchestrators to disciplines.
- Add a new wrapper only for a distinct operator entrypoint.
- Add a reusable discipline only when an existing Nexus skill does not already
  satisfy the behavior.
- Update the exact validator and parity matrix with every inventory change.

## Open questions

None for the bounded local-first adaptation. No external tracker is selected by
default, and no global skill/plugin install is needed.
