# No-Mistakes Isolated Safe Fixes

## Problem

Nexus can verify an exact staged scope in a disposable worktree, but the final
useful `kunchenguid/no-mistakes` capability is still pending: applying a
mechanical correction and proving the corrected state without letting an
automatic fixer rewrite unrelated work.

## Scope

- Add `npm run verify:isolated:fix -- --intent "..." --apply`.
- Require explicit bounded operator intent, the explicit `--apply`
  acknowledgement, a non-empty staged diff, and zero staged/unstaged path
  overlap.
- Accept only existing regular files under `app/`, `components/`, or `lib/`
  with extensions covered by the canonical Prettier lane, excluding `app/hq/`.
- Reproduce the exact staged snapshot in a contained disposable worktree.
- Run only the repository-owned Prettier binary against the exact eligible
  paths, then run the fixed format, type-check, and lint gates.
- Apply the generated mechanical patch to the source checkout and index only
  when the source staged-diff hash still matches the original snapshot.
- Verify the final staged-diff hash against the proven worktree result and
  reverse the exact mechanical patch if that postcondition fails.
- Persist a bounded ignored receipt and logs without storing source, diff
  content, operator intent text, environment values, or secrets.

## Boundary

This is an explicit formatter repair lane, not an autonomous code agent. It
does not accept arbitrary commands or fixer arguments, change semantics, add
dependencies, install packages, touch unstaged-overlap paths, edit
unsupported files, call a provider, use the network, push, open a pull
request, monitor CI, rebase, merge, or change phone/PWA or game state.

The source checkout remains authoritative. Before applying a proven patch,
the command re-reads the staged snapshot and overlap inventory; any drift
fails closed. Git patch application is atomic, and a failed final hash
postcondition triggers exact reverse-patch rollback before cleanup.

## Evidence contract

Each run writes an ignored directory under `.nexus/isolated-fixes/` containing:

- `receipt.json` with hashed intent and staged snapshots, eligible/fixed path
  counts, gate outcomes, source application and rollback state, cleanup state,
  and the next operator action;
- `formatter.log`, `format-check.log`, `type-check.log`, and `lint.log`;
- no file names, source text, patch content, raw environment values, or
  verbatim operator intent.

## Acceptance

- Parser fixtures reject missing intent, missing `--apply`, duplicates, and
  unknown options.
- Eligibility fixtures reject unsupported roots, `app/hq/`, deletions,
  renames, type changes, symlinks, and non-Prettier extensions.
- Runtime fixtures prove staged-snapshot drift, unexpected fix paths, gate
  failure, source-apply failure, postcondition rollback, cleanup failure, and
  success outcomes fail closed.
- Static proof locks exact Prettier arguments, fixed repository gates,
  dependency reuse, ignored bounded evidence, safe Git use, source parity,
  package wiring, and the remote-write boundary.
- A real staged fixture proves formatting is applied to both the worktree and
  index while an unrelated unstaged file remains byte-for-byte unchanged.
- Focused checks, source parity, script reachability, TypeScript, lint,
  formatting, publication safety, diff checks, canonical verification, and
  isolated verification pass before commit.
