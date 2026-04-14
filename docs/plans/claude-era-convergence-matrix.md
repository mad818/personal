# Claude-Era Convergence Matrix

**Updated:** 2026-04-05  
**Purpose:** classify the major additions that landed after the late March / early April hardening cycle so route support, docs, and engineering effort reflect reality.

## Lanes

| Lane | Owns | Goal |
|---|---|---|
| `core-hardening` | auth, release proof, route contract, runtime identity, GA shell consistency | ship a trustworthy GA surface |
| `internal-workbench` | workflow forge, registry, blacksite, doctrine, sweep/geo-delta | keep operator tooling useful without implying GA support |
| `agent-runtime` | learnings, regression suite, provider health, stack context, vault graph, council/persona | converge the agent layer into a smaller trustworthy core |

## Status Legend

| Status | Meaning |
|---|---|
| `GA` | part of the supported release contract for this cycle |
| `internal` | intentionally available, locally useful, but not part of GA support |
| `experimental` | present in code, not yet trustworthy enough to market as stable |
| `defer` | visible idea/scaffold that should not grow until earlier convergence work lands |

## Capability Matrix

| Capability | Lane | Status | Evidence | Notes |
|---|---|---|---|---|
| Cookie-backed auth flow + auth diagnostics | `core-hardening` | `GA` | `components/auth/AuthGate.tsx`, `app/api/auth-diagnostics/route.ts`, `app/auth/*` | Core contract; keep as the only supported unlock path |
| Auth/browser regression lanes | `core-hardening` | `GA` | `playwright.auth.config.ts`, `tests/e2e/auth.spec.ts`, `tests/e2e/hq-shell.spec.ts`, `tests/e2e/route-contract.spec.ts` | Must stay green before promoting anything else |
| Completion program + regression memory docs | `core-hardening` | `GA` | `docs/plans/nexus-completion-program-2026.md`, `docs/regression-memory-checklist.md`, `docs/auth-hardening-plan.md` | Treat as release gates, not just narrative docs |
| Workflow Forge definitions | `internal-workbench` | `internal` | `components/skills/WorkflowForge.tsx`, `app/api/workflows/route.ts` | Local persisted templates are useful, but they are not public product surface |
| Workflow runs | `internal-workbench` | `experimental` | `app/api/workflow-runs/route.ts` | Run artifacts are synthesized today; keep explicitly marked as derived/simulated |
| Registry items + kits | `internal-workbench` | `internal` | `components/resources/RegistryConsole.tsx`, `app/api/registry/route.ts` | Real local persistence, seeded defaults, not GA |
| Blacksite model lab | `internal-workbench` | `experimental` | `components/skills/BlacksiteLab.tsx`, `app/api/model-lab/route.ts` | Heuristic scoring, not provider-backed evaluation |
| Security doctrine matrix | `internal-workbench` | `internal` | `components/security/SecurityDoctrineMatrix.tsx`, `app/api/security/*` | Useful operator checklist surface; still internal |
| Sweep engine + SSE progress | `internal-workbench` | `internal` | `components/intel/SweepEnginePanel.tsx`, `app/api/events/sweeps/route.ts`, `app/api/sweeps/route.ts` | Live source aggregation is real; snapshot enrichment still needs clearer contract |
| Geo delta snapshots | `internal-workbench` | `experimental` | `components/intel/GeoDeltaPanel.tsx`, `app/api/geo-delta/route.ts` | Persisted locally, but derived coordinates/labels still act like placeholder evidence |
| Agent learnings capture | `agent-runtime` | `internal` | `lib/agentLearnings.ts`, `app/api/agent-learnings/route.ts` | Valuable runtime memory, but needs tighter test coverage |
| Agent regression suite + health card | `agent-runtime` | `internal` | `tasks/agent-suite.json`, `scripts/verify-agents.js`, `app/api/agent-health/route.ts`, `components/command/AgentHealthCard.tsx` | Good quality signal, still maturing |
| Provider health + usage guard | `agent-runtime` | `internal` | `lib/aiProviderHealth.ts`, `lib/aiUsageGuard.ts`, `app/api/health/providers/route.ts`, `app/api/health/usage/route.ts` | Operationally useful, should stay admin/operator oriented |
| Persona modes + council panel | `agent-runtime` | `experimental` | `lib/personaEngine.ts`, `components/home/office/PersonaModeBar.tsx`, `components/home/office/CouncilResultsPanel.tsx` | Promising, but not yet stable enough for default UX |
| Subagent dispatch scaffolding | `agent-runtime` | `defer` | `lib/subagentDispatch.ts` | Keep out of the mainline until council/runtime contracts settle |
| Stack context injection | `agent-runtime` | `internal` | `lib/projectContext.ts`, `components/command/ProjectStackCard.tsx` | Helpful, but currently static doctrine rather than true detection |
| Dynamic UI rules + alerts | `agent-runtime` | `experimental` | `lib/uiRules.ts`, `hooks/useUIRules.ts`, `components/home/DynamicAlerts.tsx` | Keep gated until alert semantics and header injection are fully coherent |
| Vault graph + librarian | `agent-runtime` | `experimental` | `lib/vaultGraph.ts`, `components/vault/VaultGraphView.tsx`, `components/vault/VaultLibrarianPanel.tsx` | Strong direction, but needs contract and smoke coverage |

## Immediate Convergence Rules

1. Only `GA` items should drive support-matrix promises, nav language, and release-readiness claims.
2. Any internal workbench API must return metadata that makes its support level and simulation posture explicit.
3. Any UI copy that says `auto-detected`, `live`, or `ready` must be literally true for the current implementation.
4. `experimental` additions can stay in the repo, but they should not silently masquerade as canonical workflow or validated evidence.
5. `defer` additions should avoid new scope until auth/release/workbench contract work is stable.
