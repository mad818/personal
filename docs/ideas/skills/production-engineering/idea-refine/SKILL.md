---
name: idea-refine
description: Converts a rough Nexus concept into a bounded evidence-aware proposal. Use when the operator has an idea but needs alternatives, tradeoffs, a recommended shape, exclusions, and a smallest useful slice before specification.
---

# Idea Refine

## Overview

Explore enough alternatives to expose the real choice, then converge on one project-native proposal.

## Authority boundaries

- Produce analysis and a recommendation, not implementation.
- Prefer existing Nexus routes, libraries, tools, and governance seams.
- Treat paid services, new dependencies, network access, and new product surfaces as explicit tradeoffs.

## Workflow

1. Write the desired operator outcome in one sentence.
2. Identify constraints from current repository truth, privacy, licensing, cost, and product purpose.
3. Generate three genuinely different options: smallest native adaptation, broader integration, and defer/exclude.
4. Compare benefit, complexity, reversibility, risk, and proof for each.
5. Recommend one option and name what it deliberately excludes.
6. Define the smallest vertical slice that proves the recommendation.

## Stop conditions

- Source facts needed for the comparison are unavailable.
- The recommendation requires an unapproved dependency, account, service, or destructive migration.
- The alternatives are cosmetic variants of the same design.

## Verification

- [ ] Options differ in architecture or scope, not wording.
- [ ] The recommendation fits an existing Nexus seam.
- [ ] Benefits and exclusions are explicit.
- [ ] The proposed proof can distinguish success from failure.
