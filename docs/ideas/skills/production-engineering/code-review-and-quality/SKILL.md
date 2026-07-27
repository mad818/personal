---
name: code-review-and-quality
description: Reviews Nexus changes across correctness, clarity, architecture, security, and performance. Use when preparing to merge, reviewing a pull request or patch, checking agent-generated code, or deciding whether a change improves overall code health.
---

# Code Review And Quality

## Overview

Find actionable defects first, cite tight evidence, and distinguish required corrections from optional improvement.

## Authority boundaries

- Review is read-only unless the user explicitly asks for fixes.
- Read full changed sections and relevant contracts; do not infer from a snippet alone.
- Do not request orthogonal refactors or personal-style rewrites.

## Workflow

1. Establish the intended outcome, changed paths, and repository status.
2. Read the spec, full changed sections, tests, and owning interfaces.
3. Review five axes:
   - correctness and failure behavior
   - readability and unnecessary complexity
   - architectural ownership and dependency direction
   - trust boundaries, validation, secrets, and privacy
   - bounded work, rendering, network, and storage cost
4. Reproduce or statically prove each suspected defect.
5. Rank findings by user impact and fix urgency.
6. Give a tight file and line range plus one concrete remediation.
7. End with ship, fix-first, or needs-decision.

## Stop conditions

- A finding cannot be tied to changed behavior.
- Required context is unavailable.
- The requested review would expose private data or credentials.

## Verification

- [ ] Findings lead; summaries follow.
- [ ] Every finding has evidence and impact.
- [ ] No style preference is mislabeled as a defect.
- [ ] Tests and stated acceptance were checked.
