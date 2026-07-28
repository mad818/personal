---
name: observability-and-instrumentation
description: Adds bounded privacy-safe evidence for Nexus runtime behavior. Use when operators need status, logs, metrics, traces, health checks, receipts, or diagnostics to detect failure and identify its cause without exposing private content.
---

# Observability And Instrumentation

## Overview

Instrument operator questions and failure symptoms with the minimum structured data needed to diagnose and recover.

## Authority boundaries

- Local-first and content-minimal by default.
- Do not add third-party telemetry, analytics, identifiers, or remote export without explicit approval.
- Never log secrets, prompts, private vault contents, full payloads, or unnecessary paths.

## Workflow

1. List the operator questions the evidence must answer.
2. Define events, fields, units, bounds, retention, and redaction.
3. Separate health, throughput, errors, latency, and resource saturation where relevant.
4. Add instrumentation at the owning boundary, not every caller.
5. Bound cardinality, storage, and event rate.
6. Add healthy, degraded, failed, recovery, and cleanup fixtures.
7. Connect diagnostics to an existing status or receipt surface.

For conversation-visible run status, prefer the compact fields `Now`, `Done`,
`Checks`, `Blocked`, and `Next`. Show branch, dirty state, context, usage, cost,
agents, or tool activity only when a current trusted source exposes them; never
estimate a host-specific HUD field.

## Stop conditions

- A field has no diagnostic consumer.
- Evidence would contain private content or stable personal identifiers.
- Metrics imply correctness they cannot actually prove.

## Verification

- [ ] Every field answers a named operator question.
- [ ] Sensitive content is absent or irreversibly minimized.
- [ ] Failure and recovery are distinguishable.
- [ ] Storage, retention, and cardinality are bounded.
