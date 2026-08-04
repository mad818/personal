# GitHub mainline settings proposal

Status: applied and verified on 2026-08-04 after Mario's explicit approval.

## Intended repository settings

- allow squash merges;
- disable merge commits;
- disable rebase merges;
- use the pull-request title as the squash commit title;
- use the pull-request body as the detailed squash message;
- automatically delete merged branches.

The repository workflow separately requires a concise conventional PR title.
These settings affect future merges only. They do not rewrite existing commits,
change SHAs, remove PR links, or alter blame history.

## Applied command

```powershell
gh api --method PATCH repos/mad818/personal `
  -F allow_squash_merge=true `
  -F allow_merge_commit=false `
  -F allow_rebase_merge=false `
  -f squash_merge_commit_title=PR_TITLE `
  -f squash_merge_commit_message=PR_BODY `
  -F delete_branch_on_merge=true
```

The follow-up repository query returned `allow_squash_merge: true`,
`allow_merge_commit: false`, `allow_rebase_merge: false`,
`squash_merge_commit_title: PR_TITLE`,
`squash_merge_commit_message: PR_BODY`, and
`delete_branch_on_merge: true`. No existing commit, SHA, PR link, or blame
history changed.
