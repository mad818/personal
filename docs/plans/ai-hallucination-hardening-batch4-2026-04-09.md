# AI Hallucination Hardening Batch 4 — 2026-04-09

## Why

Batch 3 made evidence posture visible on briefing and strategic-analysis surfaces, but the most consequential COMMAND advice panels still render generated output as one undifferentiated block.

That leaves several high-impact recommendations looking more certain than they should:

- career-risk scoring and mitigation steps in `JobRiskAnalyzer`
- business-building guidance in `BusinessBuilder`
- daily action planning in `FocusPanel`

This batch extends the same visible truthfulness posture into those action-oriented panels.

## Scope

In scope:

- Extend the shared structured-evidence helper so action-oriented answers can carry:
  - summary
  - observed facts
  - inferred recommendations
  - verify-next checks
  - optional concrete actions
  - optional numeric score
- Apply that contract to:
  - `components/command/JobRiskAnalyzer.tsx`
  - `components/command/BusinessBuilder.tsx`
  - `components/command/FocusPanel.tsx`

Out of scope:

- Reworking every remaining direct-call surface in one pass
- Dense per-row surfaces like `BuyBot`
- Backend changes or provider changes

## Implementation plan

1. Extend `lib/aiStructuredEvidence.ts` for action-oriented evidence payloads
2. Update `JobRiskAnalyzer` to request and render structured risk posture plus action steps
3. Update `BusinessBuilder` to render structured stage guidance with visible evidence posture
4. Update `FocusPanel` to render structured daily-plan posture instead of raw prose only
5. Add or extend tests for the richer structured parser contract
6. Re-run verification and live `/command` route checks

## Done when

- The touched COMMAND advice panels visibly distinguish observed facts from inferred recommendations
- Action-oriented panels keep concrete next steps without hiding uncertainty
- The shared evidence format stays compact and reusable
- `npm run type-check`, `npm run verify`, and `npm run handoff:write` pass
- Live `127.0.0.1:3000` checks succeed on `/hq`, `/command`, and the relevant Resources playbook view
