// AgentShield pattern — local checklist for agent config and MCP permission posture.
// No runtime scanner dependency; advisory operator review only.

export type AgentShieldCheckId =
  | "tool-permission-scope"
  | "mcp-origin-trust"
  | "secret-handling"
  | "mutation-gates"
  | "connector-opt-in"
  | "audit-trail";

export interface AgentShieldCheckItem {
  id: AgentShieldCheckId;
  label: string;
  question: string;
  passCriteria: string;
  failSignal: string;
}

export const AGENT_SHIELD_CHECKS: AgentShieldCheckItem[] = [
  {
    id: "tool-permission-scope",
    label: "Tool permission scope",
    question: "Does every enabled tool have an explicit risk tier and approval gate?",
    passCriteria:
      "High-risk tools require operator approval; catalog entries map to policy in toolIsolationPolicy.",
    failSignal: "Silent exec, shell, or filesystem writes without a visible approval lane.",
  },
  {
    id: "mcp-origin-trust",
    label: "MCP origin trust",
    question: "Are external MCP connectors limited to operator-approved origins?",
    passCriteria:
      "Connector descriptors are documented; unknown MCP servers stay outside the default runtime.",
    failSignal: "Arbitrary MCP endpoints reachable without trust review or OAuth posture.",
  },
  {
    id: "secret-handling",
    label: "Secret handling",
    question: "Are secrets kept local and redacted before cloud-bound inference?",
    passCriteria:
      "Privacy shield redaction receipts cover tokens, paths, and credential-like fragments.",
    failSignal: "Raw secrets or internal hostnames visible in outbound provider payloads.",
  },
  {
    id: "mutation-gates",
    label: "Mutation gates",
    question: "Do write/mutate capabilities require explicit human promotion?",
    passCriteria:
      "Correction memory, lessons, and durable writes stay approval-gated; no silent self-modification.",
    failSignal: "Autonomous production mutation or unreviewed skill write-back.",
  },
  {
    id: "connector-opt-in",
    label: "Connector opt-in",
    question: "Are outbound connectors opt-in rather than always-on?",
    passCriteria:
      "RECON/CYBER connectors use connector_opt_in routes; BYOK keys stay operator-controlled.",
    failSignal: "Default-on third-party scanning or paid API calls without operator intent.",
  },
  {
    id: "audit-trail",
    label: "Audit trail",
    question: "Can the operator reconstruct what influenced a run?",
    passCriteria:
      "Diagnostics show correction memory, privacy receipts, and workflow pack context where relevant.",
    failSignal: "Opaque agent runs with no provenance or operator-visible evidence.",
  },
];

export function summarizeAgentShieldPosture(checkedIds: AgentShieldCheckId[]) {
  const total = AGENT_SHIELD_CHECKS.length;
  const checked = checkedIds.length;
  if (checked === 0) {
    return "No AgentShield checklist items marked — run a passive posture review before widening tool access.";
  }
  if (checked === total) {
    return `All ${total} AgentShield checklist items reviewed for this session.`;
  }
  return `${checked}/${total} AgentShield checklist items reviewed — complete remaining items before promoting connector or tool scope.`;
}
