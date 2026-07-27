---
name: documentation-and-adrs
description: Records durable Nexus decisions, contracts, and operating guidance. Use when architecture, public interfaces, security boundaries, deployment behavior, migrations, or non-obvious tradeoffs need context future humans and agents cannot recover from code alone.
---

# Documentation And ADRs

## Overview

Document why a durable decision exists, what it governs, what was rejected, and how future work verifies or supersedes it.

## Authority boundaries

- Current manifests and source remain authoritative for drift-prone implementation facts.
- Do not duplicate generated handoff content or write private live-vault material into tracked docs.
- Update existing conventions rather than creating a competing document hierarchy.

## Workflow

1. Search for the current owner, existing decision records, specs, and documentation convention.
2. Decide whether the change needs an ADR, feature spec, runbook, API contract, or inline rationale.
3. Record context, constraints, decision, alternatives, consequences, and verification.
4. Link exact source files or stable public evidence.
5. State status and supersession path for decisions.
6. Update indexes and discoverability hubs.
7. Run documentation, publication, link, and handoff checks.

## Stop conditions

- Available evidence conflicts with the proposed record.
- Documentation would expose private or secret material.
- The text merely restates obvious code.

## Verification

- [ ] A future maintainer can recover the decision's why.
- [ ] Ownership, status, and supersession are clear.
- [ ] Links and commands are current.
- [ ] The document is indexed where project instructions expect it.
