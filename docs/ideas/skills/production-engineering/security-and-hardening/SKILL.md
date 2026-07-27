---
name: security-and-hardening
description: Threat-models and hardens Nexus trust boundaries with focused proof. Use when work involves authentication, authorization, user input, external data, secrets, persistence, tool execution, file paths, network requests, dependencies, desktop capabilities, or privacy-sensitive changes.
---

# Security And Hardening

## Overview

Identify assets, actors, entry points, and trust transitions; then fail closed at the narrowest boundary with adversarial proof.

## Authority boundaries

- Security review does not authorize offensive testing against external systems.
- Use synthetic inputs and local fixtures by default.
- Never print secrets, tokens, private vault content, or raw identifying data.

## Workflow

1. Map protected assets, trusted actors, untrusted inputs, and side effects.
2. Trace authentication, authorization, validation, normalization, and output encoding at each boundary.
3. Enumerate plausible abuse cases for path traversal, injection, request forgery, privilege escalation, hidden channels, secret leakage, and denial of service.
4. Rank by likelihood and impact.
5. Add a failing adversarial fixture for the highest relevant risk.
6. Enforce validation and least privilege at the owning boundary.
7. Run focused security, dependency, publication, and canonical gates.

## Stop conditions

- Testing would target a system without explicit authorization.
- A secret appears in source or output; redact and escalate.
- The proposed mitigation merely hides the vulnerable path.

## Verification

- [ ] Trust boundaries and threat assumptions are explicit.
- [ ] Invalid and unauthorized paths fail closed.
- [ ] Adversarial proof covers the corrected boundary.
- [ ] Logs and artifacts remain content-minimal.
