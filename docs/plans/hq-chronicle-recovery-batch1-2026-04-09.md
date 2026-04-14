# HQ Chronicle Recovery Batch 1 — 2026-04-09

## Why this batch exists
- The HQ chronicle composer can get visually cut off after the first response because the whole terminal pane scrolls as one column instead of keeping the message list as the dedicated scroll region.
- Raw model `<think>...</think>` traces can leak directly into visible reply bubbles, which breaks operator trust and bypasses the agent/environment UX already built into HQ.

## Goals
1. Keep the HQ composer and lesson bar pinned and usable after the first reply.
2. Strip raw `<think>` blocks from operator-visible chat text.
3. Route leaked reasoning into the existing agent-runtime trace path instead of the chronicle body.
4. Add browser regression coverage for both failure modes.

## Planned changes
- Add a small shared runtime helper that extracts `<think>` blocks and returns clean visible reply text.
- Use that helper in the agent runtime before storing or rendering final answers.
- Add a final UI-side self-heal in the chronicle renderer so old or malformed replies still render safely.
- Restructure the HQ chronicle layout so only the message viewport scrolls while the composer/footer remain pinned.
- Add an HQ Playwright test that stubs the local model response with a raw `<think>` block and proves the composer remains visible.

## Verification target
- `npm run type-check`
- `npm run verify`
- `npm run hq:e2e`
- `npm run handoff:write`
- Live route checks for `/`, `/hq`, and the focused chronicle session
