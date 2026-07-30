---
name: api-and-interface-design
description: Defines stable validated Nexus module, route, tool, and data contracts before implementation. Use when creating or changing an API route, shared function, agent tool, persisted schema, event payload, or boundary consumed by multiple callers.
---

# API And Interface Design

## Overview

Design the smallest explicit contract that keeps validation, errors, compatibility, and authority at the boundary.

## Authority boundaries

- All external API calls remain proxied through `app/api/`.
- AI calls use `lib/ai.ts`; tools use existing policy and approval lanes.
- A new interface cannot silently broaden data access, side effects, or compatibility promises.

## Workflow

1. Identify consumers, owner, trust boundary, and lifecycle.
2. Define typed inputs, outputs, limits, defaults, and invariants.
3. Define authentication, authorization, validation, and error semantics.
4. Separate unavailable, invalid, empty, degraded, and successful results.
5. Preserve one-version compatibility where feasible; otherwise write a migration contract.
6. Add contract fixtures before wiring consumers.
7. Implement one owner and update every known caller.

## Stop conditions

- Consumer requirements conflict.
- Input provenance or authority cannot be established.
- A fallback would fabricate data or hide failure.
- The contract needs a breaking change without migration approval.

## Verification

- [ ] Boundary validation rejects malformed and oversized input.
- [ ] Error shapes are stable and non-secret.
- [ ] Every consumer compiles against one contract.
- [ ] Side effects and risk tier are explicit.
