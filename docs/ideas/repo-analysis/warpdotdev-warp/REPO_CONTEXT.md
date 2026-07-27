# REPO_CONTEXT.md

## What this is

`warpdotdev/warp` is the public source repository for Warp, now described by
its maintainers as an agentic development environment born from a terminal.
The current default branch is `master`. The repository is large and
Rust-centered, with terminal, agent, UI, collaboration, and build
infrastructure in one workspace.

This review used the GitHub repository API, current `master` README, repository
tree, and Warp's current command-palette/command-search documentation. The
local shell could not clone GitHub over port 443, so the review stayed remote
and targeted instead of pretending a full local source audit occurred.

## Current source posture

- Repository: `https://github.com/warpdotdev/warp`
- Default branch: `master`
- Current README blob: `228ec9d87f06f2ba619e8b4361bf97081cf16ad5`
- Repository size reported by GitHub: 315,044 KB
- UI framework crates `warpui_core` and `warpui`: MIT
- Remaining repository code: AGPL-3.0
- Primary product docs: `https://docs.warp.dev`

The previous Nexus matrix called the source Apache-2.0 and referenced `main`.
Both claims are stale and must not remain current evidence.

## Stack and architecture

- Rust/Cargo workspace with a large `crates/` tree.
- Application surfaces under `app/`.
- Project-owned UI framework crates under the mixed-license boundary.
- Agent specifications and workflows under `.agents/`, `.claude/`,
  `.warp/`, and `agents/specs/`.
- Command-signature data, scripts, resources, Docker support, and
  cross-platform tooling.
- Warp's product combines terminal interaction, command history, agent
  workflows, collaboration, and UI infrastructure. Nexus does not need or
  want to reproduce that runtime.

## Relevant capability

Warp's current Command Palette is a global action-discovery surface:

1. open from a keyboard shortcut;
2. type to search available actions and workflow-like entries;
3. receive fuzzy, relevance-ranked results;
4. inspect a selected entry's name and description;
5. move through results and activate a selection from the keyboard.

The related Command Search surface spans terminal history and agent history.
That indexing scope is terminal-specific and is not part of the Nexus
adaptation.

## Nexus fit

Nexus already has the correct product seam:

- `components/ui/CommandBar.tsx` is reachable from
  `components/ui/RootLayoutChrome.tsx`;
- the CommandBar already owns global navigation chips, contextual route
  actions, assistant input, keyboard close behavior, and Next navigation;
- `setTab()` and `getTabFromHref()` already preserve Nexus route state.

The missing piece is command discovery, not a new route or a second global
overlay.

## Integration decision

Build a clean-room, project-owned command registry and fuzzy matcher, then
render the palette inside the existing CommandBar.

Accepted behavior:

- fixed same-origin Nexus route commands;
- local deterministic fuzzy ranking;
- visible and keyboard access;
- listbox navigation and selected preview;
- focus restoration and accessible result feedback.

Excluded behavior:

- terminal emulation, shell execution, command history, local file search,
  environment variables, Warp Drive, workflow sharing, agent history,
  external URLs, arbitrary callbacks, or query-driven execution;
- Warp Rust/UI code, assets, product text, styles, or dependencies;
- provider calls, persistence, analytics, phone/PWA work, or games.

## Benefits

- Operators can discover existing Nexus workplanes without memorizing route
  locations.
- Keyboard users can navigate and activate commands without leaving the
  CommandBar.
- Selected-command preview reduces accidental route changes.
- A fixed registry makes command availability auditable and testable.
- Search remains private and offline because queries never leave the browser.

## Key risks

- Capturing a browser-standard shortcut can surprise users; only the documented
  platform-specific combinations should be intercepted.
- Dynamic URLs or callbacks would turn discovery into an unsafe execution
  surface; the registry must remain fixed local navigation.
- A second root modal would conflict with the existing global dock; the
  palette belongs inside the CommandBar.
- Fuzzy ranking must remain deterministic so keyboard selection does not jump
  between renders.
- The mixed AGPL/MIT upstream boundary requires clean-room behavior-level
  adaptation and no copied implementation.

## Verification plan

- Registry ID and href validation.
- Deterministic exact/prefix/token/subsequence ranking fixtures.
- Static CommandBar integration and shortcut proof.
- Combobox/listbox/option, result count, preview, no-result, close, and focus
  restoration checks.
- Existing shell and interactive accessibility gates.
- Active component reachability.
- Source-parity completion with corrected branch/license evidence.
- Canonical staged-scope verification and a clean production build.
