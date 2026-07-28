# REPO_CONTEXT.md

## Repository Thesis

`pbakaus/impeccable` is an Apache-2.0 design-language and tooling repository for
AI coding harnesses. Its 23-command vocabulary separates design shaping,
critique, technical audit, hardening, polish, motion, typography, layout, and
performance. Nexus benefits from that phased vocabulary, not another design
system or hook installer.

## Repository Shape

- The current `main` README describes one routed skill, deterministic detector
  rules, an LLM critique layer, a CLI, browser extension, provider builds,
  hooks, and project design-context generation.
- Install paths support several hosts including Codex, Claude, Cursor, Gemini,
  and others, with project/global and submodule options.
- Initialization can write `PRODUCT.md` and `DESIGN.md`; Nexus already owns
  those authority files and must not overwrite them.

## Execution Model

Commands such as `shape`, `critique`, `audit`, `harden`, `polish`, and `animate`
operate on a target surface after reading product/design context. The CLI and
extension can run deterministic UI detectors without an API key, while hooks
and provider builds mutate host configuration.

## Nexus Adaptation

The existing `frontend-ui-engineering` workflow now uses the phased
shape/critique/harden/polish contract while keeping `DESIGN.md`,
`docs/NEXUS_TASTE_CONTRACT.md`, current shell primitives, accessibility, and
runtime evidence authoritative. No external style pack, generated design file,
hook, or detector runtime was installed.

## Quality Signals and Risks

The project has an explicit license, cross-host packaging, and deterministic
checks. Its broad aesthetic opinions can conflict with a mature product, and
its initializer can overwrite authority. Nexus adopts workflow vocabulary only
and requires source-specific visual judgment. Reviewed 2026-07-27.
