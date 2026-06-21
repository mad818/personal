# Nexus Ideas Assimilation Wave 2

Status: active execution map  
Date: 2026-06-20

This plan maps the incomplete GitHub/X ideas into a full shipping queue without reopening already complete source-parity work.

## Baseline

- Completed parity matrices: 13 (`docs/ideas/source-parity/*.json` all `complete`).
- Remaining operational closure: Dependabot dismiss/rescan, CP2.4 live gate, code signing.
- Remaining assimilation gap: external ideas mapped in docs but not yet represented as parity matrices and bounded feature slices.

## Waves

### Wave 0: unblock execution

1. Merge current branch to `main`.
2. Close Dependabot UI actions (`glib` dismiss, `js-yaml` rescan).
3. Run live `cp2:local:launch-gate` with managed runtime and token.
4. Keep `docs/ideas/assimilation-intake-queue.json` as canonical machine queue.

### Wave 1: agent platform depth

- AP-1 correction memory provenance and promotion UX.
- AP-2 experiment variant keep/reject UX around eval harness.
- AP-3 privacy shield receipts in operator-facing surfaces.
- AP-4 optional Docker sandbox adapter with fail-closed policy.
- AP-5 dynamic context assembly depth and stricter per-agent pruning.
- AP-6 read/execute/reflect/write memory cycle with approval on write-back.

### Wave 2: OSINT and CYBER depth

- AI exposure review packs from `ai_osint` + `agentshield` patterns.
- CYBER kill-chain labels from exploitation-course methodology.
- Governance vocabulary from OWASP/APTS.
- Additional bounded RECON enrichment where free passive APIs fit.

### Wave 3: research and RAG depth

- LightRAG routing and entity-aware confidence handling.
- Hugging Face papers/research methodology slice.
- Repo assimilation adopt/adapt/reject evidence briefs.

### Wave 4: OPS and GEO

- COMMAND network health lane (`homelable` pattern).
- `/api/geo-scan` sidecar/proxy (`GeoDeep` pattern).
- H3/density and dual-view map enrichments.

### Wave 5: VAULT artifacts

- Optional local artifact type classification (`magika`).
- Retrieval ranking and tagging upgrades.

### Wave 6: missions and MCP

- Bounded background missions with explicit approval/expiry.
- Optional external MCP bridge patterns (`mcporter`) after mission controls.

### Wave 7: design and UX

- `DESIGN.md` token cleanup and dead token resolution.
- Taste contract pass over high-visibility routes.

### Wave 8: GA runtime proof

- Runtime validators per route hardening spec, wired through `ga:surfaces:check`.

## Required output per source tranche

1. Add or update one `docs/ideas/source-parity/<slug>.json`.
2. Add a focused feature spec for behavior-heavy slices.
3. Implement smallest safe slice in current seams.
4. Add/extend runtime validator where behavior is added.
5. Pass `npm run source:parity:check` and `npm run verify`.
