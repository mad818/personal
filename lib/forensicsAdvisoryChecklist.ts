/**
 * Defensive digital-forensics advisory checklist.
 * Pattern reference: Autopsy investigation workflow (Hackers Arise article).
 * Advisory-only — no Autopsy bundling, no automated disk imaging in Nexus.
 */

export interface ForensicsAdvisoryStep {
  id: string;
  phase: "preserve" | "collect" | "analyze" | "report";
  action: string;
  nexusNote: string;
}

export const FORENSICS_ADVISORY_STEPS: readonly ForensicsAdvisoryStep[] = [
  {
    id: "chain-of-custody",
    phase: "preserve",
    action: "Document who collected evidence, when, and from which system.",
    nexusNote: "File artifact metadata in VAULT with tags: forensics, chain-of-custody.",
  },
  {
    id: "volatile-first",
    phase: "collect",
    action: "Capture volatile artifacts (running processes, network connections) before shutdown.",
    nexusNote: "CYBER lane stays read-only — operator runs external tools; Nexus records findings only.",
  },
  {
    id: "disk-image",
    phase: "collect",
    action: "Create verified disk/image copies; hash before analysis.",
    nexusNote: "Do not mount writable images inside Nexus runtime.",
  },
  {
    id: "timeline",
    phase: "analyze",
    action: "Build event timeline: logon, process creation, network, file writes.",
    nexusNote: "Use RECON casefile pattern for structured operator notes.",
  },
  {
    id: "ioc-correlation",
    phase: "analyze",
    action: "Correlate IOCs with CVE/threat-intel feeds already in live context.",
    nexusNote: "Cross-ref CIPHER triage + aiExposureReview packs — passive only.",
  },
  {
    id: "report-pack",
    phase: "report",
    action: "Produce executive summary + technical appendix with evidence pointers.",
    nexusNote: "Export via VAULT compiled page; no raw secrets in cloud-bound prompts.",
  },
] as const;

export function buildForensicsAdvisoryBlock(agentId: string): string {
  if (agentId.toLowerCase() !== "cipher") return "";
  const lines = FORENSICS_ADVISORY_STEPS.map(
    (step) => `${step.phase.toUpperCase()}: ${step.action}`,
  );
  return (
    `\n[FORENSICS ADVISORY — defensive checklist only]\n` +
    `Source pattern: Autopsy investigation workflow (external operator tooling).\n` +
    `${lines.join("\n")}\n` +
    `Nexus does not run Autopsy or mutate evidence volumes.\n` +
    `[END FORENSICS ADVISORY]\n`
  );
}

export function summarizeForensicsAdvisory(): string {
  return `${FORENSICS_ADVISORY_STEPS.length} phased steps · preserve → report · operator-executed`;
}
