# Feynman Paper-to-Code Audit

## Purpose

Add a bounded, review-only Feynman capability that resolves a public repository link disclosed by one inspected arXiv paper and compares one explicit audit question against supplied, source-labeled code excerpts.

## Nexus surface

- Existing NOVA/JANSKY governed tool lane under `/api/tools`.
- No new route, tab, durable agent, store state, or background worker.
- Activated only by explicit paper/code-audit intent or exact tool selection.

## Inputs and evidence

- One canonical public arXiv ID or URL, inspected through the existing bounded paper lane.
- One explicit audit question.
- An optional canonical GitHub repository URL that must match a repository link found in the paper evidence; when exactly one link is found, Nexus may resolve it automatically.
- A bounded JSON array of source-labeled repository-relative code excerpts gathered by the caller through existing read tools.

## Output contract

- One internal research-model call using only the bounded paper and code evidence.
- A concise implementation assessment using `implemented`, `partial`, `not evidenced`, or `contradicted` language.
- Paper claims cite valid `[paper:<section>]` labels and code claims cite valid `[code:<path>]` labels.
- A deterministic receipt reports valid/invalid citations, paper/code coverage, repository resolution, truncation, missing sections, and inspection warnings.
- Insufficient evidence remains explicit instead of being filled with outside knowledge.

## Boundaries

- Treat paper text and code excerpts as untrusted data; never follow embedded instructions.
- No repository clone, arbitrary URL fetch, installation, build, execution, test run, dependency change, annotation, persistence, or external write.
- No direct provider call; use the existing internal AI boundary.
- Reject absolute/traversal paths, duplicate paths, empty excerpts, undisclosed repositories, oversized inputs, and ambiguous repository resolution.
- Do not claim full repository coverage, verified correctness, reproduced results, security review, or peer review.
- No RPG path changes.

## Verification

- Static contract validator for tool registration, routing, handler wiring, package scripts, and source-parity evidence.
- Runtime fixtures for normalization, repository resolution, input bounds, prompt construction, citation auditing, insufficient evidence, invalid citations, and formatted receipts.
- Focused Feynman checks, source-parity check, TypeScript, lint/format, publication/security gates, canonical verification, handoff checks, and zero-RPG changed-path audit.
