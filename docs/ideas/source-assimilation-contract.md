# Source Assimilation Contract

Nexus treats GitHub repositories and X posts as capability sources, not as loose inspiration snippets.

## Meaning Of Full

An external idea is fully assimilated only when:

1. The primary source has been inspected at a recorded version or date.
2. Its complete useful capability surface has been inventoried.
3. Every capability is implemented, adapted, explicitly excluded, or still marked pending.
4. Implemented and adapted capabilities have acceptance proof.
5. Exclusions identify a real conflict with security, legality, licensing, the free/local invariant, or Nexus's product purpose.
6. No useful pending capability remains.

Command labels, prompts, plans, placeholder UI, and documentation do not prove behavioral parity.

## Reverse-Engineering Workflow

1. Trace an X post to its primary repository, paper, specification, or reproducible behavior.
2. Record source URL, version/date, license, architecture, workflows, tools, persistence, execution paths, and operator controls.
3. Create a matrix under `docs/ideas/source-parity/`.
4. Adapt each useful capability into existing Nexus surfaces and security boundaries.
5. Add focused acceptance proof for every implemented or adapted row.
6. Keep the source `in_progress` until `npm run source:parity:check` accepts a complete matrix.

## Completion Language

- `foundation`: useful core exists, but the source has not been exhaustively inventoried.
- `in_progress`: exhaustive inventory exists and useful capabilities remain pending.
- `complete`: exhaustive inventory has no useful pending rows and every non-excluded row has proof.

This contract supersedes older "partial", "pattern only", or "complete useful slice" language when Nexus is claiming full implementation of a supplied GitHub/X idea.
