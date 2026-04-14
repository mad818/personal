# Research / Graph / Document Assimilation — Batch 3

## Goal

Improve the VAULT knowledge graph by including compiled memory pages in a secure, local-only way, so document-heavy and workflow-generated knowledge connects to saved clips without widening sensitive exposure.

## Scope

### RGD5 — Graph-ready compiled memory inclusion

- fetch compiled memory page summaries through the existing protected local route
- merge compiled page nodes into the VAULT graph alongside saved articles
- keep the graph client-side and local-only

### RGD5.a — Safe node mapping

- map compiled pages into existing `VaultItemMetadata` without inventing a new public graph contract
- derive node type/source heuristics from source, structure, and document metadata
- provide TLDRs from compiled summaries for later index reuse

### RGD5.b — Restricted-surface protection

- restricted compiled pages should still appear as durable nodes
- restricted pages must not contribute rich edge text, document details, or tag-heavy linking material
- graph synthesis should rely only on already-safe summary fields for `safe` / `internal` pages

### RGD5.c — Operator freshness

- refresh compiled-page graph input on the same local `nexus-memory-pages-updated` event used by the compiled-page panel
- rebuild lint/graph automatically when saved articles or compiled pages change

## Success criteria

- compiled pages appear in the VAULT graph without any backend or cloud dependency
- safe/internal pages improve graph connectivity using sanitized summary metadata
- restricted pages remain represented but do not leak extra details through graph edges
- `type-check`, `verify`, and `handoff:write` all pass after the change
