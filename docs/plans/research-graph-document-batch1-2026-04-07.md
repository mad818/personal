# Research / Graph / Document Assimilation — Batch 1

## Why this batch exists

Recent upstream references point in the same direction:

- `autoresearch` style structured research loops
- `graphify` / Trellis style graphable knowledge artifacts
- `GLM-OCR` style document-heavy intake and extraction readiness

Nexus should not import those projects wholesale. The right move is to absorb the best ideas into the existing local-first memory spine and VAULT workflows.

## Product thesis

Compiled memory pages should become:

1. easier to trust
2. easier to compare
3. easier to connect into future graph/retrieval layers
4. safer by default for sensitive or restricted material

## Batch 1 scope

### RGD1 — Derived research signals on compiled pages

Add local-only derived metadata for compiled memory pages:

- source count
- citation cue count
- document hints
- section structure
- referenced domains
- coarse structure posture: `light`, `structured`, `document_heavy`

Security rule:
- restricted pages keep sensitive signal details withheld from shared surfaces by default

### RGD2 — VAULT compiled-page trust surface

Surface those derived signals directly in the VAULT compiled memory panel so operators can assess:

- whether a page is likely evidence-backed
- whether it looks document-heavy or lightweight
- whether it appears to rely on multiple sources
- whether it has recognizable structure before opening it

### RGD3 — Backward compatibility

Older compiled pages on disk should be normalized on read so the new contract does not break existing stored artifacts.

## Next likely batches

### RGD4 — OCR-ready document intake posture

Add local document-ingest metadata and operator review flow:

- document source kind
- extraction readiness
- OCR-candidate posture
- file-origin labeling

Do not add paid OCR or external upload requirements.

### RGD5 — Graph-ready memory links

Use the richer compiled-page signals to improve graph edges:

- domain overlap
- referenced-domain overlap
- structure similarity
- workflow lineage edges

### RGD6 — Optional local OCR sidecar evaluation

Only after the above is stable:

- evaluate loopback-only OCR sidecars
- keep Nexus-native storage and policy boundaries
- never auto-sync restricted material out of Nexus

## Success criteria

- compiled memory pages carry richer research metadata
- restricted pages remain protected
- VAULT shows trust/structure cues without opening every page
- older stored pages remain readable
- no new paid dependency or backend requirement is introduced
