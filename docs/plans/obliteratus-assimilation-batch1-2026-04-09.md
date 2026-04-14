# OBLITERATUS Assimilation Batch 1 — observable AI hardening loop

## Why

The strongest safe product idea in `elder-plinius/OBLITERATUS` is not the refusal-removal goal. It is the workflow shape:

- every intervention is staged
- every stage is observable
- the operator can compare current coverage and act from the same surface

Nexus already has shared truth-boundary helpers and visible evidence posture on several answer surfaces, but it still lacked a live console that answers:

- which AI-heavy surfaces are already visibly evidence-hardened
- which ones still rely on a silent prompt boundary only
- which exact repair session should open next

That made hallucination hardening harder to operate as an engineering discipline.

## Scope

In scope:

- Add a shared local contract for an observable AI hardening loop and tracked surface coverage
- Build a Nexus-native AI hardening coverage panel
- Mount it inside `SECURITY > AI Surface`
- Keep all actions routed into existing exact repair sessions and audit surfaces

Out of scope:

- Unsafe model-editing or refusal-removal features
- A full benchmark/chat lab in this batch
- Provider behavior changes beyond the truth-boundary and evidence-posture work already landed

## Implementation plan

1. Add a shared hardening-stage and coverage contract for the highest-risk Nexus AI surfaces
2. Build a compact coverage panel that distinguishes visible evidence posture from boundary-only coverage
3. Mount that panel in `SECURITY > AI Surface`
4. Refresh task tracking and handoff docs
5. Re-run verification and live route checks

## Done when

- `SECURITY > AI Surface` shows an observable hardening loop and tracked coverage map
- The panel clearly distinguishes visible evidence posture from boundary-only coverage
- Each tracked surface has exact repair or analysis launchers
- `npm run type-check`, `npm run verify`, and `npm run handoff:write` pass
- Live `127.0.0.1:3000` checks succeed on `/security?view=ai&focus=security-ai-surface` and `/resources?view=playbooks&playbook=hallucination-hardening`
