---
name: performance-optimization
description: Measures and improves one demonstrated Nexus bottleneck without sacrificing correctness. Use when investigating slow interaction, route or API latency, render cost, memory growth, bundle size, excessive network work, or a failing performance budget.
---

# Performance Optimization

## Overview

Measure the user-relevant symptom, isolate its dominant cost, change one cause, and compare the same metric.

## Authority boundaries

- Do not optimize from intuition alone.
- Do not trade away correctness, accessibility, privacy, or truthful error behavior.
- Caches require explicit bounds, invalidation, and privacy treatment.

## Workflow

1. Define the metric, scenario, environment, sample size, and budget.
2. Capture a reproducible baseline.
3. Profile the critical path and identify the largest contributing cost.
4. Form one falsifiable optimization hypothesis.
5. Apply the smallest change that tests it.
6. Re-measure the same scenario and inspect regressions.
7. Keep the change only when the improvement is material and repeatable.

## Stop conditions

- Baseline variance is too high to distinguish an effect.
- The metric does not correspond to operator-visible performance.
- Improvement depends on unbounded work, stale data, or a hidden failure.

## Verification

- [ ] Before and after numbers use the same method.
- [ ] The target budget passes.
- [ ] Functional, accessibility, and security gates remain green.
- [ ] Any cache or batching behavior is bounded and invalidated.
