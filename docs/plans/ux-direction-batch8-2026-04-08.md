# UX Direction Batch 8 — VAULT shell orientation cleanup

## Why this batch

VAULT has cleaner inner panels now, but the route shell still repeats too much guidance in
section-label detail text. That makes list mode and graph mode feel heavier than they are.

The next step is to explain each mode once, clearly, then let the inner panels be shorter and
more scan-friendly.

## Goals

1. Add one compact mode-level guide for VAULT list mode and one for graph mode.
2. Reduce repeated route-shell detail copy in `app/vault/page.tsx`.
3. Keep the current free-first/local-first IA intact while making VAULT easier to understand
   on first load.

## Implementation shape

### 1. Mode-level orientation block

Add a small reusable component for VAULT mode guidance that:

- states what the current mode is for
- gives three short action anchors
- keeps longer help behind the existing compact progressive-disclosure pattern

Initial action anchors:

- List mode: `Search`, `File`, `Preserve`
- Graph mode: `Filter`, `Inspect`, `Export`

### 2. Route-shell copy cleanup

After the mode guide lands, trim repeated `SectionLabel detail` text in `app/vault/page.tsx`
for the most obvious duplicated surfaces:

- Memory spine
- Offline readiness
- Ask memory
- Search
- Document intake
- Compiled pages
- Saved articles
- Graph focus
- Knowledge Graph

The labels should stay clear, but the detailed prose should only survive where it adds unique
meaning that the mode guide does not already cover.

### 3. Guardrails

- Do not remove any surface or change route structure.
- Do not add a second navigation system.
- Keep mission handoff and continuation flows intact.
- Preserve restricted/safe posture language where it matters.

## Verification

- `npm run type-check`
- `npm run verify`
- `npm run hq:e2e`
- `npm run handoff:write`
- live checks on:
  - `http://127.0.0.1:3000`
  - `http://127.0.0.1:3000/hq`
  - `http://127.0.0.1:3000/command`
  - `http://127.0.0.1:3000/vault`
