# Matt Pocock Engineering Flows

## Outcome

Adapt the current feasible `mattpocock/skills` portfolio into explicit Nexus orchestration entrypoints and reusable engineering disciplines while preserving project authority, local-first defaults, and the production-engineering workflows already shipped.

## Source truth

- Primary source: `https://github.com/mattpocock/skills`
- Current reviewed shape: 22 skills split into 13 user-invoked orchestrators and 9 model-invoked disciplines.
- License: MIT.
- The previous 20-capability matrix predates `ask-matt`, `grilling`, and `resolving-merge-conflicts` and must be refreshed.

## Existing Nexus seams

- `docs/ideas/skills/production-engineering/` owns complete reusable review, TDD, diagnosis, source research, interface design, and interview disciplines.
- `docs/ideas/skills/` is tracked and scanned by the Nexus hidden-channel and dependency gate.
- `AGENTS.md`, `SECOND_BRAIN.md`, `tasks/todo.md`, `specs/features/`, and generated handoff files are the existing context, task, spec, and continuity authorities.
- Local Git and repository-owned verification remain authoritative for implementation and history.

## Contract

1. Represent the 13 user-invoked flows as explicit project skills with `policy.allow_implicit_invocation: false`.
2. Add project-owned reusable skills only for the three real gaps: bounded throwaway prototypes, domain-language modeling, and intent-preserving merge-conflict resolution.
3. Reuse the complete production-engineering interview, diagnosis, primary-source research, TDD, interface-design, and two-axis review disciplines through acyclic references.
4. Keep local files as the default issue/task and documentation substrate; external issue, PR, or tracker writes require an available connector plus explicit operator authorization.
5. Preserve human-owned context: propose glossary or ADR changes and write only when the current request authorizes the destination.
6. Keep prototypes disposable and outside production imports; retain findings, not prototype code.
7. Resolve merge conflicts hunk by hunk from both sides' intent, but never stage, continue, commit, abort, or rewrite history without the current request's authority.
8. Validate exact inventory, invocation policy, metadata, composition graph, source parity, and canonical verification.

## Benefits

- Gives operators memorable entrypoints for alignment, specs, tickets, implementation, triage, architecture improvement, teaching, and handoff.
- Separates explicit orchestration from automatically applicable engineering discipline, reducing accidental workflow activation.
- Reuses one tested Nexus source of truth for TDD, review, research, and debugging instead of maintaining near-duplicate prompts.
- Supports local work fully while keeping issue trackers and remote writes optional and approval-gated.

## Verification

- Focused inventory, invocation-policy, metadata, and dependency validator.
- Skill-creator validation for all new skills.
- Hidden-channel, dependency-graph, source-parity, script-reachability, instruction, docs, publication, and RPG-retirement checks.
- TypeScript and lint.
- Exact staged-scope canonical isolated verification.
- Handoff write/check, diff audit, and isolated commit.
