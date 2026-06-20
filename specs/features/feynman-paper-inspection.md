# FEYNMAN-PAPER-INSPECTION

## Objective

Complete the Feynman paper-search-read-ask-annotate-code source-parity row with bounded, public, read-only arxiv and DOI paper inspection.

## Runtime Contract

- Expose one protected networked `paper_inspect` tool with `search`, `read`, and `annotate` actions.
- Accept a normalized arxiv abstract URL, arxiv abs-path, or DOI URL as a paper reference.
- Search papers via the arxiv export API (Atom XML) with a bounded maximum result count.
- Fetch paper metadata: title, authors, abstract, arxiv ID, and optional GitHub link extracted from the abstract.
- Read paper sections: abstract always included; full = abstract plus comments from metadata only (bounded).
- Format paper inspection evidence as a structured receipt for use in Feynman research workflows.
- Extract GitHub repository URLs from abstract and metadata for downstream code inspection.
- Automatically add one normalized paper inspection receipt to Feynman evidence when the research topic includes a valid arxiv or DOI URL.
- Preserve partial failures as warnings rather than cancelling successful evidence.

## Bounded Defaults

- Public unauthenticated arxiv export API only. No Semantic Scholar, CrossRef, or paid index.
- Maximum arxiv search results: 10.
- Maximum authors shown: 8.
- Maximum abstract length in receipt: 1,200 characters.
- Maximum full-section length: 3,000 characters.
- Maximum formatted evidence receipt: 12,000 characters.
- Maximum code references extracted: 5.
- Timeout: 10,000 ms.

## Guardrails

- No authentication, paid APIs, or privileged API keys.
- No PDF download, full-text fetch, remote code execution, or repository clone.
- Reject non-arxiv, non-DOI references and credential-bearing URLs.
- Try/catch on all fetches; network failures return warnings, not hard errors.
- No new provider, dependency, route, visual surface, or ARPG change.
- `annotate` action is a pure function — returns an annotation envelope for session storage only; no disk write.

## Verification

- `npm run feynman:paper:check`
- `npm run feynman:check`
- `npm run source:parity:check`
- `npm run type-check`
- `npm run verify`
