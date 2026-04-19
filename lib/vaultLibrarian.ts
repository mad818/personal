import type {
  VaultLintResult,
  VaultSynthesis,
} from "@/components/home/office/types";
import { buildVaultGraphFocusHref } from "@/components/vault/vaultGraphPageUtils";
import type { ResearchSourceRef } from "@/lib/researchSources";
import type { VaultStewardshipSnapshot } from "@/lib/vaultStewardship";

function cleanInline(value: string, max = 160) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1).trimEnd()}…`;
}

function parseMarkdownSections(content: string) {
  const sections = new Map<string, string>();
  const matches = Array.from(
    content.matchAll(/^## ([^\n]+)\n([\s\S]*?)(?=^## |\s*$)/gm),
  );
  for (const match of matches) {
    const heading = match[1]?.trim().toLowerCase();
    const body = match[2]?.trim();
    if (!heading) continue;
    sections.set(heading, body && body !== "Pending input." ? body : "");
  }
  return sections;
}

export interface VaultLibrarianBriefSections {
  vaultPosture: string;
  topClusters: string;
  topGaps: string;
  highestPriorityRepairs: string;
  strongestNextSession: string;
}

export interface VaultLibrarianAction {
  href: string;
  label: string;
  detail: string;
}

export function formatVaultLibrarianBrief(
  sections: VaultLibrarianBriefSections,
) {
  return [
    ["Vault posture", sections.vaultPosture],
    ["Top clusters", sections.topClusters],
    ["Top gaps", sections.topGaps],
    ["Highest-priority repairs", sections.highestPriorityRepairs],
    ["Strongest next session", sections.strongestNextSession],
  ]
    .map(([heading, value]) => `## ${heading}\n${value.trim() || "Pending input."}`)
    .join("\n\n");
}

export function parseVaultLibrarianMarkdown(
  content: string,
): VaultLibrarianBriefSections {
  const sections = parseMarkdownSections(content);
  return {
    vaultPosture: sections.get("vault posture") ?? "",
    topClusters: sections.get("top clusters") ?? "",
    topGaps: sections.get("top gaps") ?? "",
    highestPriorityRepairs: sections.get("highest-priority repairs") ?? "",
    strongestNextSession: sections.get("strongest next session") ?? "",
  };
}

export function buildVaultLibrarianTitle() {
  return "Vault librarian · Archive audit";
}

export function buildVaultLibrarianNextSession(input: {
  snapshot: VaultStewardshipSnapshot;
  selectedNodeId?: string | null;
  selectedNodeTitle?: string | null;
}): VaultLibrarianAction {
  const selectedNodeId = input.selectedNodeId?.trim() ?? "";
  const selectedNodeTitle = input.selectedNodeTitle?.trim() ?? "";
  if (selectedNodeId) {
    return {
      label: selectedNodeTitle
        ? `Open exact graph focus for ${selectedNodeTitle}.`
        : "Open exact graph focus for the selected node.",
      detail:
        "Stay in the relations chamber and reopen the exact selected artifact before widening repair work.",
      href: buildVaultGraphFocusHref({ nodeId: selectedNodeId }),
    };
  }
  if (input.snapshot.orphanCount > 0) {
    return {
      label: "Recover orphaned archive links.",
      detail:
        "Open the orphan graph repair lane before broad archive browsing so disconnected artifacts get repaired first.",
      href: buildVaultGraphFocusHref({ graphAudit: "orphans" }),
    };
  }
  if (input.snapshot.routeLessCompiledCount > 0) {
    return {
      label: "Repair route-less compiled pages.",
      detail:
        "Open the compiled-page route repair lane so continuation can reopen the right working surface.",
      href: "/vault?focus=vault-compiled-pages&compiledFilter=route-less",
    };
  }
  if (input.snapshot.untaggedCount > 0) {
    return {
      label: "Repair untagged compiled pages.",
      detail:
        "Open the compiled-page tag repair lane so retrieval and graph edges stay stronger.",
      href: "/vault?focus=vault-compiled-pages&compiledFilter=untagged",
    };
  }
  if (input.snapshot.noBacklinkCount > 0 || input.snapshot.underlinkedCount > 0) {
    return {
      label: "Repair archive compounding links.",
      detail:
        "Reopen graph focus and strengthen backlink coverage before the archive drifts into one-way capture.",
      href: buildVaultGraphFocusHref(),
    };
  }
  return {
    label: "Open graph focus.",
    detail:
      "Reopen the relations chamber and inspect current topology before promoting or exporting anything else.",
    href: buildVaultGraphFocusHref(),
  };
}

export function buildVaultLibrarianActions(input: {
  snapshot: VaultStewardshipSnapshot;
  selectedNodeId?: string | null;
  selectedNodeTitle?: string | null;
}) {
  const actions: VaultLibrarianAction[] = [];
  const selectedNodeId = input.selectedNodeId?.trim() ?? "";
  const selectedNodeTitle = input.selectedNodeTitle?.trim() ?? "";

  if (selectedNodeId) {
    actions.push({
      href: buildVaultGraphFocusHref({ nodeId: selectedNodeId }),
      label: selectedNodeTitle
        ? `Open ${selectedNodeTitle}`
        : "Open selected node",
      detail:
        "Reopen the exact selected graph node before widening the audit into broader archive repairs.",
    });
  }

  if (input.snapshot.orphanCount > 0) {
    actions.push({
      href: buildVaultGraphFocusHref({ graphAudit: "orphans" }),
      label: "Recover orphans",
      detail:
        "Jump directly into orphan recovery so disconnected archive artifacts are repaired first.",
    });
  }

  if (input.snapshot.routeLessCompiledCount > 0) {
    actions.push({
      href: "/vault?focus=vault-compiled-pages&compiledFilter=route-less",
      label: "Repair route-less pages",
      detail:
        "Open the compiled-page repair lane for artifacts that still lack route continuity.",
    });
  }

  if (input.snapshot.untaggedCount > 0) {
    actions.push({
      href: "/vault?focus=vault-compiled-pages&compiledFilter=untagged",
      label: "Repair untagged pages",
      detail:
        "Open the tag repair lane so retrieval and graph continuity stay strong.",
    });
  }

  if (input.snapshot.noBacklinkCount > 0) {
    actions.push({
      href: buildVaultGraphFocusHref(),
      label: "Repair backlink coverage",
      detail:
        "Open graph focus and add confirming links so durable notes compound instead of staying one-way.",
    });
  }

  if (input.snapshot.underlinkedCount > 0) {
    actions.push({
      href: buildVaultGraphFocusHref(),
      label: "Strengthen underlinked nodes",
      detail:
        "Open graph focus and reconnect thinly linked archive nodes before they drift toward isolation.",
    });
  }

  actions.push({
    href: buildVaultGraphFocusHref(),
    label: "Open graph focus",
    detail:
      "Return to the relations chamber and inspect the current visible topology directly.",
  });

  return actions;
}

export function buildVaultLibrarianBriefSections(input: {
  snapshot: VaultStewardshipSnapshot;
  synthesis: VaultSynthesis | null;
  lint: VaultLintResult | null;
  selectedNodeId?: string | null;
  selectedNodeTitle?: string | null;
}): VaultLibrarianBriefSections {
  const nextSession = buildVaultLibrarianNextSession(input);
  const clusterLines =
    input.synthesis?.clusters
      ?.filter(Boolean)
      .slice(0, 3)
      .map((cluster) => `- ${cleanInline(cluster)}`)
      .join("\n") ?? "";
  const gapLines = [
    ...(input.synthesis?.gaps ?? []),
    ...(input.snapshot.topGapTopics ?? []),
  ]
    .filter(Boolean)
    .slice(0, 4)
    .map((gap) => `- ${cleanInline(gap)}`)
    .join("\n");
  const repairLines = input.snapshot.priorities
    .slice(0, 3)
    .map((priority) => `- ${cleanInline(priority)}`)
    .join("\n");

  return {
    vaultPosture: [
      input.snapshot.summary,
      `Linked coverage: ${input.snapshot.linkedCoverage}% · Tagged coverage: ${input.snapshot.taggedCoverage}% · Route coverage: ${input.snapshot.routeCoverage}%.`,
      `Archive compounding: ${input.snapshot.underlinkedCount} underlinked · ${input.snapshot.noBacklinkCount} without backlinks.`,
      input.synthesis?.summary ? `Synthesis: ${cleanInline(input.synthesis.summary)}` : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
    topClusters:
      clusterLines || "- No dominant clusters recorded in the current audit slice.",
    topGaps:
      gapLines ||
      (input.lint?.gapTopics.length
        ? input.lint.gapTopics
            .slice(0, 4)
            .map((gap) => `- ${cleanInline(gap)}`)
            .join("\n")
        : "- No thin-topic gaps are currently leading the repair queue."),
    highestPriorityRepairs:
      repairLines || "- Archive posture is currently clean enough that no repair lane is leading.",
    strongestNextSession: `- ${nextSession.label}\n- ${nextSession.detail}\n- Exact session: ${nextSession.href}`,
  };
}

export function buildVaultLibrarianSummary(input: {
  snapshot: VaultStewardshipSnapshot;
  synthesis: VaultSynthesis | null;
  selectedNodeTitle?: string | null;
}) {
  const selectedNodeTitle = input.selectedNodeTitle?.trim();
  return cleanInline(
    [
      input.snapshot.summary,
      input.synthesis?.summary ? `Synthesis: ${input.synthesis.summary}` : "",
      selectedNodeTitle ? `Selected node: ${selectedNodeTitle}` : "",
    ]
      .filter(Boolean)
      .join(" "),
    220,
  );
}

export function buildVaultLibrarianTags(snapshot: VaultStewardshipSnapshot) {
  return [
    "vault-librarian",
    "vault-graph",
    "vault-stewardship",
    snapshot.orphanCount > 0 ? "orphans" : null,
    snapshot.orphanCount > 0 ? `orphan-count:${snapshot.orphanCount}` : null,
    snapshot.routeLessCompiledCount > 0 ? "route-repair" : null,
    snapshot.untaggedCount > 0 ? "tag-repair" : null,
    snapshot.underlinkedCount > 0 ? "underlinked" : null,
    snapshot.underlinkedCount > 0 ? `underlinked-count:${snapshot.underlinkedCount}` : null,
    snapshot.noBacklinkCount > 0 ? "no-backlinks" : null,
    snapshot.noBacklinkCount > 0 ? `no-backlink-count:${snapshot.noBacklinkCount}` : null,
    snapshot.gapTopicCount > 0 ? "gap-topics" : null,
    snapshot.gapTopicCount > 0 ? `gap-topic-count:${snapshot.gapTopicCount}` : null,
  ].filter((tag): tag is string => Boolean(tag));
}

export function buildVaultLibrarianSourceRefs(input: {
  snapshot: VaultStewardshipSnapshot;
  selectedNodeId?: string | null;
  selectedNodeTitle?: string | null;
}): ResearchSourceRef[] {
  const nextSession = buildVaultLibrarianNextSession(input);
  const refs: ResearchSourceRef[] = [
    {
      id: input.selectedNodeId?.trim()
        ? `vault-graph-node:${input.selectedNodeId.trim()}`
        : "vault-graph-focus",
      title: input.selectedNodeTitle?.trim()
        ? `Graph node · ${input.selectedNodeTitle.trim()}`
        : "Vault graph focus",
      sourceType: "memory-spine",
      evidenceStrength: "contextual",
      href: nextSession.href,
    },
  ];

  if (input.snapshot.routeLessCompiledCount > 0) {
    refs.push({
      id: "vault-route-less-pages",
      title: "Route-less compiled pages",
      sourceType: "memory-spine",
      evidenceStrength: "contextual",
      href: "/vault?focus=vault-compiled-pages&compiledFilter=route-less",
    });
  }

  if (input.snapshot.untaggedCount > 0) {
    refs.push({
      id: "vault-untagged-pages",
      title: "Untagged compiled pages",
      sourceType: "memory-spine",
      evidenceStrength: "contextual",
      href: "/vault?focus=vault-compiled-pages&compiledFilter=untagged",
    });
  }

  if (input.snapshot.noBacklinkCount > 0 || input.snapshot.underlinkedCount > 0) {
    refs.push({
      id: "vault-graph-compounding",
      title: "Vault graph compounding repair",
      sourceType: "memory-spine",
      evidenceStrength: "contextual",
      href: buildVaultGraphFocusHref(),
    });
  }

  return refs;
}
