# Feynman literature gap map

## Goal

Complete the pending literature-gap adaptation from `Imbad0202/academic-research-skills` inside Nexus's existing Feynman `lit-review` workflow. The result is a formal output contract, not a second research application or a claim that Nexus can prove novelty.

## Current primary evidence

- Repository: `https://github.com/Imbad0202/academic-research-skills`
- Reviewed commit: `1788e08155d24da729233e3e4b480ffb53d799c6`
- Reported release: `v3.19.0`
- License reported by the current README: `CC BY-NC 4.0`
- Relevant evidence:
  - `deep-research/references/mode_selection_guide.md` describes lit-review output with an evidence matrix and research gaps.
  - `deep-research/agents/research_question_agent.md` treats novelty as a question to assess, not a fact to assume.
  - `academic-paper/templates/literature_review_template.md` separates research gaps from future directions.

Nexus adapts only the high-level workflow shape. No upstream prompt, template, agent text, or code is copied.

## Contract

The existing `lit-review` output contract must require a `Literature gap map`. Each claimed gap must:

1. identify its coverage dimension: population, setting, timeframe, method, measurement, comparison, replication, or contradiction;
2. cite the directly read source cluster that makes the gap visible;
3. distinguish `observed coverage gap` from `possible research opportunity`;
4. name a competing explanation, including search or retrieval incompleteness;
5. propose one bounded next-study question or evidence-gathering step.

The Verifier rejects gap claims based only on an unread source, absent search results, or one paper's future-work language. The Reviewer flags novelty overreach, duplicate gap rows, and recommendations that do not follow from the evidence map.

## Benefits

- Turns an informal “open questions” paragraph into an auditable gap-to-evidence map.
- Prevents missing search coverage from being mislabeled as a novel research opportunity.
- Gives the operator a bounded, evidence-backed next-study agenda without executing experiments or writing a paper.
- Reuses the same Writer, Verifier, Reviewer, final-report, and degraded-fallback paths already shipped in Feynman.

## Boundaries

- No new route, panel, provider call, model, state slice, storage format, scheduler, plugin, dependency, or upstream runtime.
- No autonomous novelty determination, exhaustive-literature claim, citation fabrication, experiment execution, paper submission, publication, or external write.
- No copied CC BY-NC prompt or template language.
- No phone/PWA or private RPG path.

## Acceptance

- `lit-review` requires `Literature gap map` in its visible report contract.
- Writer, Verifier, Reviewer, and acceptance checks enforce evidence, classification, competing explanations, and bounded next-study guidance.
- Runtime fixtures prove the gap contract reaches prompts, final reports, and degraded fallback.
- The academic-research-skills gap-analysis parity row is adapted with current source and license evidence.
- Focused Feynman, source-parity, TypeScript, lint, canonical verify, handoff, and changed-path checks pass.
