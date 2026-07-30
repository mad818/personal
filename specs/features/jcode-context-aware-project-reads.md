# jcode Context-Aware Project Reads

## Problem

The local `read_project_file` tool returns complete small files but truncates
large files at the first 60,000 characters. That makes later declarations
invisible and can waste the model context window on unrelated leading code.
The `1jehuang/jcode` source-parity inventory identifies context-window-aware
code chunking as a useful remaining pattern.

## Scope

- Preserve the current exact full-content response for files within the
  response budget.
- Split larger files into deterministic bounded chunks, preferring code
  declarations, CSS selectors, Markdown headings, and structured top-level
  boundaries over arbitrary character cuts.
- Add optional `focus` and 1-based `chunk` inputs to `read_project_file`.
- Return a compact manifest with stable chunk numbers, line ranges, character
  counts, and boundary labels plus at most the existing total response budget.
- Rank chunks locally from bounded focus tokens or return the leading bounded
  semantic context when no selector is supplied.
- Keep each selected chunk's source text exact so a later proposed edit can use
  exact current content.
- Record the already-live inline before/after diff and Approve/Reject controls as
  implementation proof for the remaining jcode parity row.

## Boundary

The helper operates only after the existing project-path, file-extension, and
sensitive-local-data checks pass. It reads the same local file once and performs
deterministic in-process selection. It does not fetch a repository, clone,
upload source, create embeddings, call an AI provider, persist file content,
edit code, change the existing edit approval/auto-apply policy, add a route or
tab, or change phone/PWA behavior.

`focus` is a plain single-line hint capped at 200 characters. `chunk` is a
strict 1-based integer that must exist in the generated manifest. Exact chunk
selection takes precedence over focus ranking. Cache keys include the bounded
selector, while existing path-prefix eviction clears every selector after a
project write.

## Acceptance

- Small-file output remains byte-for-byte unchanged.
- Large-file chunks reconstruct the original text exactly and respect the
  per-chunk and total response budgets.
- Runtime fixtures prove semantic boundaries, later-file focus retrieval,
  explicit chunk selection, CRLF preservation, stable metadata, and invalid
  selector rejection.
- Static proof locks the protected route integration, tool schema, cache
  selector/eviction behavior, ProposedEditPanel reachability, source parity, and
  canonical verification wiring.
- Focused checks, source parity, TypeScript, lint, formatting, publication
  safety, handoff freshness, diff checks, and isolated canonical verification
  pass without staging unrelated redesign files.
