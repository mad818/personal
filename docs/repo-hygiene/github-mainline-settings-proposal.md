# GitHub mainline settings proposal

Status: prepared only. Do not apply without Mario's explicit approval.

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

## Approval-time command

```powershell
gh api --method PATCH repos/mad818/personal `
  -f allow_squash_merge=true `
  -f allow_merge_commit=false `
  -f allow_rebase_merge=false `
  -f squash_merge_commit_title=PR_TITLE `
  -f squash_merge_commit_message=PR_BODY `
  -f delete_branch_on_merge=true
```

After applying it, query the repository again and compare every returned value
with this proposal before proceeding to a tag or release.
