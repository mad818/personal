# Security and GitHub Triage — 2026-07-29

## Goal

Reconcile the eight open Dependabot alerts visible in Mario's current GitHub
screenshot with the repository's default branch, active feature branch,
installed dependency tree, local security checks, and open GitHub work.

## Evidence boundaries

- The screenshot is authoritative only for alert number, title, severity,
  package, manifest, and the visible development-scope badges.
- Local Git refs are authoritative for the versions currently recorded on
  `origin/main` and this branch.
- `package-lock.json` and `desktop/src-tauri/Cargo.lock` are authoritative for
  reproducible dependency resolution on this branch.
- `node_modules` is separate local-install evidence and must not be described as
  aligned when `npm ls` reports invalid override versions.
- Missing vulnerable ranges or first-patched versions must remain unknown.
- A branch-local patch does not close a default-branch alert. GitHub must receive
  and merge the change into `main`, then rescan it.

## Required outcomes

1. Record all eight observed alerts without inventing advisory metadata.
2. Distinguish branch-patched/default-unpatched alerts from current unresolved
   runtime alerts.
3. Preserve the old 75-alert push warning as historical evidence only; never
   emit it as the current open-alert count when no fresh import exists.
4. Keep Next's built-in image optimizer disabled, explicitly deny SVG
   optimization, and verify both settings while the current Next.js and Sharp
   advisories lack a proven compatible patch.
5. Record that GitHub Issues has no open items and that PRs 65, 42, 33, and 12
   remain open without mutating any remote item.
6. Run the focused dependency, security, TypeScript, canonical, and handoff
   checks that are feasible without registry or GitHub browser access.

## Non-goals

- Dismissing Dependabot alerts.
- Updating, closing, or commenting on GitHub issues or pull requests.
- A speculative Next.js major upgrade.
- A speculative Sharp/libvips override without a verified patched version.
- Treating stale `node_modules` as release evidence.
- Claiming GitHub has rescanned an unmerged branch.

## Acceptance

- The current triage artifact lists eight alerts and the exact evidence limit.
- The Dependabot starter artifact reports an unknown current count when no
  current metadata import is provided.
- Active dependency floor validation passes for the branch-patched packages.
- Remaining Next.js and Sharp alerts are explicitly unresolved pending exact
  advisory metadata and a compatible tested patch; their Next image-optimizer
  runtime path stays disabled and SVG optimization stays denied.
- Unrelated worktree changes and `main.bat` remain excluded.
