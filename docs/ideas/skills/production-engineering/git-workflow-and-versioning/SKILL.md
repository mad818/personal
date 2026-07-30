---
name: git-workflow-and-versioning
description: Packages authorized Nexus changes into intentional reversible history. Use when creating or switching branches, staging, committing, pushing, preparing release history, or separating task work from unrelated dirty files.
---

# Git Workflow And Versioning

## Overview

Keep every commit coherent, reviewable, verified, and limited to the task's owned paths.

## Authority boundaries

- Git writes require the user's request to change or publish the project.
- Never stage, revert, reset, delete, or overwrite unrelated work.
- Push only when authorized by the active workflow; report network failure honestly.

## Workflow

1. Inspect status, branch, worktrees, remotes, and recent history.
2. Define the exact owned file set and confirm it excludes unrelated dirty paths.
3. Run focused and required verification before staging.
4. Stage only explicit paths and inspect the cached diff.
5. Re-run staged-scope proof when the repository provides it.
6. Commit one logical change with an outcome-focused message.
7. Push the exact branch, then confirm the remote result.

## Stop conditions

- Owned and unrelated work overlap.
- Verification fails or staged content differs from reviewed content.
- A lock, rebase, merge, or worktree state is not understood.
- Remote publication fails.

## Verification

- [ ] Cached diff contains only approved paths.
- [ ] Commit is independently coherent and reversible.
- [ ] Local and remote outcomes are distinguished.
- [ ] Handoff state reflects what was actually committed.
