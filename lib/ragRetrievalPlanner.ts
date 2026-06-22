import type { ArticleReasoningSource } from "@/lib/articleReasoning";
import {
  boostRagConfidenceWithEntities,
  routeQuery,
  type RagConfidencePosture,
} from "@/lib/ragRouter";

export interface RagRetrievalLane {
  id: "vault_memory" | "papers_research" | "saved_articles";
  label: string;
  reason: string;
  priority: "primary" | "secondary";
}

export interface RagRetrievalPlan {
  query: string;
  confidencePosture: RagConfidencePosture;
  boostedConfidence: number;
  entityHits: string[];
  lanes: RagRetrievalLane[];
  operatorNote: string;
}

export function buildRagRetrievalPlan(
  query: string,
  savedArticles?: ArticleReasoningSource[],
): RagRetrievalPlan {
  const normalized = query.trim();
  const base = routeQuery(normalized);
  const { boostedConfidence, entityHits } = boostRagConfidenceWithEntities(
    normalized,
    savedArticles,
  );

  let confidencePosture: RagConfidencePosture = "low";
  if (boostedConfidence >= 0.66) confidencePosture = "high";
  else if (boostedConfidence >= 0.4) confidencePosture = "medium";

  const lanes: RagRetrievalLane[] = [];
  const q = normalized.toLowerCase();

  if (
    /\b(vault|memory|compiled|artifact|archive|librarian)\b/i.test(normalized)
  ) {
    lanes.push({
      id: "vault_memory",
      label: "VAULT memory spine",
      reason: "Query references local archive or memory artifacts.",
      priority: "primary",
    });
  }

  if (
    /\b(paper|arxiv|hugging\s*face|research|lit[- ]?review|publication)\b/i.test(
      normalized,
    )
  ) {
    lanes.push({
      id: "papers_research",
      label: "INTEL papers lane",
      reason: "Query references academic or papers research tooling.",
      priority: lanes.length ? "secondary" : "primary",
    });
  }

  if ((savedArticles?.length ?? 0) > 0 && entityHits.length > 0) {
    lanes.push({
      id: "saved_articles",
      label: "Saved article reasoning",
      reason: `Entity overlap: ${entityHits.slice(0, 3).join(", ")}`,
      priority: lanes.length ? "secondary" : "primary",
    });
  }

  if (!lanes.length) {
    lanes.push({
      id: "saved_articles",
      label: base.strategy.domain,
      reason: base.strategy.rationale,
      priority: "primary",
    });
  }

  const operatorNote =
    lanes.length > 1
      ? "Multi-lane retrieval plan — prefer primary lane before widening."
      : "Single-lane retrieval plan from keyword router.";

  return {
    query: normalized,
    confidencePosture,
    boostedConfidence,
    entityHits,
    lanes,
    operatorNote,
  };
}

export function formatRagRetrievalPlanBlock(plan: RagRetrievalPlan): string {
  if (!plan.query) return "";
  const laneLines = plan.lanes
    .map(
      (lane, index) =>
        `${index + 1}. ${lane.label} (${lane.priority}) — ${lane.reason}`,
    )
    .join("\n");
  return (
    `\n[RAG RETRIEVAL PLAN]\n` +
    `Confidence posture: ${plan.confidencePosture} (${Math.round(plan.boostedConfidence * 100)}%)\n` +
    `${plan.entityHits.length ? `Entity hits: ${plan.entityHits.slice(0, 4).join(", ")}\n` : ""}` +
    `Lanes:\n${laneLines}\n` +
    `${plan.operatorNote}\n` +
    `[END RAG RETRIEVAL PLAN]\n`
  );
}
