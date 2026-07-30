---
name: debugging-and-error-recovery
description: Reproduces, localizes, reduces, fixes, and guards exact Nexus failures. Use when logs, tests, builds, routes, UI behavior, or external integrations fail or when the user reports that an earlier fix did not solve the current path.
---

# Debugging And Error Recovery

## Overview

Trace the reported failure from current evidence, change the smallest causal point, and add proof that prevents recurrence.

## Authority boundaries

- Diagnose before implementing unless the request includes a fix.
- Preserve logs and exact error text without exposing secrets.
- Do not widen to adjacent failures until the reported path is understood.

## Workflow

1. Reproduce the exact command, input, route, environment, and error.
2. Separate first failure from downstream noise.
3. Trace data and control flow backward to the smallest causal boundary.
4. Reduce the failure to a focused fixture or check.
5. Patch the causal point with the smallest safe change.
6. Prove the fix on the reduced case and original path.
7. Add a regression guard and record a lesson after user correction.

## Stop conditions

- The failure cannot be reproduced and evidence is insufficient.
- The likely fix requires destructive recovery or a different target directory.
- Three attempts hit the same external blocker without new information.

## Verification

- [ ] Root cause explains the observed error.
- [ ] The original path now passes.
- [ ] A regression check fails on the old behavior.
- [ ] No unrelated cleanup entered the diff.
