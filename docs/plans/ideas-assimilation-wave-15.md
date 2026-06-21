# Nexus Ideas Assimilation Wave 15 — External Links Product Closure

Status: active execution map  
Date: 2026-06-20

Closes the remaining **code-implementable** items from `docs/ideas/external-links-mapping.md` and Batch 3–7 of `docs/plans/ideas-assimilation-plan-3.md` that were not already shipped in waves 1–14.

## Baseline

- Waves 1–14: intake queue drained, platform depth shipped
- Gate: `npm run assimilation:wave14:check`

## Wave 15 scope

| ID | Source idea | Deliverable |
|----|-------------|-------------|
| **IDEA-1** | GithubProjects #3 — team orchestration | `lib/teamOrchestration.ts` + HQ strip + dispatch context |
| **IDEA-2** | oliviscusAI Dexter #14 | `lib/alphaTradeThesis.ts` + ALPHA thesis panel |
| **IDEA-3** | mukul975/Anthropic-Cybersecurity-Skills | `lib/cybersecuritySkillTaxonomy.ts` + CIPHER live context |
| **IDEA-4** | tirth8205/code-review-graph | `project_impact` agent tool wrapping `lib/projectImpact.ts` |
| **IDEA-5** | jamwithai/production-agentic-rag-course | `lib/ragEvalScoring.ts` + async RAG eval block |
| **IDEA-6** | heyrimsha prompt recipes | `lib/promptRecipes.ts` registry + validator wiring proof |

## Explicit exclusions (unchanged policy)

- G0DM0D3 / jailbreak user features
- Offensive OSINT tooling (GhostTrack, pentestagent automation)
- TurboVault external vault integration
- TensorTrade / full backtesting product
- Knowledge graph UI (defer until vault graph proves value)
- OCR ingest (defer unless operator requests)

## Proof lane

`npm run assimilation:wave15:check` → `npm run verify`
