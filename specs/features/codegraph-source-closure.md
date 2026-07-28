# Code Graph Source Closure

## Outcome

Close the feasible local code-relationship patterns reviewed from CodeGraph and
Graphify inside the existing protected project graph.

## Product behavior

1. Graph requests rebuild from the current TypeScript and JavaScript source
   files, so Nexus does not retain a stale graph database.
2. Every local import edge is marked as extracted source evidence.
3. The graph reports deterministic import-connected communities and
   coupling-ranked central files without a model call.
4. A protected graph request can explain one resolved file and trace a directed
   shortest import path between two resolved files.
5. `npm run codegraph:build` writes local `graph.json`, `GRAPH_REPORT.md`, and a
   searchable `graph.html` under ignored `data/exports/codegraph/`.
6. Unbounded multi-language parsing, automatic private document/media
   ingestion, external assistant installers, instruction rewriting, duplicate
   MCP/database services, and semantic graph providers remain excluded.

## Verification

- `npm run codegraph:source:check`
- `npm run codegraph:source:runtime:check`
- `npm run source:parity:check`
- `npm run type-check`
- focused zero-warning lint

## Benefits

- Operators and agents can inspect real local dependency relationships without
  sending source to a model.
- Provenance makes extracted facts distinguishable from future inference.
- Path and explanation queries reduce broad source reads.
- Portable exports stay local and disposable by default.
