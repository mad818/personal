---
name: review
description: Structured code review for Nexus Prime — read before edit, scope-bounded findings, no drive-by refactors. Use when reviewing PRs, patches, or agent-generated diffs.
allowed-tools: Read, Grep, Glob
---

# Review — Quick Reference

## Trigger
- User asks for code review, PR review, or "does this look right?"
- Before merging a non-trivial agent patch

## Steps
1. Read the full changed files — never review from diff snippets alone
2. Confirm the change matches the stated goal (one sentence)
3. List findings as: **blocker** / **should-fix** / **nit**
4. Verify `npx tsc --noEmit` would pass for touched `.ts`/`.tsx`
5. Check security: secrets, unsafe fetch, missing auth on new routes

## Success criteria
- Every blocker has a concrete fix suggestion
- No scope creep recommendations unless flagged separately
- Review ends with ship / fix-first / needs-discussion verdict

## YAGNI
Do not request refactors outside the diff unless they block correctness.
