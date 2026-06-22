// OWASP/APTS pattern — governance vocabulary for autonomous agent review.
// Does not claim APTS conformance; supplies operator review language only.

export type AgentAutonomyDomainId =
  | "scope-enforcement"
  | "safety-controls"
  | "human-oversight"
  | "auditability"
  | "manipulation-resistance"
  | "provider-trust";

export interface AgentAutonomyReviewDomain {
  id: AgentAutonomyDomainId;
  label: string;
  summary: string;
  reviewQuestions: string[];
}

export const AGENT_AUTONOMY_REVIEW_DOMAINS: AgentAutonomyReviewDomain[] = [
  {
    id: "scope-enforcement",
    label: "Scope enforcement",
    summary: "Autonomous work stays inside declared route, tool, and mission boundaries.",
    reviewQuestions: [
      "Is the mission scope written before background or scheduled work starts?",
      "Does the run refuse tasks outside the declared surface or capability?",
    ],
  },
  {
    id: "safety-controls",
    label: "Safety controls",
    summary: "Risky capabilities remain gated, redacted, and fail-closed when posture is incomplete.",
    reviewQuestions: [
      "Are high-risk tools blocked or approval-gated when isolation is unavailable?",
      "Does privacy shield stay active for every cloud-bound call?",
    ],
  },
  {
    id: "human-oversight",
    label: "Human oversight",
    summary: "Operators can stop, review, and promote outcomes without hidden automation.",
    reviewQuestions: [
      "Is there a visible stop path and re-entry summary for long-running missions?",
      "Are durable memory writes and promotions human-approved?",
    ],
  },
  {
    id: "auditability",
    label: "Auditability",
    summary: "Evidence, receipts, and source trails survive the session.",
    reviewQuestions: [
      "Can the operator see which memories, packs, and redactions shaped the answer?",
      "Are advisory reviews filed to VAULT with provenance when required?",
    ],
  },
  {
    id: "manipulation-resistance",
    label: "Manipulation resistance",
    summary: "Prompt-threat taxonomy and instruction hierarchy resist bypass pressure.",
    reviewQuestions: [
      "Are jailbreak, obfuscation, and authority-inversion patterns detected defensively?",
      "Does the agent refuse scope expansion or secret disclosure requests?",
    ],
  },
  {
    id: "provider-trust",
    label: "Provider trust",
    summary: "External model and connector trust stays explicit and BYOK-aligned.",
    reviewQuestions: [
      "Are provider routes documented with failover and redaction posture?",
      "Is any external MCP or connector dependency optional and operator-approved?",
    ],
  },
];

export function buildAgentAutonomyReviewMarkdown(
  notes: Partial<Record<AgentAutonomyDomainId, string>>,
) {
  return AGENT_AUTONOMY_REVIEW_DOMAINS.map((domain) => {
    const note = notes[domain.id]?.trim() || "Not reviewed in this pass.";
    return `## ${domain.label}\n${domain.summary}\n\nOperator note: ${note}`;
  }).join("\n\n");
}
