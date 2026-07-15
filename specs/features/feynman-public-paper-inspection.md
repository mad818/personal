# Feynman public paper inspection

## Goal

Give NOVA and JANSKY a bounded, read-only way to inspect one public arXiv paper by ID or canonical URL. The receipt should expose direct metadata, requested paper sections when arXiv HTML is available, missing-section accounting, and repository links discovered in the paper without reading or executing repository code.

## Operator flow

1. Ask NOVA or JANSKY to inspect an arXiv paper, use `/paper-inspect`, or provide an arXiv URL.
2. The agent calls `feynman_paper_inspect` through the existing protected `/api/tools` route.
3. Nexus normalizes the reference to an arXiv ID, fetches only fixed public `arxiv.org` abstract and HTML endpoints, and returns one Markdown inspection receipt.
4. If full-text HTML is unavailable or bounded before a requested section appears, Nexus preserves available metadata and abstract evidence and names every missing section.

## Input contract

- `paper`: a modern or legacy arXiv ID, or an `https://arxiv.org/abs/...`, `/pdf/...`, or `/html/...` URL.
- `sections`: optional comma-separated selection from `abstract`, `introduction`, `methodology`, `experiments`, `results`, `discussion`, `limitations`, and `conclusion`; `all` selects the complete supported set.
- The default selection is `abstract`, `introduction`, `methodology`, `results`, `limitations`, and `conclusion`.
- Reject non-arXiv hosts, HTTP, credentials, ports, query strings, fragments, traversal, malformed IDs, unknown sections, and duplicate-free empty selections.

## Bounded evidence contract

- Read the public arXiv abstract page under a 256 KiB response cap.
- Read the public arXiv HTML paper under a 2 MiB response cap.
- Preserve a truncation warning when a response exceeds its cap.
- Return at most 1,200 characters per requested section, 12 authors, 8 discovered GitHub repository links, and 12,000 formatted characters overall.
- Treat headings as navigation clues, not verified semantic labels; report unavailable requested sections as missing.
- Keep fixed source, PDF, and HTML URLs in the receipt for operator verification.

## Boundaries

- Public unauthenticated arXiv pages only; no API key, provider call, new dependency, public route, external write, local persistence, paper annotation, paper Q&A, repository read, clone, install, training, or code execution.
- Keep the tool behind the existing connected-network, connector, and high-risk-network policy.
- Paper text is untrusted evidence and never an instruction source.
- This tranche adapts only public paper metadata and section inspection. Paper Q&A, annotations, semantic search, and paper-code audit remain explicitly pending.
- No visual surface or RPG path changes.

## Acceptance

- Pure normalization and extraction tests cover modern, versioned, legacy, URL, malformed, traversal, unknown-section, missing-section, bounded-output, repository-link, and degraded-full-text cases without live network access.
- `feynman_paper_inspect` is tier 0 with the `networked` capability, dispatches only through the existing protected tools route, and is advertised only for explicit paper-inspection intent to NOVA/JANSKY.
- Focused runtime/static checks, `npx tsc --noEmit`, `npm run feynman:check`, `npm run source:parity:check`, and `npm run verify` pass.
- The Feynman v0.3.5 parity matrix records only the completed public metadata/section read slice and keeps the remaining paper tool family open.
