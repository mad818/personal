# Warp-Inspired Command Palette

## Problem

Nexus has a reachable global CommandBar with route actions and assistant input,
but its commands are exposed as fixed chips. The final useful
`warpdotdev/warp` parity item remains pending because operators cannot open one
keyboard-first search surface, fuzzy-match the available Nexus destinations,
preview a result, and execute it without knowing where the action lives.

## Source correction

The current public repository uses `master`, not the stale `main` ref in the
old matrix. Its README describes a broader agentic development environment.
The UI crates are MIT and the rest of the repository is AGPL-3.0. The current
Warp documentation is the primary evidence for command-palette behavior:

- global keyboard access;
- search across available actions;
- fuzzy, relevance-ranked results;
- keyboard selection and execution;
- visible descriptions that explain a result before activation.

Nexus copies no Warp code, Rust UI framework, terminal behavior, assets,
styles, or product text.

## Scope

- Add one typed project-owned registry for existing Nexus navigation commands.
- Add deterministic local fuzzy ranking with stable tie-breaking and a bounded
  result count.
- Add a command-palette panel inside the existing reachable CommandBar.
- Open it from a visible `PALETTE` action or `Ctrl+Shift+P` on
  Windows/Linux and `Cmd+P` on macOS.
- Support search, an empty-query default order, Arrow Up/Down, Home/End, Enter,
  Escape, mouse selection, and a visible selected-command preview.
- Announce result counts and no-result state, expose combobox/listbox/option
  semantics, and restore focus when the palette closes.
- Route through existing Next navigation and `setTab()` behavior only.
- Add static/runtime/accessibility proof, corrected source parity,
  repo-analysis artifacts, benefits, canonical verification, and a production
  build.

## Boundary

This is command discovery, not a terminal or shell launcher. Every registered
command is a fixed local Nexus route. The palette cannot accept a command,
URL, file path, provider call, tool call, arbitrary callback, or external
action from query text. It adds no dependency, network request, persistence,
analytics, model call, global history index, workflow-sharing system, game,
or phone/PWA behavior.

The existing assistant input remains the natural-language command surface.
The palette never submits its query to an AI provider and never mutates the
CommandBar chat history.

## Acceptance

- The registry contains unique fixed IDs and safe same-origin route targets.
- Exact, prefix, token, and subsequence fixtures produce deterministic ranking.
- Empty queries preserve declared priority; limits are bounded; unmatched
  queries return no fabricated result.
- The UI exposes search, result count, selected preview, keyboard movement,
  direct activation, no-results feedback, close behavior, and focus return.
- `Ctrl+Shift+P` and `Cmd+P` open the existing CommandBar and palette without
  adding another root overlay or route.
- Static proof rejects dynamic command creation, network/provider use, unsafe
  hrefs, and missing source-parity/repo-analysis/package wiring.
- TypeScript, lint, formatting, shell/interactive accessibility, source
  parity, component reachability, canonical verification, and a production
  build pass without touching the unrelated redesign, phone/PWA, or game
  files.
