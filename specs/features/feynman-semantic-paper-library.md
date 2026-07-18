# Feynman Semantic Paper Library

## Outcome

Add a protected VAULT workbench that turns explicitly selected public arXiv papers into a bounded local library with persistent annotations and local vector retrieval, without making an AI/chat call.

## Surface

- Route: existing protected `/vault` surface, Archive chamber, `Papers` lane.
- API: protected local reads/annotations at `/api/feynman/papers` and connector-governed public arXiv import at `/api/feynman/papers/import`.
- Storage: ignored local file under `.nexus/`; no paper or annotation content is committed.

## Inputs and data flow

1. The operator supplies one canonical public arXiv ID or URL.
2. The existing bounded Feynman paper inspector reads public metadata and selected section excerpts.
3. Nexus stores the bounded paper record locally and attempts to index title, metadata, excerpts, tags, and annotation through the existing loopback TurboVec client.
4. Search uses the existing local vector service when it returns matches. The UI identifies this as local vector retrieval and reports the configured embedding posture; it does not claim every fallback is semantic.
5. If the optional local vector runtime is disabled or unavailable, search falls back to deterministic local keyword ranking and labels that fallback honestly.
6. Annotation edits persist locally and reindex the paper when the optional vector runtime is available.

## State and limits

- At most 160 papers.
- One operator-authored annotation per paper, bounded to 4,000 characters.
- At most 16 normalized tags per paper, each bounded to 40 characters.
- Search query bounded to 240 characters and results bounded to 40.
- Paper content is limited to the existing inspected sections and their existing excerpt caps.
- Re-indexing an existing arXiv ID updates public evidence while preserving its local annotation and tags.

## Privacy and usage boundaries

- No `callAI()`, internal AI call, provider fallback, ChatGPT request, model synthesis, background loop, recurring watch, or paid service.
- Ollama is used only by the existing loopback embedding service when configured; deterministic local vector and keyword fallbacks remain available.
- The workbench communicates directly with the protected local API, so annotation text is not returned through an agent tool or sent to an external model.
- No arbitrary URL, private paper, credential, repository clone, binary/PDF download, code execution, install, external write, or public route.
- No RPG path or feature change.

## UX states

- Empty: explain how to add the first public arXiv paper.
- Indexing: disable duplicate submission and show bounded public inspection status.
- Search: show the retrieval mode beside results.
- Optional runtime unavailable: continue with keyword fallback and show local-vector setup posture without treating it as an error.
- Failed public inspection or local write: show a concise retryable error and preserve the existing library.
- Annotation save: persist locally, refresh the selected record, and report whether vector re-indexing succeeded.

## Verification

- Pure/runtime fixtures cover reference normalization, bounds, duplicate re-index preservation, annotation persistence, vector result ordering, keyword fallback, and error cases.
- Static validation proves the protected route, VAULT lane, no-AI boundary, local ignored storage, package scripts, source-parity proof, and canonical verify wiring.
- Required gates: focused feature check, Feynman chain, source parity, TypeScript, lint, canonical `npm run verify`, handoff freshness, `git diff --check`, and a zero-RPG changed-path audit.
