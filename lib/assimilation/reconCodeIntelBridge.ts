/**
 * RECON assimilation bridge — code-intelligence and agent-memory routing.
 *
 * Documents the Nexus adaptation point for three P0 repos assimilated in wave 23:
 *
 *  • colbymchenry/codegraph — pre-indexed code knowledge graph for agents
 *    Pattern: static call-graph + symbol index exported as JSON, loaded by agents
 *    at query time instead of re-parsing source on every run.
 *
 *  • rohitg00/agentmemory — persistent agent memory benchmarks
 *    Pattern: episodic memory with recency decay, semantic similarity retrieval,
 *    and benchmark harness to compare memory strategies across workloads.
 *
 *  • Imbad0202/academic-research-skills — academic research skill pack
 *    Pattern: structured skill definitions for paper search, citation extraction,
 *    methodology critique, and reproducibility checks — extends Feynman workflow.
 *
 * Current status: routing reference only (wave 23).
 * Full implementation tracked in source-parity matrices for each repo.
 */

/**
 * Entry points in Nexus where codegraph patterns should wire in when implemented.
 */
export const CODEGRAPH_NEXUS_ROUTES = {
  recon: "app/recon/page.tsx",
  assimilationQueue: "components/recon/RepoAssimilationQueueCard.tsx",
  agentBridge: "lib/agent.ts",
} as const;

/**
 * Entry points in Nexus where agentmemory patterns should wire in.
 */
export const AGENTMEMORY_NEXUS_ROUTES = {
  memoryStore: "lib/memoryPagesStore.ts",
  claudeMem: "docs/ideas/source-parity/claude-mem.json",
  passiveTrail: "components/home/office/MementoCycleStrip.tsx",
} as const;

/**
 * Entry points in Nexus where academic-research-skills patterns should wire in.
 */
export const ACADEMIC_SKILLS_NEXUS_ROUTES = {
  feynmanResearch: "lib/feynmanResearch.ts",
  feynmanWorkflowContracts: "lib/feynmanWorkflowContracts.ts",
  papersPanel: "components/intel/PapersResearchPanel.tsx",
} as const;
