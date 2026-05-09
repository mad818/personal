# Branch Cleanup Audit - 2026-05-03

This audit explains why the repo has many branches and what can be cleaned up.
It is based on local refs in `C:\Users\mario\Desktop\personal` on 2026-05-03.
Run `git fetch --prune` from a working Git shell before deleting remote refs so
the list reflects GitHub's current state.

## Repeatable report command

Run this any time the branch list feels noisy:

```powershell
npm run repo:branches:audit
```

The command prints a live Markdown report of current branch, dirty working tree
entry count, worktree-bound refs, local merged candidates, local review-only
refs, remote merged candidates, and remote review-only refs. It is read-only and
does not delete branches, worktrees, or remote refs.

The reviewable cleanup decisions are tracked in
`docs/repo-hygiene/branch-cleanup-decision-ledger-2026-05-08.md`. Use that
ledger for approved commands; keep this file as the source audit snapshot.

## Current working branch

- `codex/homefront-vision-expansion`
  - Purpose: active Homefront landing/shell/source-intelligence work.
  - State: current branch with uncommitted local updates.
  - Action: keep until the current local batch is committed and PR/merge status is clear.

## Why there are so many branches

Most of the branch count comes from four categories:

1. **Replay/mainline migration branches** from the UXA/M2/M3/M4/M5 replay era.
2. **Preserve/backup branches** created to keep rollback context before restoring or replaying `main`.
3. **Feature PR branches** for Homefront shell, threshold, landing, RPG visuals, Tauri fixes, and root runtime fixes.
4. **Dependabot remote branches** for package/workflow upgrade PRs.

That means the clutter is mostly process residue, not random accidental work.

## Local refs

### Keep

- `main` - protected base branch.
- `codex/homefront-vision-expansion` - active branch.
- `codex/premium-live-rpg-visual-expansion` is remote-only and appears related to recent merged work; check GitHub before deleting.

### Local branches already merged into `main`

These local branches are merged by local ancestry. They are candidates for local
cleanup after checking no worktree still needs them:

- `codex/homefront-landing-shell`
- `codex/m2-shell-taste-replay` - worktree-bound
- `codex/m3-hq-route-replay` - worktree-bound
- `codex/m4-trust-substrate-replay` - worktree-bound
- `codex/mainline-runtime-archive-2026-04-21` - worktree-bound
- `codex/uxs45-slice-a-main-replay` - worktree-bound

The worktree-bound branches cannot be deleted until their worktrees are removed.

### Local branches not merged into `main`

Do not delete these automatically. They may contain rollback, archive, or
unmerged feature context:

- `codex/backup-pre-publish-recovery-2026-04-14`
- `codex/backup-pre-target-cleanup`
- `codex/homefront-live-threshold`
- `codex/landing-page`
- `codex/m5-preserved-replay-a` - worktree-bound
- `codex/preserve-main-2026-04-11`
- `codex/release-hardening-baseline`
- `codex/release-hardening-baseline-pre-pr27-cleanup`
- `codex/remove-copyrighted-material-and-server-links`
- `codex/root-preserve-before-main-restore-2026-04-21`
- `refactor/secure-typing-format`

Recommendation: convert preserve/backup branches to archive tags only after the
current Homefront PR lands and after Mario confirms no rollback/reference review
is needed.

## Worktrees blocking cleanup

These worktrees are attached to branches:

- `.worktrees/m2-shell-taste-replay` -> `codex/m2-shell-taste-replay`
- `.worktrees/m3-hq-route-replay` -> `codex/m3-hq-route-replay`
- `.worktrees/m4-trust-substrate-replay` -> `codex/m4-trust-substrate-replay`
- `.worktrees/m5-preserved-replay-a` -> `codex/m5-preserved-replay-a`
- `.worktrees/uxa3-mainline-consolidation` -> `codex/mainline-runtime-archive-2026-04-21`
- `.worktrees/uxs45-slice-a-main-replay` -> `codex/uxs45-slice-a-main-replay`

If those folders are no longer needed, remove each worktree first, then delete
the matching branch.

## Remote refs merged into `origin/main`

These remote refs are merged according to local `origin/main` ancestry and are
good cleanup candidates after confirming no GitHub PR/check is still active:

- `origin/codex/fix-health-checks-on-git-push`
- `origin/codex/fix-health-checks-on-git-push-j3m9n3`
- `origin/codex/homefront-landing-shell`
- `origin/codex/incorporate-github-ideas-into-project`
- `origin/codex/m2-shell-taste-replay`
- `origin/codex/m3-hq-route-replay`
- `origin/codex/m4-trust-substrate-replay`
- `origin/codex/root-main-runtime-stabilization`
- `origin/codex/uxa3-mainline-consolidation`

Dependabot branches should usually be closed/merged/declined in GitHub first,
then pruned locally with `git fetch --prune`.

## Review-gated cleanup commands

Do not run this as one blind script. Pick confirmed branches only.

```powershell
# Refresh remote truth first.
git fetch --prune

# Inspect open PRs before deleting remote branches.
gh pr list --state open --limit 100

# Remove a worktree before deleting its branch.
git worktree remove .worktrees/m2-shell-taste-replay
git branch -d codex/m2-shell-taste-replay

# Delete a confirmed merged remote branch.
git push origin --delete codex/homefront-landing-shell

# Prune deleted remote-tracking refs.
git fetch --prune
```

## Recommended cleanup order

1. Finish and push the current Homefront branch.
2. Confirm open PR list in GitHub.
3. Delete remote refs that are merged and have no active PR.
4. Remove replay worktrees that are no longer needed.
5. Delete their local merged branches.
6. Convert preserve/backup branches to archive tags only if Mario wants a slimmer branch list but still wants rollback names.
