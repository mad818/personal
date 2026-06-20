# FEYNMAN-PAPER-CODE-AUDIT

## Objective

Implement the Feynman paper-code-audit source-parity row with bounded, public, read-only
GitHub repository inspection aligned to paper abstract claims.

## Runtime Contract

- Expose one protected networked `paper_code_audit` tool with a single `reference` input.
- Accept a normalized arxiv abstract URL or bare arxiv ID as a paper reference.
- Resolve the paper's public GitHub repository from `githubUrl` in paper metadata or
  extracted code references in the abstract.
- Fetch a bounded README (≤ 4,000 chars) from the resolved repository via raw.githubusercontent.com.
- Fetch the repository file tree via the GitHub Trees API (no auth, ≤ 500 entries).
- Select up to 3 claim-aligned files by scoring tree paths against extracted abstract claim terms.
- Fetch up to 3 claim-aligned file snippets (≤ 1,500 chars each).
- Compare paper abstract claim terms against code evidence (README + snippets) — structured
  diff report with confirmed / readme-only / absent verdicts. No AI used in lib.
- Format audit evidence as a structured receipt for use in Feynman audit and replicate workflows.
- Automatically add one normalized paper code audit receipt to Feynman evidence when the
  research topic is an audit or replicate workflow with a valid arxiv or DOI URL and a
  resolvable public GitHub repository.
- Preserve partial failures as warnings rather than cancelling successful evidence.

## Bounded Defaults

- Public unauthenticated GitHub raw content and Trees API only.
- Maximum README length: 4,000 characters.
- Maximum snippet length per file: 1,500 characters.
- Maximum snippet files: 3.
- Maximum tree entries scanned: 500.
- Maximum formatted audit receipt: 14,000 characters.
- Maximum abstract claim terms: 12.
- Timeout: 12,000 ms.

## Guardrails

- Public repos only. No GitHub authentication, tokens, or private repo access.
- No code execution, no repository cloning, no binary downloads.
- Reject topics without a resolvable paper reference or public GitHub URL.
- Try/catch on all fetches; network failures return warnings, not hard errors.
- No new provider, dependency, paid-API access, or ARPG change.
- Only runs automatically for audit and replicate Feynman workflows.
- No AI in lib — claim extraction and evidence matching are deterministic string operations.

## Verification

- `npm run feynman:paper-code-audit:check`
- `npm run feynman:check`
- `npm run source:parity:check`
- `npm run type-check`
- `npm run verify`
