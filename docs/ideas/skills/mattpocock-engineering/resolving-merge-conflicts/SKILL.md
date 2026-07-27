---
name: resolving-merge-conflicts
description: Resolves an authorized active merge or rebase conflict hunk by hunk from both sides' intent. Use when Git is already in a conflict state and the operator asks to reconcile it without losing either side's required behavior.
---

# Resolving Merge Conflicts

## Overview

Understand both changes from primary repository evidence, resolve each hunk deliberately, and separate content resolution from history mutation.

## Authority boundaries

- Diagnose and edit only when the user authorized conflict resolution.
- Stage, continue, commit, abort, reset, or rewrite history only when that exact action is authorized.
- Never choose a side mechanically for the whole file.

## Workflow

1. Inspect merge or rebase state, conflicted paths, status, and current branch.
2. For each hunk, trace both sides to commits, specs, issues, tests, and surrounding code.
3. State the two intents and whether they are compatible.
4. Preserve both when possible; otherwise choose the behavior matching the merge goal and record the tradeoff.
5. Remove markers and read the complete resolved file.
6. Run focused tests, type-check, lint, and conflict-marker scans.
7. Report the resolved worktree separately from any unperformed stage, continue, commit, or push step.

## Stop conditions

- The merge goal or one side's intent is unavailable.
- Resolution would require inventing new behavior.
- The repository is not actually in the expected Git state.

## Verification

- [ ] Every hunk has an intent-based resolution.
- [ ] No history action exceeded explicit authority.
