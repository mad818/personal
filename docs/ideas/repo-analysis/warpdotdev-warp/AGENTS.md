# Warp command-palette analysis handoff

- Treat the upstream default branch as `master`, not `main`.
- Treat the upstream repository as mixed license: MIT only for the named UI
  crates and AGPL-3.0 for the remaining code.
- Use Warp's current documentation as behavior evidence for the command
  palette; do not copy implementation or product text.
- Keep the Nexus adaptation inside `components/ui/CommandBar.tsx`.
- Keep the command registry fixed, local, same-origin, and navigation-only.
- Query text must never become a shell command, URL, callback, provider input,
  tool input, or persisted history.
- Preserve fuzzy deterministic ranking, keyboard navigation, selected preview,
  no-result feedback, close behavior, and focus restoration.
- New commands require a real reachable route plus deterministic registry
  validation.
