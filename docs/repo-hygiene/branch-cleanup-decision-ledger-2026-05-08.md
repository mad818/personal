# Branch Cleanup Decision Ledger - 2026-05-08

This ledger turns the read-only branch audit into reviewable cleanup decisions.
It does not delete branches, remove worktrees, tag archives, or push remote ref
changes. Run the commands only after Mario approves the exact rows.

Source of truth for refreshing the list:

```powershell
npm run repo:branches:audit
```

## Guardrails

- No automatic branch deletion.
- Refresh remote truth first with `git fetch --prune` from a Git shell that has
  working `.git` permissions.
- Check open PRs before deleting any remote branch.
- Remove a worktree before deleting the branch bound to it.
- Convert preserve/backup refs to archive tags only after the active Homefront
  branch is safely merged or no longer needed.

## Keep

| Ref | Reason | Next review |
| --- | --- | --- |
| `main` | Protected base branch. | Never delete. |
| `codex/homefront-vision-expansion` | Active Homefront visual/source/assistant branch. | Recheck after the current local batch is committed and PR status is clear. |
| `codex/preserve-main-2026-04-11` | Preserve context from mainline recovery. | Consider archive tag only after Mario confirms rollback context is no longer needed. |
| `codex/root-preserve-before-main-restore-2026-04-21` | Preserve context before root restore. | Consider archive tag after active release path stabilizes. |

## Delete Local After Worktree Removal

These are local merged candidates, but the audit shows they are worktree-bound.
Do not delete the branch before removing the matching worktree.

| Branch | Required pre-step | Cleanup command |
| --- | --- | --- |
| `codex/m2-shell-taste-replay` | `git worktree remove .worktrees/m2-shell-taste-replay` | `git branch -d codex/m2-shell-taste-replay` |
| `codex/m3-hq-route-replay` | `git worktree remove .worktrees/m3-hq-route-replay` | `git branch -d codex/m3-hq-route-replay` |
| `codex/m4-trust-substrate-replay` | `git worktree remove .worktrees/m4-trust-substrate-replay` | `git branch -d codex/m4-trust-substrate-replay` |
| `codex/mainline-runtime-archive-2026-04-21` | `git worktree remove .worktrees/uxa3-mainline-consolidation` | `git branch -d codex/mainline-runtime-archive-2026-04-21` |
| `codex/uxs45-slice-a-main-replay` | `git worktree remove .worktrees/uxs45-slice-a-main-replay` | `git branch -d codex/uxs45-slice-a-main-replay` |

## Delete Remote After PR Check

These remote refs were listed as merged cleanup candidates in the audit. Delete
only after `gh pr list --state open --limit 100` confirms no active PR/check
still depends on them.

| Remote ref | Review command | Cleanup command |
| --- | --- | --- |
| `origin/codex/fix-health-checks-on-git-push` | `gh pr list --state open --head codex/fix-health-checks-on-git-push` | `git push origin --delete codex/fix-health-checks-on-git-push` |
| `origin/codex/fix-health-checks-on-git-push-j3m9n3` | `gh pr list --state open --head codex/fix-health-checks-on-git-push-j3m9n3` | `git push origin --delete codex/fix-health-checks-on-git-push-j3m9n3` |
| `origin/codex/homefront-landing-shell` | `gh pr list --state open --head codex/homefront-landing-shell` | `git push origin --delete codex/homefront-landing-shell` |
| `origin/codex/incorporate-github-ideas-into-project` | `gh pr list --state open --head codex/incorporate-github-ideas-into-project` | `git push origin --delete codex/incorporate-github-ideas-into-project` |
| `origin/codex/m2-shell-taste-replay` | `gh pr list --state open --head codex/m2-shell-taste-replay` | `git push origin --delete codex/m2-shell-taste-replay` |
| `origin/codex/m3-hq-route-replay` | `gh pr list --state open --head codex/m3-hq-route-replay` | `git push origin --delete codex/m3-hq-route-replay` |
| `origin/codex/m4-trust-substrate-replay` | `gh pr list --state open --head codex/m4-trust-substrate-replay` | `git push origin --delete codex/m4-trust-substrate-replay` |
| `origin/codex/root-main-runtime-stabilization` | `gh pr list --state open --head codex/root-main-runtime-stabilization` | `git push origin --delete codex/root-main-runtime-stabilization` |
| `origin/codex/uxa3-mainline-consolidation` | `gh pr list --state open --head codex/uxa3-mainline-consolidation` | `git push origin --delete codex/uxa3-mainline-consolidation` |

## Archive Tag Candidates

These refs look like backup, preserve, or release-hardening context. The safer
cleanup is to create explicit archive tags, verify the tags pushed, then delete
the branch only after approval.

| Ref | Proposed archive tag | Reason |
| --- | --- | --- |
| `codex/backup-pre-publish-recovery-2026-04-14` | `archive/backup-pre-publish-recovery-2026-04-14` | Rollback marker before publish recovery. |
| `codex/backup-pre-target-cleanup` | `archive/backup-pre-target-cleanup` | Rollback marker before target cleanup. |
| `codex/release-hardening-baseline` | `archive/release-hardening-baseline` | Release-hardening reference. |
| `codex/release-hardening-baseline-pre-pr27-cleanup` | `archive/release-hardening-baseline-pre-pr27-cleanup` | Release-hardening reference before PR cleanup. |
| `codex/mainline-runtime-archive-2026-04-21` | `archive/mainline-runtime-archive-2026-04-21` | Mainline runtime archive, also worktree-bound. |
| `codex/root-preserve-before-main-restore-2026-04-21` | `archive/root-preserve-before-main-restore-2026-04-21` | Preserve point before main restore. |

Example archive flow for one approved ref:

```powershell
git tag archive/backup-pre-target-cleanup codex/backup-pre-target-cleanup
git push origin archive/backup-pre-target-cleanup
git branch -d codex/backup-pre-target-cleanup
```

## Do Not Touch Yet

| Ref | Reason |
| --- | --- |
| `codex/homefront-live-threshold` | May contain recent Homefront threshold work. |
| `codex/landing-page` | Landing page lineage may still be useful while visual parity is active. |
| `codex/m5-preserved-replay-a` | Worktree-bound preserved replay context. |
| `codex/remove-copyrighted-material-and-server-links` | Compliance/safety cleanup context should not be deleted casually. |
| `refactor/secure-typing-format` | Unmerged refactor branch; review source before deletion. |
| `origin/dependabot/*` | Dependabot refs should be handled through GitHub PR state first. |

## Approved Cleanup Command Template

Do not run this whole block blindly. Copy only approved rows.

```powershell
git fetch --prune
gh pr list --state open --limit 100

# Example local worktree-bound cleanup:
git worktree remove .worktrees/m2-shell-taste-replay
git branch -d codex/m2-shell-taste-replay

# Example remote cleanup after PR check:
gh pr list --state open --head codex/homefront-landing-shell
git push origin --delete codex/homefront-landing-shell

# Final prune after remote deletion:
git fetch --prune
```
