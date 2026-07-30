---
name: improve-codebase-architecture
description: Finds and ranks codebase deepening opportunities before one is selected for design. Use when the operator explicitly requests architecture health analysis, coupling reduction, cleaner seams, or a codebase-improvement report.
---

# Improve Codebase Architecture

## Overview

Use current graph, ownership, hotspot, security, and source evidence to propose improvements without changing code.

## Authority boundaries

- Analysis only until the operator selects one opportunity.
- Existing project architecture diagnostics are authoritative; do not add a parallel scanner or HTML app.

## Workflow

1. Define the repository scope and current pain signal.
2. Run or inspect existing graph, coupling, ownership, hotspot, and reachability evidence.
3. Identify opportunities that reduce interface width, scattered change, cycles, or false ownership.
4. Rank benefit, evidence, cost, risk, and reversibility.
5. Present a compact report with exact source paths.
6. Interrogate only the selected opportunity before specification.

## Stop conditions

- The report would rely on file existence without reachability.
- No evidence distinguishes the candidates.

## Verification

- [ ] Every candidate has current repository proof.
- [ ] No implementation occurred before selection.
