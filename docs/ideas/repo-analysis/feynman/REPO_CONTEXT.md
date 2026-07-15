# REPO_CONTEXT.md

## What this is

Feynman is a TypeScript scientific-research workbench that combines paper discovery, evidence handling, research workflows, experiment tooling, and a terminal UI. The reviewed upstream version is `v0.3.5`. Its useful Nexus value is the explicit research contract and provenance model, not a wholesale copy of its CLI, credentials, cloud-compute surface, or execution environment.

## Stack

- TypeScript on Node.js 22.19+.
- A command-line interface and Pi-based agent runtime.
- React/Vite terminal and browser workbench surfaces.
- Optional scholarly, model, code-hosting, database, messaging, container, and cloud integrations.

## How it works

The CLI dispatches workflow commands into a research session. Researchers gather evidence; writers synthesize; verifiers check claims and provenance; reviewers decide whether the output is complete enough to advance. Artifacts, notebooks, citations, and session state make the result inspectable. PaperRank is a read-order triage layer: it combines available relevance, citation, graph, methodology, and reproducibility signals while recording missing components.

## File map

- `package.json` — current version, runtime requirements, dependencies, and scripts.
- `src/index.ts` — runtime guard and CLI bootstrap.
- `src/cli.ts` — command registration and top-level dispatch.
- `src/rank/paper-rank.ts` — PaperRank weights, component availability, and score explanation.
- `src/workflows/` — research workflow definitions and orchestration.
- `src/tools/` — external research, code, and experiment integrations.
- `src/ui/` and `src/workbench/` — interactive research surfaces.
- `AGENTS.md` — contributor rules around scientific claims, provenance, validation, and scope.

## Entry points

- Install/run upstream: its documented `feynman` CLI on a supported Node runtime.
- Research: workflow commands such as deep research, literature review, replication, and paper inspection.
- Read-order triage: `feynman rank`.
- Nexus adaptation: HQ workflow commands and protected tools through `/api/tools`; no upstream runtime is required for the adapted deterministic ranking engine.

## Dependencies and boundaries

- Upstream integrations can require provider, scholarly-search, repository, messaging, database, container, and cloud credentials.
- Nexus must not introduce those keys merely to claim parity.
- Upstream experiment and compute features are execution surfaces; they require separate operator approval, isolation, and proof before any future adaptation.
- Feynman remains MIT-licensed upstream, but Nexus adapts concepts through native contracts rather than vendoring the workbench.

## Nexus integration plan

### Use now

1. Preserve the shipped Researcher/Writer/Verifier/Reviewer workflow and provenance model.
2. Add a native deterministic PaperRank engine for already gathered metadata.
3. Expose it through the existing protected tool route and an HQ `Paper rank` workflow.
4. Show the component formula, missing signals, and limitations so the ranking remains auditable.

### Keep pending or excluded

1. Keep paper retrieval, code audit, local replication, isolated experiments, bounded autoresearch, and recurring watches as separate reviewed tranches.
2. Exclude paid cloud-compute parity and broad credential surfaces from Nexus's free/local product contract.
3. Never treat a PaperRank result as peer review, truth, completed replication, or calibrated researcher preference.

## Benefits

- Reduces reading overload with a repeatable first-pass order.
- Makes every ranking component and missing input visible.
- Reuses the research metadata Nexus already collects without another service or key.
- Keeps scientific judgment with the operator while giving NOVA and JANSKY a precise tool contract.

## Open questions

- Whether later ranking should accept an explicit operator preference profile instead of the fixed upstream weights.
- Which approved citation-graph source, if any, should supply graph prestige rather than requiring it as direct input.
- Whether paper retrieval and PaperRank should eventually share one reviewed candidate-bundle artifact.

## Primary evidence

- Repository: https://github.com/companion-inc/feynman
- Reviewed release: https://github.com/companion-inc/feynman/releases/tag/v0.3.5
- PaperRank implementation: https://github.com/companion-inc/feynman/blob/main/src/rank/paper-rank.ts
- Contributor contract: https://github.com/companion-inc/feynman/blob/main/AGENTS.md
