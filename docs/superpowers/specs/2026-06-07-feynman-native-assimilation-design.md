# Feynman Native Assimilation Design

## Goal

Assimilate the complete useful Feynman research-agent capability model into Nexus Prime without installing a second agent runtime, requiring paid services, changing the visual system, or weakening local-first security.

## Source

- X source: `https://x.com/advaitpaliwal/status/2036900468056875332`
- Upstream reference: `https://github.com/getcompanion-ai/feynman`
- Upstream patterns are adapted under their MIT license. Nexus does not vendor the upstream runtime, prompts, authentication system, or provider integrations.

## Native Architecture

Nexus keeps its existing HQ command lane, NOVA/JANSKY agents, `/api/tools` boundary, `callAI()`-backed internal AI route, scheduler, and VAULT compiled pages. A new typed Feynman engine coordinates four explicit research stages:

1. **Researcher** gathers and triages direct sources.
2. **Writer** produces a structured source-grounded draft.
3. **Verifier** audits claim-to-source links and assigns claim verdicts.
4. **Reviewer** grades critical issues and produces revision/open-question guidance.

The engine returns one final markdown artifact containing the research plan, evidence ledger, synthesis, claim audit, review findings, provenance, and next action. Explicit workflows automatically file through the existing compiled-memory-page path.

## Complete Workflow Family

The existing workflow command registry will expose:

- `/deepresearch` - focused multi-source investigation
- `/lit` and `/lit-review` - literature review with consensus, disagreements, methodology, and gaps
- `/review` - severity-graded peer review
- `/audit` - claim/source/paper/repository mismatch audit
- `/replicate` - approval-gated replication plan and verification contract
- `/recipe` - ranked implementation or ML recipe with source and verification status
- `/compare` - source comparison matrix
- `/draft` - paper-style draft grounded in supplied evidence
- `/autoresearch` - bounded, approval-gated experiment-loop plan
- `/watch` - recurring research-watch artifact and scheduler-ready human-gated template
- `/outputs` - real index of recent Feynman research artifacts stored in VAULT

## Evidence And Audit Contract

Every source-backed workflow must preserve direct URLs, distinguish primary/official/secondary/self-reported evidence when possible, state coverage gaps, and never fabricate source access. Critical claims receive one verdict:

- `supported`
- `partial`
- `conflicting`
- `unsupported`
- `unverifiable`

The final artifact includes source count, citation count, verification status, unresolved gaps, and a provenance section. Unsupported or unverifiable claims are downgraded or called out instead of presented as settled facts.

## Safety And Execution Boundaries

- All AI synthesis uses the existing internal AI boundary; no provider is called directly.
- Source collection uses existing guarded Nexus tools and network policy.
- Replication and autoresearch generate plans by default. Package installation, code execution, training, paid compute, and external writes require explicit operator approval through existing protected-action controls.
- Research watches remain human-gated scheduler templates.
- No new public route, paid dependency, upstream auth store, second CLI runtime, or visual redesign is introduced.
- Existing privacy shield, token auth, risk tiers, isolation policy, and secure-runtime policy remain authoritative.

## Acceptance

- All workflow commands resolve to the correct Feynman-native mode.
- NOVA/JANSKY receive the shared `feynman_research` tool for explicit Feynman workflow intent.
- `/outputs` reads real recent research artifacts from VAULT.
- The engine produces evidence, claim-audit, review, provenance, and approval-gate sections even when AI synthesis degrades.
- A structural validator is wired into `npm run verify`.
- `npm run type-check`, `npm run verify`, and `npm run build` pass.
