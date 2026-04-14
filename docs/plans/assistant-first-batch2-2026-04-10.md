# Assistant-First Batch 2 — 2026-04-10

## Goal

Complete the first real `BF2A` slice of the Assistant-First Nexus program by turning one-turn prepared workspaces into durable unfinished-session memory that can quietly reopen the strongest exact session later.

## Why

Batch 1 let HQ stage one prepared workspace after a reply, but that continuity was still too short-lived:

- it helped only immediately after the turn
- broad route opens could self-heal only from the fresh prepared workspace
- HQ context resolution could not reuse the best unfinished exact session from prior work

That meant the assistant still behaved like it remembered the next click, not the actual ongoing task.

## What changed

### 1. Added unfinished session memory primitives

- `lib/assistantSessionMemory.ts`
  - added canonical unfinished-session memory shape
  - added pruning, dedupe, normalization, and ranking helpers
  - added route-aware scoring for recency, confidence, completion state, intent match, and domain-specific boosts

### 2. Persisted unfinished exact sessions in the store

- `store/useStore.ts`
  - added `unfinishedSessions[]`
  - added `rememberUnfinishedSession(...)`
  - added `touchUnfinishedSession(...)`
  - added persistence + migration pruning so stale memory decays safely instead of accumulating forever

### 3. Let HQ quietly reuse unfinished work

- `components/home/office/hqAssistantContext.ts`
  - prepared-workspace selection now checks ranked unfinished sessions first
  - if a strong unfinished match exists, HQ reuses that exact session instead of inventing a fresh route suggestion

- `components/home/office/OfficeCommandCenter.tsx`
  - successful turns now remember strong prepared exact sessions as unfinished work
  - the memory stores intent, query, confidence, and completion state

### 4. Extended route auto-heal beyond fresh prepared workspaces

- `components/ui/PreparedWorkspaceAutoHeal.tsx`
  - broad route opens can now recover from either:
    - a fresh prepared workspace
    - or the strongest unfinished exact session for that route
  - exact session visits now “touch” the unfinished session to keep recency and continuity accurate

### 5. Added regression proof

- `tests/e2e/route-contract.spec.ts`
  - added a browser test proving that a broad `/recon` open restores the strongest stored unfinished exact session (`/recon?view=binary&focus=recon-binary`)

## Outcome

Nexus now has the first real background task-memory loop for assistant-first work:

- HQ can remember strong unfinished exact sessions
- later turns can quietly prefer that prior work
- broad route opens can self-heal into the remembered exact panel
- session continuity now survives past the immediate reply without adding new visible control rows

## Verification

- `npm run type-check`
- `npm run verify`
- `npm run route:e2e`
- `npm run hq:e2e`
- `npm run build`
- `npm run handoff:write`

## Next

Move into the next `BF2` slice:

- surface one strongest unfinished continuation in HQ when confidence is high
- let route shells consume unfinished-session memory before broad defaults
- begin reducing persistent action density now that continuity is stronger
