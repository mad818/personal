## Feynman + Pentagi + RTK Assimilation — Batch 1

### Purpose

Assimilate the strongest patterns from:

- `getcompanion-ai/feynman`
- `vxcontrol/pentagi`
- `rtk-ai/rtk`

without vendoring their code or pulling Nexus into unsafe/off-mission behavior.

### What to borrow

- Feynman:
  - explicit research workflows instead of generic “go research this”
  - compact, cited, operator-grade briefs
  - reusable command grammar for common analysis modes
- Pentagi:
  - evidence-first cyber investigation flow
  - defensive incident packaging
  - clear triage / validation / containment structure
- RTK:
  - compact response contracts
  - structured command execution instead of rambling prose
  - fewer free-form answers when an operator needs an actionable artifact

### Guardrails

- No offensive automation.
- No exploit guidance.
- No vendored upstream code.
- Keep everything inside existing Nexus shell and routing patterns.
- Treat these repos as pattern references only.

### Batch 1 scope

1. Add reusable HQ workflow slash commands:
   - `/deepresearch`
   - `/lit-review`
   - `/compare`
   - `/brief`
   - `/threat-hunt`
   - `/evidence-pack`
2. Route those commands into the right Nexus fronts and specialist agents.
3. Enforce compact structured output contracts for those commands.
4. Surface the new workflow ideas in the Field Manual so the operator can rediscover the upstream references in-product.

### Batch 1 implementation targets

- `components/home/office/workflowCommands.ts`
- `components/home/office/OfficeCommandCenter.tsx`
- `components/home/office/prompts.ts`
- `lib/chatCapabilityRouting.ts`
- `lib/developerResources.ts`
- `tasks/todo.md`
- `docs/handoff-supplement.md`

### Delivered outcome

- HQ gains explicit research and cyber workflow grammar instead of relying only on free-form prompts.
- Research workflows become more Feynman-like: structured, cited, and compact.
- Cyber workflows become more Pentagi-like: evidence-first, defensive, and operator-readable.
- Output discipline becomes more RTK-like: concise response contracts with actionable sections.

### Follow-up after Batch 1

1. Turn the new workflow commands into scheduler mission templates.
2. Add skill governance metadata and a true cyber pack baseline (`A6`).
3. Persist workflow artifacts into VAULT / Registry custody conventions.
4. Add targeted tests around command parsing and route coupling once local Vitest execution is restored.
