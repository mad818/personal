---
name: handoff
description: Compacts current work into a repository-grounded continuation brief for a fresh session. Use when the operator explicitly requests a handoff, the context window is near its useful limit, or work must continue elsewhere without losing state.
---

# Handoff

## Overview

Preserve goal, verified state, owned changes, evidence, blockers, and exact next action without turning chat history into authority.

## Authority boundaries

- The canonical generated repository handoff remains authoritative.
- Do not include secrets, private live-vault content, or unsupported claims.

## Workflow

1. Re-read current source, status, task, spec, and verification evidence.
2. Separate completed, in-progress, blocked, and unstarted work.
3. Record exact files, commit or staged state, commands, failures, and cleanup.
4. Name unrelated dirty work that must remain untouched.
5. Set one concrete next action and explicit boundaries.
6. Use repository handoff generation when project state changed.

## Stop conditions

- Current repository state cannot be verified.
- The brief would expose private content.

## Verification

- [ ] A fresh session can continue without guessing.
- [ ] Claims distinguish local, committed, pushed, and blocked states.
