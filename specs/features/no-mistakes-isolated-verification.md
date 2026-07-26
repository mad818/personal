# No-Mistakes Isolated Verification

## Problem

Nexus can run a truthful release gate, but a dirty shared checkout can make
canonical verification fail on unrelated work or force the operator to create
and manage a temporary worktree by hand. The remaining useful
`kunchenguid/no-mistakes` patterns are disposable-worktree validation and
durable local evidence.

## Scope

- Add `npm run verify:isolated -- --intent "..."`.
- Require an explicit objective and at least one staged change.
- Build one contained worktree from `HEAD`, apply the exact staged binary diff,
  link the existing local `node_modules`, and run canonical `npm run verify`.
- Record a bounded local-only receipt and stdout/stderr logs under
  `.nexus/isolated-verification/`.
- Hash rather than store the operator's intent.
- Always attempt worktree cleanup and fail closed if cleanup does not complete.
- Add deterministic argument, containment, overlap, outcome, wiring, and
  source-parity checks.

## Boundary

The command validates only the index. Unstaged files remain untouched and are
reported only as a count plus staged/unstaged overlap count. It provides no auto-fix
behavior and does not install dependencies, accept an arbitrary command, invoke
an external coding agent, start a daemon, add a Git proxy, push, open a pull
request, monitor CI, rebase, merge, or change phone/PWA state.

The existing read-only `release:gate` remains the publish-readiness command.
This feature is the exact-scope verification helper used before a commit when
the active checkout contains other work.

## Evidence contract

Each run writes an ignored local directory containing:

- `receipt.json` with schema version, run ID, base commit, staged file count,
  overlap count, durations, verification result, cleanup result, and next
  action;
- `stdout.log` and `stderr.log` from canonical verification;
- only the SHA-256 digest and character count of the operator intent.

Tracked files, secret values, raw environment values, full diff content, and
the intent text are not copied into the receipt.

## Acceptance

- Parser fixtures reject missing, empty, duplicate, or unknown options.
- Path fixtures reject any worktree candidate outside `.worktrees/`.
- Outcome fixtures fail closed on verification or cleanup failure.
- Static proof locks fixed canonical verification, safe Git wrapper use,
  existing dependency reuse, local-only evidence, source parity, and package
  wiring.
- A real staged tranche passes through the new command without changing
  unstaged redesign files.
- Focused checks, source parity, TypeScript, lint, formatting, publication
  safety, handoff freshness, diff checks, and canonical verification pass.
