---
name: ci-cd-and-automation
description: Designs and repairs deterministic fail-closed Nexus delivery automation. Use when adding or changing verification workflows, release gates, build pipelines, scheduled jobs, artifact publication, or failure diagnostics.
---

# CI CD And Automation

## Overview

Make the cheapest failures happen first, preserve actionable evidence, and prevent failed or unproven work from advancing.

## Authority boundaries

- Do not enable deployment, release, secret use, or external writes without explicit authorization.
- Pin or constrain mutable third-party actions and dependencies.
- Logs and artifacts must not contain secrets or private content.

## Workflow

1. Define trigger, inputs, permissions, outputs, timeout, concurrency, and success contract.
2. Order static checks, focused tests, build, integration, and publication gates by cost and dependency.
3. Set least-privilege permissions and fail-closed defaults.
4. Make local and CI commands share repository-owned scripts.
5. Add deterministic fixtures for pass, fail, missing configuration, timeout, and cleanup.
6. Preserve concise diagnostic artifacts with retention and privacy bounds.
7. Prove cancellation, rerun, and rollback behavior.

## Stop conditions

- Required secrets or environment ownership are undefined.
- A pipeline can publish after a failed or skipped required gate.
- The automation depends on an unpinned or unlicensed component.

## Verification

- [ ] Required gates cannot be bypassed silently.
- [ ] Permissions and secret exposure are minimal.
- [ ] Failure output identifies the causal stage.
- [ ] Local reproduction path is documented and passes.
