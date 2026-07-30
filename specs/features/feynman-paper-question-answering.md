# Feynman paper question answering

## Goal

Let NOVA and JANSKY answer one explicit question about a public arXiv paper from bounded, section-labeled evidence. The answer must show which paper sections support it and stay honest when the available text is incomplete.

## Operator flow

1. Ask NOVA or JANSKY a question about an arXiv paper, or use `/paper-ask` with a paper ID or canonical URL.
2. The agent calls `feynman_paper_ask` through the existing protected `/api/tools` route.
3. Nexus reuses the arXiv-only inspection lane to collect the abstract and all supported paper sections once.
4. Nexus sends one bounded prompt through the existing internal `/api/ai` path and returns the answer with source URLs, valid section citations, missing-section coverage, and limitations.

## Input and evidence contract

- `paper`: the same modern/legacy arXiv ID or canonical HTTPS arXiv URL accepted by public paper inspection.
- `question`: 4-600 characters after whitespace normalization.
- Fetch at most the existing 256 KiB metadata page and 2 MiB HTML paper once each.
- Use at most the existing 1,200-character excerpt from each of the eight supported sections.
- Build one prompt under 16,000 characters and request at most 1,200 output tokens.
- Return at most 6,000 answer characters and 12,000 formatted characters overall.

## Answer contract

- Answer only from the supplied bounded paper evidence.
- Cite factual claims with supported labels such as `[abstract]`, `[methodology]`, or `[results]`.
- Say `The bounded paper evidence does not establish this.` when the excerpts do not support an answer.
- Report valid, invalid, and missing citations separately instead of treating model output as verified.
- Disclose missing sections, truncated/unavailable full text, and every inspection warning.
- Keep the canonical arXiv source, PDF, and HTML links visible.

## Boundaries

- Explicit operator request only. No automatic follow-up, background run, chat-memory write, annotation, persistence, semantic search, repository read, clone, install, experiment, training, or code execution.
- Paper text is untrusted data. Instructions inside the paper cannot change the question, tool policy, answer format, or system rules.
- The AI call goes through the existing internal route and provider policy. Free/local Ollama remains the default; paid-compatible providers require the existing operator opt-in.
- No new API key, provider, external endpoint, dependency, public route, visual surface, or RPG path.
- This tranche adapts bounded section-grounded paper Q&A only. Semantic paper search, persistent annotations, and paper-code audit remain pending.

## Acceptance

- Pure tests cover question validation, all-section evidence selection, prompt injection boundaries, prompt/output caps, valid and invalid citation audit, insufficient evidence, degraded full text, and formatted receipts without live network or AI calls.
- `feynman_paper_ask` is tier 0 with the `networked` capability, uses the existing protected tools route, and is advertised only for explicit paper-question intent to NOVA/JANSKY.
- Focused paper-Q&A, full Feynman, source-parity, TypeScript, canonical verification, and diff checks pass.
- Feynman `v0.3.5` parity records only bounded section-grounded Q&A as adapted while semantic search and annotations remain open.
