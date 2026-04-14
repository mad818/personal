# AI Hallucination Hardening Batch 1 — 2026-04-09

## Why

Nexus already has pockets of grounded behavior: memory ask returns citations and confidence, research prompts encourage source use, and the AI runtime is centralized. The weak point is consistency. Shared AI calls still rely too much on soft prompt phrasing, which leaves room for confident fabrication when evidence is thin, current facts are unavailable, or tool results were never actually observed.

This batch treats hallucination control as a runtime-quality problem:

1. Make the anti-fabrication boundary shared and explicit.
2. Reuse the same discipline across the main system prompt and specialist agent prompts.
3. Surface hallucination mitigation as an engineering audit pattern inside Resources so it stays inspectable and repeatable.

## Scope

In scope:

- Add a reusable truth-boundary / evidence-discipline helper
- Strengthen the main `buildSystemPrompt(...)` contract
- Reinforce specialist prompts with a small shared anti-hallucination posture
- Update Resources architecture/playbook content for AI hallucination hardening
- Add focused tests for the new prompt contract

Out of scope:

- New providers or model changes
- Heavy UI bureaucracy around confidence scoring on every response
- Rewriting individual feature prompts surface-by-surface

## Implementation plan

1. Add a shared `lib/aiTruthBoundary.ts` helper with:
   - anti-fabrication rules
   - observed / inferred / uncertain / verify-next discipline
   - a lightweight agent-facing reinforcement block
2. Inject that discipline into:
   - `lib/ai.ts` main system prompt builder
   - `components/home/office/prompts.ts` specialist prompt layer
3. Extend Resources engineering guidance by:
   - hardening the AI runtime system map with hallucination-specific guardrails/audit checks
   - adding a hallucination-hardening playbook to the Playbooks lane
4. Add tests that prove the shared system prompt now includes the truth boundary
5. Re-run verification and confirm live reachability on the touched surfaces

## Done when

- Shared AI prompts explicitly forbid fabricated sources/tool results and require uncertainty posture when evidence is thin
- Specialist agent prompts inherit the same truthfulness discipline
- Resources exposes hallucination mitigation as an engineering audit/playbook, not just hidden prompt text
- `npm run type-check`, `npm run verify`, `npm run handoff:write` pass
- Live route checks succeed on `127.0.0.1:3000`, `/resources?view=system&system=ai-runtime-boundary`, and `/resources?view=playbooks`
