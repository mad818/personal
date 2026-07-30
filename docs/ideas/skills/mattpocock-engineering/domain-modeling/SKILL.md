---
name: domain-modeling
description: Sharpens project domain language by testing terms against code, examples, and boundary cases. Use when names are overloaded, concepts are confused with implementation, or an alignment flow needs a stable glossary or rare ADR proposal.
---

# Domain Modeling

## Overview

Make one term mean one domain concept, expose contradictions, and preserve durable language only with authorization.

## Authority boundaries

- Human-owned context and source code outrank inferred terminology.
- Propose glossary and ADR changes; write only when the current request authorizes the exact destination.
- Keep implementation detail out of domain definitions.

## Workflow

1. Identify ambiguous, overloaded, or missing domain terms.
2. Ask the operator for concrete positive and negative examples.
3. Stress-test relationships with boundary and failure scenarios.
4. Compare the stated model with current types, behavior, and persisted data.
5. Surface contradictions and resolve one canonical term per concept.
6. Draft concise glossary changes.
7. Offer an ADR only for a surprising hard-to-reverse tradeoff with real alternatives.

## Stop conditions

- Stakeholders use incompatible meanings and no owner can decide.
- The requested write would merge background inference into human context.

## Verification

- [ ] Definitions distinguish neighboring concepts.
- [ ] Code contradictions and unresolved terms are explicit.
