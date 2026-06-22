---
name: optimize
description: Performance optimization for Nexus Prime — measure first, one bottleneck at a time. Use for bundle size, fetch dedup, render cost, or API latency.
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# Optimize — Quick Reference

## Trigger
- User reports slowness, large bundles, or redundant fetches
- `npm run performance:check` failures

## Steps
1. Identify the metric (first-load JS, route chunk, API latency, re-render count)
2. Measure baseline before changing code
3. Apply one optimization; re-measure
4. Prefer existing patterns: dynamic import, `apiFetch` dedup, route-local boundaries
5. Run `npm run performance:check` or `npm run verify:fast` as appropriate

## Success criteria
- Before/after numbers recorded in commit or task note
- No capability removed unless explicitly approved
- Budget gates in `scripts/validate-shell-performance.mjs` still pass

## YAGNI
Do not add caching layers without evidence of duplicate work.
