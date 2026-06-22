export interface CybersecurityControlFamily {
  id: string;
  label: string;
  frameworks: string[];
  checklist: string[];
  responseShape: string[];
}

export const CYBERSECURITY_SKILL_SOURCE = {
  repo: "mukul975/Anthropic-Cybersecurity-Skills",
  url: "https://github.com/mukul975/Anthropic-Cybersecurity-Skills",
  assimilationMode: "defensive taxonomy reference only — no skill library vendored",
} as const;

export const CYBERSECURITY_CONTROL_FAMILIES: readonly CybersecurityControlFamily[] = [
  {
    id: "identity-access",
    label: "Identity & access",
    frameworks: ["NIST CSF", "CIS Controls"],
    checklist: [
      "Confirm least-privilege and explicit auth boundary for the affected surface.",
      "Record whether credentials, sessions, or tokens are in scope.",
    ],
    responseShape: ["verdict", "affected surface", "control gap", "remediation"],
  },
  {
    id: "data-protection",
    label: "Data protection",
    frameworks: ["NIST CSF", "ISO 27001"],
    checklist: [
      "Classify data sensitivity before recommending exposure or logging changes.",
      "Prefer redaction and operator-controlled handling for incident evidence.",
    ],
    responseShape: ["data class", "exposure path", "containment", "verify-next"],
  },
  {
    id: "detection-response",
    label: "Detection & response",
    frameworks: ["MITRE ATT&CK", "NIST IR"],
    checklist: [
      "Map finding to tactic/technique when evidence supports it.",
      "Stay advisory — no automated exploitation or lateral movement.",
    ],
    responseShape: ["severity", "tactic hint", "evidence", "operator next step"],
  },
  {
    id: "secure-engineering",
    label: "Secure engineering",
    frameworks: ["OWASP ASVS", "SSDF"],
    checklist: [
      "Name exact file/route pattern when the finding touches Nexus code.",
      "Patch surgically; re-read patched section before claiming done.",
    ],
    responseShape: ["pattern class", "file/route", "fix", "residual risk"],
  },
  {
    id: "governance",
    label: "Governance & assurance",
    frameworks: ["OWASP APTS", "CIS Controls"],
    checklist: [
      "Human approval before high-risk tool execution or external writes.",
      "Keep audit trail language — who approved, what changed, what proof exists.",
    ],
    responseShape: ["policy fit", "approval gate", "evidence pack", "residual risk"],
  },
] as const;

export function buildCybersecuritySkillTaxonomyBlock(agentId: string): string {
  if (agentId.toLowerCase() !== "cipher") return "";
  const families = CYBERSECURITY_CONTROL_FAMILIES.map(
    (family) =>
      `- ${family.label}: ${family.checklist[0]} Response: ${family.responseShape.join(" → ")}.`,
  );
  return (
    `\n[CYBERSECURITY SKILL TAXONOMY — defensive reference]\n` +
    `Source pattern: ${CYBERSECURITY_SKILL_SOURCE.repo} (taxonomy only)\n` +
    `${families.join("\n")}\n` +
    `[END CYBERSECURITY SKILL TAXONOMY]\n`
  );
}

export function summarizeCybersecuritySkillTaxonomy(): string {
  return `${CYBERSECURITY_CONTROL_FAMILIES.length} control families · ${CYBERSECURITY_SKILL_SOURCE.assimilationMode}`;
}
