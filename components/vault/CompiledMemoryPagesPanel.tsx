"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ActionSessionCluster from "@/components/ui/ActionSessionCluster";
import { ShellBadge } from "@/components/ui/shell";
import MissionContinuationActions from "@/components/ui/MissionContinuationActions";
import {
  SurfaceCallout,
  SurfaceEmpty,
  SurfaceSkeletonRows,
} from "@/components/ui/surfacePrimitives";
import { apiFetch } from "@/lib/apiFetch";
import type { ArtifactContinuityMetadata } from "@/lib/artifactContinuity";
import { rankRelatedArtifacts } from "@/lib/artifactContinuity";
import {
  isBinaryTriageMemoryArtifact,
  isReverseEngineeringBriefArtifact,
  isReverseEngineeringMemoryArtifact,
} from "@/lib/binaryTriage";
import {
  buildArtifactPromotionDraft,
  findExistingPromotionTarget,
  getArtifactPromotionEvaluation,
} from "@/lib/artifactPromotion";
import { buildMissionHref, type MissionContinuationTarget } from "@/lib/missionHandoff";
import {
  buildCompiledPageHref,
  parseMarketReviewMarkdown,
  rankMarketReviewPages,
  rankOsintCasefilePages,
} from "@/lib/xr1Workflows";
import {
  buildRepoCompareOrbitPrompt,
  parseRepoCompareMarkdown,
} from "@/lib/repoCompare";
import {
  buildRepoAssimilationOrbitPrompt,
  parseRepoAssimilationMarkdown,
} from "@/lib/repoAssimilation";
import { parseVulnerabilityReviewMarkdown } from "@/lib/vulnerabilityReview";
import { parseVaultLibrarianMarkdown } from "@/lib/vaultLibrarian";
import { parseVaultWeeklyMarkdown } from "@/lib/vaultWeekly";
import { queueHQPrompt } from "@/lib/hqPromptQueue";
import { useStore } from "@/store/useStore";

interface CompiledMemoryPage {
  documentMetadata?: {
    originLabel?: string;
    mimeType?: string;
    pageCount?: number;
    metadataWithheld?: boolean;
  };
  researchSignals: {
    sourceCount: number;
    citationCount: number;
    structure: "light" | "structured" | "document_heavy";
    referencedDomains: string[];
    sectionHeadings: string[];
    documentHints: string[];
    signalsWithheld?: boolean;
  };
  id: string;
  title: string;
  summary: string;
  contentPreview: string;
  sourceLabel: string;
  workflowId?: string;
  workflowLabel?: string;
  agentId?: string;
  route?: string;
  topic?: string;
  layer: "raw" | "knowledge" | "output";
  domain: string;
  visibility: "safe" | "internal" | "restricted";
  tags: string[];
  continuity: ArtifactContinuityMetadata;
  createdAt: number;
  updatedAt: number;
  content?: string;
  contentWithheld?: boolean;
}

type CompiledPageArtifactKind =
  | "generic"
  | "market_review"
  | "vuln_review"
  | "repo_compare"
  | "repo_assimilation"
  | "vault_librarian"
  | "vault_weekly"
  | "osint_casefile"
  | "learning_note"
  | "study_brief"
  | "review_sheet"
  | "quiz_set"
  | "vehicle_render_brief"
  | "binary_triage"
  | "reverse_engineering_brief";
type CompiledPageRepairFilter =
  | "all"
  | "route-less"
  | "untagged"
  | "reverse-engineering";
type CompiledPageWorkflowFilter =
  | "market-review"
  | "vuln-review"
  | "osint-casefile"
  | "repo-assimilation"
  | "vault-librarian"
  | "vault-weekly"
  | "repo-compare"
  | null;

const VEHICLE_RENDER_TARGET_LABELS: Record<string, string> = {
  "camera-mount": "Camera mount",
  "companion-enclosure": "Companion enclosure",
  "telemetry-mast": "Telemetry mast",
  "battery-bracket": "Battery bracket",
  "landing-gear-accessory": "Landing gear accessory",
};

const BINARY_TRIAGE_FORMAT_LABELS: Record<string, string> = {
  pe: "PE sample",
  elf: "ELF sample",
  "mach-o": "Mach-O sample",
  zip: "Archive sample",
  pdf: "Document sample",
  png: "PNG sample",
  jpeg: "JPEG sample",
  script: "Script sample",
  text: "Text sample",
  unknown: "Unknown sample",
};

function truncateInline(text: string, max = 180) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
}

function buildCompiledPageMeta(page: CompiledMemoryPage) {
  const parts = [
    page.researchSignals.structure === "document_heavy"
      ? "document-heavy"
      : page.researchSignals.structure === "structured"
        ? "structured"
        : "light",
    page.researchSignals.sourceCount > 0
      ? `${page.researchSignals.sourceCount} source${page.researchSignals.sourceCount === 1 ? "" : "s"}`
      : null,
    page.researchSignals.citationCount > 0
      ? `${page.researchSignals.citationCount} citation cues`
      : null,
    page.documentMetadata?.metadataWithheld
      ? "document metadata withheld"
      : page.documentMetadata?.pageCount
        ? `${page.documentMetadata.pageCount} page${page.documentMetadata.pageCount === 1 ? "" : "s"}`
        : page.documentMetadata?.mimeType ?? null,
    page.continuity.promotionKind === "research_brief"
      ? "promotable research"
      : page.continuity.promotionKind === "study_brief"
        ? "promotable study"
      : page.continuity.promotionKind === "reverse_engineering_brief"
        ? "promotable brief"
        : null,
  ].filter(Boolean);
  return parts.join(" · ");
}

function formatEvidenceStrength(value: string | null | undefined) {
  if (!value) return "Contextual";
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("-");
}

function getCompiledPageEvidenceStrength(page: CompiledMemoryPage) {
  if (page.continuity.evidenceStrength) {
    return formatEvidenceStrength(page.continuity.evidenceStrength);
  }
  if (
    page.researchSignals.citationCount > 0 ||
    page.researchSignals.sourceCount > 1
  ) {
    return "Synthesis-ready";
  }
  if (page.researchSignals.sourceCount === 1) {
    return "Source-backed";
  }
  return "Contextual";
}

function extractTagValue(page: CompiledMemoryPage, prefix: string) {
  return (
    page.tags.find((tag) => tag.startsWith(prefix))?.slice(prefix.length) ?? null
  );
}

function extractNumericTagValue(page: CompiledMemoryPage, prefix: string) {
  const raw = extractTagValue(page, prefix);
  if (!raw) return null;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) ? value : null;
}

function detectCompiledPageArtifactKind(page: CompiledMemoryPage): CompiledPageArtifactKind {
  if (page.workflowId === "market-review") {
    return "market_review";
  }
  if (page.workflowId === "vuln-review") {
    return "vuln_review";
  }
  if (page.workflowId === "repo-compare") {
    return "repo_compare";
  }
  if (page.workflowId === "repo-assimilation") {
    return "repo_assimilation";
  }
  if (page.workflowId === "vault-librarian") {
    return "vault_librarian";
  }
  if (page.workflowId === "vault-weekly") {
    return "vault_weekly";
  }
  if (page.workflowId === "osint-casefile") {
    return "osint_casefile";
  }
  if (page.continuity.artifactClass === "study_brief") {
    return "study_brief";
  }
  if (page.continuity.artifactClass === "learning_note") {
    return "learning_note";
  }
  if (page.continuity.artifactClass === "review_sheet") {
    return "review_sheet";
  }
  if (page.continuity.artifactClass === "quiz_set") {
    return "quiz_set";
  }
  if (page.continuity.artifactClass === "reverse_engineering_brief") {
    return "reverse_engineering_brief";
  }
  if (page.continuity.artifactClass === "reverse_engineering_prep") {
    return "binary_triage";
  }
  if (
    page.route === "/vehicle" &&
    (page.topic === "Vehicle render brief" ||
      page.tags.includes("vehicle-render-brief") ||
      page.tags.includes("cad-prep"))
  ) {
    return "vehicle_render_brief";
  }
  return "generic";
}

function getMarketReviewLessons(page: CompiledMemoryPage) {
  if (page.workflowId !== "market-review" || !page.content) return null;
  const review = parseMarketReviewMarkdown(page.content);
  if (!review.whatToRepeat && !review.whatToAvoid && !review.nextRule) return null;
  return review;
}

function getRepoAssimilationInsights(page: CompiledMemoryPage) {
  if (page.workflowId !== "repo-assimilation" || !page.content) return null;
  return parseRepoAssimilationMarkdown(page.content);
}

function getVulnerabilityReviewInsights(page: CompiledMemoryPage) {
  if (page.workflowId !== "vuln-review" || !page.content) return null;
  return parseVulnerabilityReviewMarkdown(page.content);
}

function getRepoCompareInsights(page: CompiledMemoryPage) {
  if (page.workflowId !== "repo-compare" || !page.content) return null;
  return parseRepoCompareMarkdown(page.content);
}

function getVaultLibrarianInsights(page: CompiledMemoryPage) {
  if (page.workflowId !== "vault-librarian" || !page.content) return null;
  return parseVaultLibrarianMarkdown(page.content);
}

function getVaultWeeklyInsights(page: CompiledMemoryPage) {
  if (page.workflowId !== "vault-weekly" || !page.content) return null;
  return parseVaultWeeklyMarkdown(page.content);
}

function getVehicleRenderTargetLabel(page: CompiledMemoryPage) {
  return Object.entries(VEHICLE_RENDER_TARGET_LABELS).find(([tag]) => page.tags.includes(tag))?.[1] ?? null;
}

function getBinaryTriageFormatLabel(page: CompiledMemoryPage) {
  return (
    Object.entries(BINARY_TRIAGE_FORMAT_LABELS).find(([tag]) =>
      page.tags.includes(tag),
    )?.[1] ?? null
  );
}

function getCompiledPagePresentation(page: CompiledMemoryPage) {
  const artifactKind = detectCompiledPageArtifactKind(page);
  if (artifactKind === "market_review") {
    const assetLabel = extractTagValue(page, "asset:");
    const marketReviewLessons = getMarketReviewLessons(page);
    return {
      artifactKind,
      articleStyle: {
        border: "1px solid rgba(250, 204, 21, 0.2)",
        background:
          "linear-gradient(180deg, rgba(29, 22, 7, 0.94), rgba(40, 29, 8, 0.76))",
      },
      eyebrow: "Market review",
      accentBadges: [
        { label: "Decision support only", tone: "accent" as const },
        ...(assetLabel ? [{ label: assetLabel.replace(/-/g, " "), tone: "muted" as const }] : []),
        ...(marketReviewLessons?.nextRule
          ? [{ label: "Rule captured", tone: "muted" as const }]
          : []),
        { label: getCompiledPageEvidenceStrength(page), tone: "muted" as const },
      ],
      cue: marketReviewLessons?.nextRule
        ? `Next rule: ${truncateInline(marketReviewLessons.nextRule, 132)}`
        : "This durable thread preserves thesis, invalidation, result, and operator reflection so Alpha can reopen prior review context without drifting into execution automation.",
    };
  }

  if (artifactKind === "vuln_review") {
    const reviewInsights = getVulnerabilityReviewInsights(page);
    const topFinding = reviewInsights?.findings[0] ?? null;
    return {
      artifactKind,
      articleStyle: {
        border: "1px solid rgba(248, 113, 113, 0.24)",
        background:
          "linear-gradient(180deg, rgba(40, 12, 20, 0.94), rgba(30, 14, 23, 0.78))",
      },
      eyebrow: "Vulnerability review",
      accentBadges: [
        { label: "Defensive only", tone: "accent" as const },
        ...(topFinding
          ? [{ label: `${topFinding.severity} severity`, tone: "muted" as const }]
          : []),
        { label: getCompiledPageEvidenceStrength(page), tone: "muted" as const },
      ],
      cue: topFinding
        ? `${topFinding.issue} · ${truncateInline(topFinding.evidence, 128)}`
        : "This durable CYBER brief preserves the local code review, severity posture, and strongest exact repair lane without widening into offensive workflow.",
    };
  }

  if (artifactKind === "repo_assimilation") {
    const assimilation = getRepoAssimilationInsights(page);
    const repoLabel = page.continuity.repoMemoryBinding ?? extractTagValue(page, "repo:");
    const stackTags = page.tags
      .filter((tag) => tag.startsWith("stack:"))
      .slice(0, 3)
      .map((tag) => tag.slice("stack:".length).replace(/-/g, " "));
    return {
      artifactKind,
      articleStyle: {
        border: "1px solid rgba(110, 231, 183, 0.18)",
        background:
          "linear-gradient(180deg, rgba(7, 24, 20, 0.94), rgba(8, 34, 27, 0.74))",
      },
      eyebrow: "Repo assimilation",
      accentBadges: [
        { label: "Public-safe", tone: "accent" as const },
        ...(repoLabel ? [{ label: repoLabel.replace(/-/g, " "), tone: "muted" as const }] : []),
        ...stackTags.map((tag) => ({ label: tag, tone: "muted" as const })),
        { label: getCompiledPageEvidenceStrength(page), tone: "muted" as const },
      ],
      cue: assimilation?.nexusFitMap
        ? `Fit map: ${truncateInline(assimilation.nexusFitMap, 148)}`
        : "This durable brief captures how a public reference repo fits Nexus before ORBIT widens into local implementation planning.",
    };
  }

  if (artifactKind === "vault_librarian") {
    const audit = getVaultLibrarianInsights(page);
    const orphanCount = extractNumericTagValue(page, "orphan-count:");
    const gapTopicCount = extractNumericTagValue(page, "gap-topic-count:");
    return {
      artifactKind,
      articleStyle: {
        border: "1px solid rgba(125, 211, 252, 0.18)",
        background:
          "linear-gradient(180deg, rgba(9, 20, 34, 0.94), rgba(11, 24, 40, 0.76))",
      },
      eyebrow: "Vault librarian",
      accentBadges: [
        { label: "Archive audit", tone: "accent" as const },
        ...(orphanCount
          ? [{ label: `${orphanCount} orphan${orphanCount === 1 ? "" : "s"}`, tone: "muted" as const }]
          : page.tags.includes("orphans")
            ? [{ label: "Orphan repair", tone: "muted" as const }]
          : []),
        ...(gapTopicCount
          ? [{ label: `${gapTopicCount} gap topic${gapTopicCount === 1 ? "" : "s"}`, tone: "muted" as const }]
          : page.tags.includes("gap-topics")
            ? [{ label: "Gap topics", tone: "muted" as const }]
          : []),
        { label: getCompiledPageEvidenceStrength(page), tone: "muted" as const },
      ],
      cue: audit?.strongestNextSession
        ? `Strongest next session: ${truncateInline(
            audit.strongestNextSession.replace(/^- /gm, "").replace(/\s+/g, " "),
            148,
          )}`
        : audit?.highestPriorityRepairs
          ? `Repair cue: ${truncateInline(
              audit.highestPriorityRepairs.replace(/^- /gm, "").replace(/\s+/g, " "),
              148,
            )}`
          : "This durable audit brief preserves archive posture, repair priorities, and the strongest next graph-focused maintenance lane.",
    };
  }

  if (artifactKind === "vault_weekly") {
    const weekly = getVaultWeeklyInsights(page);
    return {
      artifactKind,
      articleStyle: {
        border: "1px solid rgba(125, 211, 252, 0.18)",
        background:
          "linear-gradient(180deg, rgba(7, 18, 28, 0.94), rgba(8, 25, 36, 0.74))",
      },
      eyebrow: "Vault weekly",
      accentBadges: [
        { label: "Second brain", tone: "accent" as const },
        { label: getCompiledPageEvidenceStrength(page), tone: "muted" as const },
      ],
      cue: weekly?.strongestNextSession
        ? `Next session: ${truncateInline(weekly.strongestNextSession, 148)}`
        : "This weekly brief preserves the strongest archive themes, repair lane, and next session from the last seven days of local memory.",
    };
  }

  if (artifactKind === "repo_compare") {
    const comparison = getRepoCompareInsights(page);
    const repoTags = page.tags
      .filter((tag) => tag.startsWith("repo:"))
      .slice(0, 3)
      .map((tag) => tag.slice("repo:".length).replace(/-/g, "/"));
    return {
      artifactKind,
      articleStyle: {
        border: "1px solid rgba(191, 219, 254, 0.18)",
        background:
          "linear-gradient(180deg, rgba(10, 18, 31, 0.94), rgba(14, 24, 43, 0.76))",
      },
      eyebrow: "Repo compare",
      accentBadges: [
        { label: "Public-safe", tone: "accent" as const },
        ...repoTags.map((tag) => ({ label: tag, tone: "muted" as const })),
        { label: getCompiledPageEvidenceStrength(page), tone: "muted" as const },
      ],
      cue: comparison?.recommendedPick
        ? `Recommended pick: ${truncateInline(comparison.recommendedPick, 148)}`
        : "This durable compare brief preserves the recommended repo, key differences, and adoption boundaries before ORBIT plans a local implementation slice.",
    };
  }

  if (artifactKind === "osint_casefile") {
    const pivotTags = page.tags
      .filter((tag) => tag.startsWith("pivot:"))
      .slice(0, 2)
      .map((tag) => tag.slice("pivot:".length).replace(/-/g, " "));
    const routeOriginLabel =
      page.route === "/cyber"
        ? "CYBER-originated"
        : page.route === "/recon"
          ? "RECON-originated"
          : "Route not set";
    const sourceCountLabel =
      page.researchSignals.sourceCount > 0
        ? `${page.researchSignals.sourceCount} source${page.researchSignals.sourceCount === 1 ? "" : "s"}`
        : null;
    const citationCountLabel =
      page.researchSignals.citationCount > 0
        ? `${page.researchSignals.citationCount} citation cues`
        : null;
    return {
      artifactKind,
      articleStyle: {
        border: "1px solid rgba(96, 165, 250, 0.18)",
        background:
          "linear-gradient(180deg, rgba(8, 18, 31, 0.94), rgba(8, 26, 40, 0.76))",
      },
      eyebrow: "OSINT casefile",
      accentBadges: [
        { label: "Passive-first", tone: "accent" as const },
        { label: routeOriginLabel, tone: "muted" as const },
        ...pivotTags.map((tag) => ({ label: tag, tone: "muted" as const })),
        { label: getCompiledPageEvidenceStrength(page), tone: "muted" as const },
        ...(sourceCountLabel ? [{ label: sourceCountLabel, tone: "muted" as const }] : []),
        ...(citationCountLabel ? [{ label: citationCountLabel, tone: "muted" as const }] : []),
      ],
      cue:
        "This casefile captures subject, passive findings, pivot opportunities, and the next reviewed move so RECON or CYBER follow-through stays evidence-led and compact.",
    };
  }

  if (artifactKind === "vehicle_render_brief") {
    const renderTargetLabel = getVehicleRenderTargetLabel(page);
    return {
      artifactKind,
      articleStyle: {
        border: "1px solid rgba(59, 130, 246, 0.22)",
        background:
          "linear-gradient(180deg, rgba(8, 16, 32, 0.94), rgba(13, 27, 51, 0.72))",
      },
      eyebrow: "Future hardware render brief",
      accentBadges: [
        { label: "Vehicle render brief", tone: "accent" as const },
        ...(renderTargetLabel ? [{ label: renderTargetLabel, tone: "muted" as const }] : []),
        { label: "Non-flight-critical", tone: "muted" as const },
      ],
      cue:
        "Prepared for later CAD/render iteration before hardware arrival. Treat this as a planning artifact, not a live authority surface.",
    };
  }

  if (artifactKind === "binary_triage") {
    const formatLabel = getBinaryTriageFormatLabel(page);
    return {
      artifactKind,
      articleStyle: {
        border: "1px solid rgba(56, 189, 248, 0.2)",
        background:
          "linear-gradient(180deg, rgba(7, 16, 27, 0.94), rgba(10, 28, 40, 0.74))",
      },
      eyebrow: "Reverse-engineering prep",
      accentBadges: [
        { label: "Binary triage", tone: "accent" as const },
        ...(formatLabel ? [{ label: formatLabel, tone: "muted" as const }] : []),
        { label: "Local sample stayed local", tone: "muted" as const },
      ],
      cue:
        "This artifact preserves hashes, entropy, strings, and IOC hints for follow-up analysis. The raw sample itself was not uploaded into Nexus.",
    };
  }

  if (artifactKind === "reverse_engineering_brief") {
    const formatLabel = getBinaryTriageFormatLabel(page);
    return {
      artifactKind,
      articleStyle: {
        border: "1px solid rgba(250, 204, 21, 0.22)",
        background:
          "linear-gradient(180deg, rgba(25, 18, 7, 0.94), rgba(48, 33, 8, 0.74))",
      },
      eyebrow: "Promoted analyst brief",
      accentBadges: [
        { label: "RE brief", tone: "accent" as const },
        ...(formatLabel ? [{ label: formatLabel, tone: "muted" as const }] : []),
        { label: "Derived from triage", tone: "muted" as const },
      ],
      cue:
        "This note is the higher-order analyst layer above raw reverse-engineering prep. Keep it scoped to triage-backed evidence and concrete next steps.",
    };
  }

  if (artifactKind === "learning_note") {
    return {
      artifactKind,
      articleStyle: {
        border: "1px solid rgba(125, 211, 252, 0.2)",
        background:
          "linear-gradient(180deg, rgba(8, 20, 33, 0.94), rgba(9, 28, 43, 0.74))",
      },
      eyebrow: "Guided learning note",
      accentBadges: [
        { label: "Learning note", tone: "accent" as const },
        ...(page.continuity.learningMissionMode
          ? [{ label: page.continuity.learningMissionMode, tone: "muted" as const }]
          : []),
        ...(page.continuity.memoryCompartment
          ? [{ label: page.continuity.memoryCompartment, tone: "muted" as const }]
          : []),
      ],
      cue:
        "This note preserves the lower-order teaching or explanation lane so future study can compound without repeating the full setup.",
    };
  }

  if (artifactKind === "study_brief") {
    return {
      artifactKind,
      articleStyle: {
        border: "1px solid rgba(110, 231, 183, 0.2)",
        background:
          "linear-gradient(180deg, rgba(8, 28, 19, 0.94), rgba(8, 39, 23, 0.74))",
      },
      eyebrow: "Promoted study brief",
      accentBadges: [
        { label: "Study brief", tone: "accent" as const },
        { label: "Higher-order study layer", tone: "muted" as const },
      ],
      cue:
        "This note is the higher-order study layer above a lower-order learning note. Reopen it when continuity matches instead of creating a duplicate.",
    };
  }

  if (artifactKind === "review_sheet") {
    return {
      artifactKind,
      articleStyle: {
        border: "1px solid rgba(191, 219, 254, 0.2)",
        background:
          "linear-gradient(180deg, rgba(10, 18, 31, 0.94), rgba(14, 24, 43, 0.74))",
      },
      eyebrow: "Review sheet",
      accentBadges: [
        { label: "Review sheet", tone: "accent" as const },
      ],
      cue:
        "This artifact captures a compact review state so the assistant can resume what was already learned without rebuilding context from scratch.",
    };
  }

  if (artifactKind === "quiz_set") {
    return {
      artifactKind,
      articleStyle: {
        border: "1px solid rgba(244, 114, 182, 0.18)",
        background:
          "linear-gradient(180deg, rgba(34, 10, 28, 0.94), rgba(44, 11, 31, 0.74))",
      },
      eyebrow: "Quiz set",
      accentBadges: [
        { label: "Quiz set", tone: "accent" as const },
      ],
      cue:
        "This artifact preserves compact practice prompts so the next study pass can resume from the same checkpoint instead of starting over.",
    };
  }

  return {
    artifactKind,
    articleStyle: {
      border: "1px solid rgba(123, 167, 212, 0.14)",
      background:
        "linear-gradient(180deg, rgba(11, 17, 32, 0.9), rgba(11, 17, 32, 0.68))",
    },
    eyebrow: null,
    accentBadges: [] as Array<{ label: string; tone: "accent" | "muted" }>,
    cue: null,
  };
}

function getCompiledPageRepairFilter(value: string | null): CompiledPageRepairFilter {
  return value === "route-less" ||
    value === "untagged" ||
    value === "reverse-engineering"
    ? value
    : "all";
}

function getCompiledPageWorkflowFilter(
  value: string | null,
): CompiledPageWorkflowFilter {
  return value === "market-review" ||
    value === "vuln-review" ||
    value === "osint-casefile" ||
    value === "repo-assimilation" ||
    value === "vault-librarian" ||
    value === "vault-weekly" ||
    value === "repo-compare"
    ? value
    : null;
}

function matchesCurrentCompiledPageSession(
  page: CompiledMemoryPage,
  compiledFilter: CompiledPageRepairFilter,
  workflowId: CompiledPageWorkflowFilter,
) {
  if (!matchesCompiledPageRepairFilter(page, compiledFilter)) return false;
  if (!workflowId) return true;
  return page.workflowId === workflowId;
}

function matchesCompiledPageRepairFilter(
  page: CompiledMemoryPage,
  filter: CompiledPageRepairFilter,
) {
  if (filter === "route-less") return !page.route?.trim();
  if (filter === "untagged") return page.tags.length === 0;
  if (filter === "reverse-engineering") {
    return isReverseEngineeringMemoryArtifact(page);
  }
  return true;
}

function getCompiledPageRepairActions(filter: CompiledPageRepairFilter) {
  if (filter === "route-less") {
    return [
      {
        href: "/vault?focus=vault-stewardship",
        label: "Open stewardship",
        detail: "Review archive health and route continuity posture before editing individual compiled pages.",
      },
      {
        href: "/vault?focus=vault-graph-focus&graphAudit=orphans",
        label: "Recover orphans",
        detail: "Check whether disconnected graph artifacts are also missing route continuity.",
      },
      {
        href: "/vault?focus=vault-compiled-pages",
        label: "Open all compiled pages",
        detail: "Return to the full compiled-page lane once route continuity repair is complete.",
      },
    ];
  }

  if (filter === "untagged") {
    return [
      {
        href: "/vault?focus=vault-stewardship",
        label: "Open stewardship",
        detail: "Review archive health and tag-coverage posture before fixing individual compiled pages.",
      },
      {
        href: "/vault?focus=vault-compiled-pages&compiledFilter=route-less",
        label: "Open route-less pages",
        detail: "Check the adjacent repair lane for compiled pages that still lack route continuity.",
      },
      {
        href: "/vault?focus=vault-compiled-pages",
        label: "Open all compiled pages",
        detail: "Return to the full compiled-page lane once tag coverage repair is complete.",
      },
    ];
  }

  if (filter === "reverse-engineering") {
    return [
      {
        href: "/vault?focus=vault-stewardship",
        label: "Open stewardship",
        detail: "Review reverse-engineering archive posture before fixing individual prep notes or promoted briefs.",
      },
      {
        href: "/vault?focus=vault-compiled-pages&compiledFilter=route-less",
        label: "Open route-less pages",
        detail: "Check adjacent compiled pages that still lack route continuity.",
      },
      {
        href: "/recon?view=binary&focus=recon-binary",
        label: "Open binary triage",
        detail: "Return to the local reverse-engineering prep lane after reviewing the durable notes and promoted briefs.",
      },
    ];
  }

  return [];
}

function getPromotionActionLabel(
  targetClass: "study_brief" | "reverse_engineering_brief" | "research_brief" | null,
) {
  if (targetClass === "study_brief") return "Promote study brief";
  if (targetClass === "research_brief") return "Promote research brief";
  if (targetClass === "reverse_engineering_brief") return "Promote to brief";
  return "Promote";
}

function getPromotionReadyLabel(
  targetClass: "study_brief" | "reverse_engineering_brief" | "research_brief" | null,
) {
  if (targetClass === "study_brief") return "Study brief ready";
  if (targetClass === "research_brief") return "Research brief ready";
  if (targetClass === "reverse_engineering_brief") return "Brief ready";
  return "Brief ready";
}

function getPromotionFailureLabel(
  targetClass: "study_brief" | "reverse_engineering_brief" | "research_brief" | null,
) {
  if (targetClass === "study_brief") return "Study brief promotion failed.";
  if (targetClass === "research_brief") return "Research brief promotion failed.";
  if (targetClass === "reverse_engineering_brief") return "Brief promotion failed.";
  return "Promotion failed.";
}

export default function CompiledMemoryPagesPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setTab = useStore((state) => state.setTab);
  const [pages, setPages] = useState<CompiledMemoryPage[]>([]);
  const [loading, setLoading] = useState(false);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [promotionState, setPromotionState] = useState<
    Record<string, { state: "saving" | "saved" | "error"; briefId?: string }>
  >({});
  const requestedPageId = searchParams?.get("pageId")?.trim() || null;
  const compiledFilter = getCompiledPageRepairFilter(
    searchParams?.get("compiledFilter") ?? null,
  );
  const workflowId = getCompiledPageWorkflowFilter(
    searchParams?.get("workflowId") ?? null,
  );
  const repairActions = useMemo(
    () => getCompiledPageRepairActions(compiledFilter),
    [compiledFilter],
  );
  const filteredPages = useMemo(
    () =>
      pages.filter((page) =>
        matchesCurrentCompiledPageSession(page, compiledFilter, workflowId),
      ),
    [compiledFilter, pages, workflowId],
  );
  const activePage = useMemo(
    () => filteredPages.find((page) => page.id === activePageId) ?? null,
    [activePageId, filteredPages],
  );
  const recentDurableThreads = useMemo(() => {
    if (compiledFilter !== "all") return [];

    if (workflowId === "market-review") {
      return rankMarketReviewPages(
        pages.filter((page) => page.workflowId === "market-review"),
        extractTagValue(activePage ?? pages[0] ?? null, "asset:"),
        activePage?.continuity?.continuityId,
      ).slice(0, 3);
    }

    if (workflowId === "vuln-review") {
      return [...pages]
        .filter((page) => page.workflowId === "vuln-review")
        .sort((left, right) => right.updatedAt - left.updatedAt)
        .slice(0, 3);
    }

    if (workflowId === "osint-casefile") {
      return rankOsintCasefilePages(
        pages.filter((page) => page.workflowId === "osint-casefile"),
        activePage?.title ?? null,
        activePage?.continuity?.continuityId,
        activePage?.route ?? pages.find((page) => page.workflowId === "osint-casefile")?.route,
      ).slice(0, 3);
    }

    if (workflowId === "repo-assimilation") {
      return [...pages]
        .filter((page) => page.workflowId === "repo-assimilation")
        .sort((left, right) => right.updatedAt - left.updatedAt)
        .slice(0, 3);
    }

    if (workflowId === "vault-librarian") {
      return [...pages]
        .filter((page) => page.workflowId === "vault-librarian")
        .sort((left, right) => right.updatedAt - left.updatedAt)
        .slice(0, 3);
    }

    if (workflowId === "vault-weekly") {
      return [...pages]
        .filter((page) => page.workflowId === "vault-weekly")
        .sort((left, right) => right.updatedAt - left.updatedAt)
        .slice(0, 3);
    }

    return [...pages]
      .sort((left, right) => {
        const leftXR1 =
          left.workflowId === "market-review" ||
          left.workflowId === "vuln-review" ||
          left.workflowId === "osint-casefile" ||
          left.workflowId === "repo-assimilation" ||
          left.workflowId === "vault-librarian" ||
          left.workflowId === "vault-weekly" ||
          left.workflowId === "repo-compare"
            ? 1
            : 0;
        const rightXR1 =
          right.workflowId === "market-review" ||
          right.workflowId === "vuln-review" ||
          right.workflowId === "osint-casefile" ||
          right.workflowId === "repo-assimilation" ||
          right.workflowId === "vault-librarian" ||
          right.workflowId === "vault-weekly" ||
          right.workflowId === "repo-compare"
            ? 1
            : 0;
        if (leftXR1 !== rightXR1) return rightXR1 - leftXR1;
        return right.updatedAt - left.updatedAt;
      })
      .slice(0, 3);
  }, [activePage, compiledFilter, pages, workflowId]);
  const strongestMarketReview = useMemo(() => {
    if (workflowId !== "market-review") return null;
    return (
      rankMarketReviewPages(
        pages.filter((page) => page.workflowId === "market-review"),
        extractTagValue(activePage ?? pages[0] ?? null, "asset:"),
        activePage?.continuity?.continuityId,
      )[0] ?? null
    );
  }, [activePage, pages, workflowId]);
  const newestMarketReview = useMemo(() => {
    if (workflowId !== "market-review") return null;
    return (
      [...pages]
        .filter((page) => page.workflowId === "market-review")
        .sort((left, right) => right.updatedAt - left.updatedAt)[0] ?? null
    );
  }, [pages, workflowId]);
  const latestVulnerabilityReview = useMemo(() => {
    if (workflowId !== "vuln-review") return null;
    return (
      [...pages]
        .filter((page) => page.workflowId === "vuln-review")
        .sort((left, right) => right.updatedAt - left.updatedAt)[0] ?? null
    );
  }, [pages, workflowId]);
  const latestRepoAssimilation = useMemo(() => {
    if (workflowId !== "repo-assimilation") return null;
    return (
      [...pages]
        .filter((page) => page.workflowId === "repo-assimilation")
        .sort((left, right) => right.updatedAt - left.updatedAt)[0] ?? null
    );
  }, [pages, workflowId]);
  const latestVaultLibrarian = useMemo(() => {
    if (workflowId !== "vault-librarian") return null;
    return (
      [...pages]
        .filter((page) => page.workflowId === "vault-librarian")
        .sort((left, right) => right.updatedAt - left.updatedAt)[0] ?? null
    );
  }, [pages, workflowId]);
  const latestVaultWeekly = useMemo(() => {
    if (workflowId !== "vault-weekly") return null;
    return (
      [...pages]
        .filter((page) => page.workflowId === "vault-weekly")
        .sort((left, right) => right.updatedAt - left.updatedAt)[0] ?? null
    );
  }, [pages, workflowId]);
  const latestRepoCompare = useMemo(() => {
    if (workflowId !== "repo-compare") return null;
    return (
      [...pages]
        .filter((page) => page.workflowId === "repo-compare")
        .sort((left, right) => right.updatedAt - left.updatedAt)[0] ?? null
    );
  }, [pages, workflowId]);

  const loadPageDetail = useCallback(async (page: CompiledMemoryPage) => {
    if (page.content || page.contentWithheld) return page;
    const res = await apiFetch(
      `/api/memory/pages?id=${encodeURIComponent(page.id)}`,
    );
    if (!res.ok) return page;
    const data = (await res.json()) as { page?: CompiledMemoryPage };
    if (!data.page) return page;
    setPages((current) =>
      current.map((candidate) =>
        candidate.id === data.page?.id ? data.page : candidate,
      ),
    );
    return data.page;
  }, []);

  const openExactCompiledPage = useCallback(
    (page: Pick<CompiledMemoryPage, "id" | "workflowId">) => {
      router.push(buildCompiledPageHref(page));
    },
    [router],
  );

  const briefOrbitFromAssimilation = useCallback(
    (page: CompiledMemoryPage | null) => {
      if (!page?.content) return;
      const normalizedRepoId =
        page.continuity.repoMemoryBinding ?? page.title;
      queueHQPrompt(
        `@orbit: ${buildRepoAssimilationOrbitPrompt({
          normalizedRepoId,
          brief: page.content,
        })}`,
      );
      setTab("home");
      router.push("/hq?focus=hq-chronicle");
    },
    [router, setTab],
  );

  const briefOrbitFromRepoCompare = useCallback(
    (page: CompiledMemoryPage | null) => {
      if (!page?.content) return;
      queueHQPrompt(
        `@orbit: ${buildRepoCompareOrbitPrompt({
          brief: page.content,
        })}`,
      );
      setTab("home");
      router.push("/hq?focus=hq-chronicle");
    },
    [router, setTab],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const limit = compiledFilter === "all" ? (workflowId ? 12 : 8) : 24;
      const workflowQuery = workflowId ? `&workflowId=${encodeURIComponent(workflowId)}` : "";
      const res = await apiFetch(`/api/memory/pages?limit=${limit}${workflowQuery}`);
      if (!res.ok) return;
      const data = (await res.json()) as { pages?: CompiledMemoryPage[] };
      setPages(data.pages ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [compiledFilter, workflowId]);

  const togglePageDetail = async (page: CompiledMemoryPage) => {
    if (activePageId === page.id) {
      setActivePageId(null);
      return;
    }

    setDetailLoading(true);
    try {
      const detailedPage = await loadPageDetail(page);
      setActivePageId(detailedPage.id);
    } catch {
      // silent
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (!requestedPageId) return;

    const matchingLoadedPage = pages.find((page) => page.id === requestedPageId);
    if (matchingLoadedPage) {
      if (
        matchesCurrentCompiledPageSession(
          matchingLoadedPage,
          compiledFilter,
          workflowId,
        )
      ) {
        setActivePageId(matchingLoadedPage.id);
        if (!matchingLoadedPage.content && !matchingLoadedPage.contentWithheld) {
          void loadPageDetail(matchingLoadedPage);
        }
      }
      return;
    }

    let cancelled = false;

    const loadRequestedPage = async () => {
      try {
        const response = await apiFetch(
          `/api/memory/pages?id=${encodeURIComponent(requestedPageId)}`,
        );
        if (!response.ok) return;
        const payload = (await response.json()) as { page?: CompiledMemoryPage };
        if (!payload.page || cancelled) return;
        if (
          !matchesCurrentCompiledPageSession(
            payload.page,
            compiledFilter,
            workflowId,
          )
        ) {
          return;
        }
        setPages((current) => {
          const remaining = current.filter(
            (candidate) => candidate.id !== payload.page?.id,
          );
          return [payload.page!, ...remaining];
        });
        setActivePageId(payload.page.id);
      } catch {
        // silent
      }
    };

    void loadRequestedPage();

    return () => {
      cancelled = true;
    };
  }, [compiledFilter, loadPageDetail, pages, requestedPageId, workflowId]);

  const promoteToBrief = useCallback(
    async (page: CompiledMemoryPage) => {
      setPromotionState((current) => ({
        ...current,
        [page.id]: { state: "saving" },
      }));
      try {
        const detailedPage = await loadPageDetail(page);
        const evaluation = getArtifactPromotionEvaluation(detailedPage);
        if (!evaluation.eligible) {
          throw new Error(evaluation.reason);
        }
        const draft = buildArtifactPromotionDraft(detailedPage);
        if (!draft) {
          throw new Error("Promotion draft unavailable");
        }
        let promotionCandidates = pages;
        try {
          const candidateResponse = await apiFetch("/api/memory/pages?limit=100");
          if (candidateResponse.ok) {
            const candidatePayload = (await candidateResponse.json()) as {
              pages?: CompiledMemoryPage[];
            };
            if (candidatePayload.pages?.length) {
              promotionCandidates = candidatePayload.pages;
            }
          }
        } catch {
          // silent: fall back to the loaded local slice
        }
        const existingBrief = findExistingPromotionTarget(
          detailedPage,
          promotionCandidates,
        );
        if (existingBrief) {
          if (!pages.some((candidate) => candidate.id === existingBrief.id)) {
            setPages((current) => [existingBrief, ...current]);
          }
          setActivePageId(existingBrief.id);
          setPromotionState((current) => ({
            ...current,
            [page.id]: { state: "saved", briefId: existingBrief.id },
          }));
          return;
        }

        const response = await apiFetch("/api/memory/pages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: draft.title,
            summary: draft.summary,
            content: draft.content,
            source: "manual",
            sourceLabel: draft.sourceLabel,
            route: draft.route,
            layer: "knowledge",
            topic: draft.topic,
            domain: draft.domain,
            tags: draft.tags,
            requestedVisibility:
              draft.route === "/recon"
                ? "internal"
                : detailedPage.visibility === "safe"
                  ? "safe"
                  : "internal",
          }),
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = (await response.json()) as { page?: CompiledMemoryPage };
        if (data.page) {
          setPages((current) => [data.page!, ...current.filter((candidate) => candidate.id !== data.page?.id)]);
          setActivePageId(data.page.id);
        }
        window.dispatchEvent(new Event("nexus-memory-pages-updated"));
        setPromotionState((current) => ({
          ...current,
          [page.id]: { state: "saved", briefId: data.page?.id },
        }));
      } catch {
        setPromotionState((current) => ({
          ...current,
          [page.id]: { state: "error" },
        }));
      }
    },
    [loadPageDetail, pages],
  );

  useEffect(() => {
    void refresh();
    const handleRefresh = () => {
      void refresh();
    };
    window.addEventListener("nexus-memory-pages-updated", handleRefresh);
    return () => {
      window.removeEventListener("nexus-memory-pages-updated", handleRefresh);
    };
  }, [refresh]);

  if (loading && filteredPages.length === 0) {
    return <SurfaceSkeletonRows rows={3} height={72} />;
  }

  if (!loading && filteredPages.length === 0) {
    return (
      <SurfaceEmpty
        compact
        icon="Pages"
        title={
          workflowId === "market-review"
            ? "No market reviews yet"
            : workflowId === "vuln-review"
              ? "No vulnerability reviews yet"
            : workflowId === "osint-casefile"
              ? "No OSINT casefiles yet"
              : workflowId === "repo-assimilation"
                ? "No repo assimilations yet"
              : workflowId === "vault-librarian"
                ? "No vault audits yet"
              : workflowId === "vault-weekly"
                ? "No weekly archive briefs yet"
              : compiledFilter === "route-less"
            ? "No route-less compiled pages"
            : compiledFilter === "untagged"
              ? "No untagged compiled pages"
              : compiledFilter === "reverse-engineering"
                ? "No reverse-engineering memory yet"
              : "No compiled pages yet"
        }
        description={
          workflowId === "market-review"
            ? "File a market review from ALPHA and the durable thesis lane will show up here with market-specific continuity cues."
            : workflowId === "vuln-review"
              ? "Run a defensive review from CYBER and the durable vuln-review brief will reopen here with exact repair continuity."
            : workflowId === "osint-casefile"
              ? "File an OSINT casefile from RECON or CYBER and the passive-first durable thread will show up here."
              : workflowId === "repo-assimilation"
                ? "Assess a public repo in RECON, then run explicit repo assimilation so the durable fit brief can reopen here with exact continuity."
              : workflowId === "vault-librarian"
                ? "Run Audit VAULT from the relations chamber and the durable archive-health brief will reopen here with graph-focused continuity."
              : workflowId === "vault-weekly"
                ? "Run /weekly from HQ and the durable seven-day archive synthesis will reopen here with exact continuity."
              : compiledFilter === "route-less"
            ? "Every loaded compiled page already carries route context, so continuation can reopen the right working lane."
            : compiledFilter === "untagged"
              ? "Every loaded compiled page already carries tags, so retrieval and graph edges stay stronger."
              : compiledFilter === "reverse-engineering"
                ? "File a binary triage report from RECON or promote one into an analyst brief and it will show up here as durable reverse-engineering memory."
              : "Run /deepresearch, /compare, /brief, /threat-hunt, or /evidence-pack in HQ and the durable workflow pages will appear here."
        }
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {compiledFilter === "all" && recentDurableThreads.length > 0 ? (
        <div
          style={{
            display: "grid",
            gap: "10px",
            padding: "12px",
            borderRadius: "14px",
            border: "1px solid rgba(123, 167, 212, 0.16)",
            background: "rgba(10, 15, 30, 0.62)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
            <div>
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "#bfdbfe",
                  textTransform: "uppercase",
                  letterSpacing: "0.8px",
                }}
              >
                Recent durable threads
              </div>
              <div style={{ fontSize: "11px", color: "var(--text3)", marginTop: "4px", lineHeight: 1.5 }}>
                {workflowId === "market-review"
                  ? "Reopen thesis continuity, the strongest next rule, or file the next market review from the same lane."
                  : workflowId === "vuln-review"
                    ? "Reopen the latest defensive review, jump back into CYBER, or widen into the saved archive only after the repair lane is explicit."
                  : workflowId === "osint-casefile"
                    ? "Reopen passive-first case progression before widening collection or packaging."
                    : workflowId === "repo-assimilation"
                      ? "Reopen the latest repo-fit brief, send the saved assimilation to ORBIT, or return to RECON before widening local implementation."
                    : workflowId === "vault-librarian"
                      ? "Reopen the latest archive audit, jump back into exact graph focus, or widen into the saved audit archive only when maintenance posture is clear."
                    : workflowId === "vault-weekly"
                      ? "Reopen the latest weekly brief, jump back into the weekly archive lane, or widen into the saved weekly archive only when compounding posture is clear."
                    : "Recent XR1 and durable archive threads stay visible here as the compact hot-cache layer."}
              </div>
            </div>
            {workflowId ? (
              <button
                type="button"
                onClick={() => router.push("/vault?focus=vault-compiled-pages")}
                className="nexus-shell-button"
                style={{ minHeight: "32px", padding: "0 12px", fontSize: "11px" }}
              >
                Open all compiled pages
              </button>
            ) : null}
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {workflowId === "market-review" && strongestMarketReview ? (
              <button
                type="button"
                onClick={() => openExactCompiledPage(strongestMarketReview)}
                className="nexus-shell-button"
                style={{ minHeight: "32px", padding: "0 12px", fontSize: "11px" }}
                title={strongestMarketReview.summary}
              >
                Strongest prior
              </button>
            ) : null}
            {workflowId === "market-review" && newestMarketReview ? (
              <button
                type="button"
                onClick={() => openExactCompiledPage(newestMarketReview)}
                className="nexus-shell-button"
                style={{ minHeight: "32px", padding: "0 12px", fontSize: "11px" }}
                title={newestMarketReview.title}
              >
                Newest review
              </button>
            ) : null}
            {workflowId === "market-review" ? (
              <button
                type="button"
                onClick={() => router.push("/alpha?view=watchlist&focus=alpha-market-review")}
                className="nexus-shell-button"
                style={{ minHeight: "32px", padding: "0 12px", fontSize: "11px" }}
              >
                Reopen in ALPHA
              </button>
            ) : null}
            {workflowId === "vuln-review" && latestVulnerabilityReview ? (
              <button
                type="button"
                onClick={() => openExactCompiledPage(latestVulnerabilityReview)}
                className="nexus-shell-button"
                style={{ minHeight: "32px", padding: "0 12px", fontSize: "11px" }}
                title={latestVulnerabilityReview.title}
              >
                Latest review
              </button>
            ) : null}
            {workflowId === "vuln-review" ? (
              <button
                type="button"
                onClick={() => router.push("/cyber?view=vuln-review&focus=cyber-vuln-review")}
                className="nexus-shell-button"
                style={{ minHeight: "32px", padding: "0 12px", fontSize: "11px" }}
              >
                Reopen in CYBER
              </button>
            ) : null}
            {workflowId === "vuln-review" ? (
              <button
                type="button"
                onClick={() => router.push("/vault?focus=vault-compiled-pages&workflowId=vuln-review")}
                className="nexus-shell-button"
                style={{ minHeight: "32px", padding: "0 12px", fontSize: "11px" }}
              >
                Open review archive
              </button>
            ) : null}
            {workflowId === "repo-assimilation" && latestRepoAssimilation ? (
              <button
                type="button"
                onClick={() => openExactCompiledPage(latestRepoAssimilation)}
                className="nexus-shell-button"
                style={{ minHeight: "32px", padding: "0 12px", fontSize: "11px" }}
                title={latestRepoAssimilation.title}
              >
                Latest assimilation
              </button>
            ) : null}
            {workflowId === "repo-assimilation" && latestRepoAssimilation ? (
              <button
                type="button"
                onClick={() => briefOrbitFromAssimilation(latestRepoAssimilation)}
                className="nexus-shell-button"
                style={{ minHeight: "32px", padding: "0 12px", fontSize: "11px" }}
              >
                Brief ORBIT
              </button>
            ) : null}
            {workflowId === "repo-assimilation" ? (
              <button
                type="button"
                onClick={() => router.push("/recon?view=osint&focus=recon-repo-intel")}
                className="nexus-shell-button"
                style={{ minHeight: "32px", padding: "0 12px", fontSize: "11px" }}
              >
                Reopen in RECON
              </button>
            ) : null}
            {workflowId === "vault-librarian" && latestVaultLibrarian ? (
              <button
                type="button"
                onClick={() => openExactCompiledPage(latestVaultLibrarian)}
                className="nexus-shell-button"
                style={{ minHeight: "32px", padding: "0 12px", fontSize: "11px" }}
                title={latestVaultLibrarian.title}
              >
                Latest audit
              </button>
            ) : null}
            {workflowId === "vault-weekly" && latestVaultWeekly ? (
              <button
                type="button"
                onClick={() => openExactCompiledPage(latestVaultWeekly)}
                className="nexus-shell-button"
                style={{ minHeight: "32px", padding: "0 12px", fontSize: "11px" }}
                title={latestVaultWeekly.title}
              >
                Latest weekly brief
              </button>
            ) : null}
            {workflowId === "vault-weekly" ? (
              <button
                type="button"
                onClick={() => router.push("/hq?focus=hq-chronicle")}
                className="nexus-shell-button"
                style={{ minHeight: "32px", padding: "0 12px", fontSize: "11px" }}
              >
                Reopen in HQ
              </button>
            ) : null}
            {workflowId === "vault-weekly" ? (
              <button
                type="button"
                onClick={() => router.push("/vault?focus=vault-compiled-pages&workflowId=vault-weekly")}
                className="nexus-shell-button"
                style={{ minHeight: "32px", padding: "0 12px", fontSize: "11px" }}
              >
                Open weekly archive
              </button>
            ) : null}
            {workflowId === "vault-librarian" ? (
              <button
                type="button"
                onClick={() => router.push("/vault?focus=vault-graph-focus")}
                className="nexus-shell-button"
                style={{ minHeight: "32px", padding: "0 12px", fontSize: "11px" }}
              >
                Reopen graph focus
              </button>
            ) : null}
            {workflowId === "vault-librarian" ? (
              <button
                type="button"
                onClick={() => router.push("/vault?focus=vault-compiled-pages&workflowId=vault-librarian")}
                className="nexus-shell-button"
                style={{ minHeight: "32px", padding: "0 12px", fontSize: "11px" }}
              >
                Open audit archive
              </button>
            ) : null}
            {workflowId === "repo-compare" && latestRepoCompare ? (
              <button
                type="button"
                onClick={() => openExactCompiledPage(latestRepoCompare)}
                className="nexus-shell-button"
                style={{ minHeight: "32px", padding: "0 12px", fontSize: "11px" }}
                title={latestRepoCompare.title}
              >
                Latest comparison
              </button>
            ) : null}
            {workflowId === "repo-compare" && latestRepoCompare ? (
              <button
                type="button"
                onClick={() => briefOrbitFromRepoCompare(latestRepoCompare)}
                className="nexus-shell-button"
                style={{ minHeight: "32px", padding: "0 12px", fontSize: "11px" }}
              >
                Brief ORBIT
              </button>
            ) : null}
            {workflowId === "repo-compare" ? (
              <button
                type="button"
                onClick={() => router.push("/recon?view=osint&focus=recon-repo-intel")}
                className="nexus-shell-button"
                style={{ minHeight: "32px", padding: "0 12px", fontSize: "11px" }}
              >
                Reopen in RECON
              </button>
            ) : null}
            {recentDurableThreads.map((page) => (
              <button
                key={page.id}
                type="button"
                onClick={() => openExactCompiledPage(page)}
                className="nexus-shell-button"
                style={{ minHeight: "32px", padding: "0 12px", fontSize: "11px" }}
                title={page.summary}
              >
                {truncateInline(page.title, 42)}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {compiledFilter !== "all" ? (
        <div style={{ display: "grid", gap: "10px" }}>
          <SurfaceCallout
            tone="info"
            compact
            icon="→"
            title={
              compiledFilter === "route-less"
                ? "Repair view: route-less compiled pages"
                : compiledFilter === "untagged"
                  ? "Repair view: untagged compiled pages"
                  : "Repair view: reverse-engineering memory"
            }
            description={
              compiledFilter === "route-less"
                ? "These compiled pages do not yet reopen the right route, so continuation is weaker until route context is added."
                : compiledFilter === "untagged"
                  ? "These compiled pages need tags so retrieval, grouping, and graph continuity stay stronger."
                  : "These durable reverse-engineering prep notes and promoted briefs preserve local triage plus higher-order synthesis, and this repair lane keeps them routed, tagged, and easy to reopen later."
            }
          />
          {repairActions.length > 0 ? (
            <ActionSessionCluster
              items={repairActions}
              onOpen={(href) => router.push(href)}
              buttonClassName="nexus-shell-button"
              buttonStyle={{ minHeight: "32px", padding: "0 12px", fontSize: "11px" }}
              maxPrimaryItems={1}
              showPrimaryCards={false}
            />
          ) : null}
        </div>
      ) : null}
      {filteredPages.map((page) => {
        const presentation = getCompiledPagePresentation(page);
        const marketReviewLessons = getMarketReviewLessons(page);
        const repoAssimilationInsights = getRepoAssimilationInsights(page);
        const repoCompareInsights = getRepoCompareInsights(page);
        const vaultLibrarianInsights = getVaultLibrarianInsights(page);
        const vaultWeeklyInsights = getVaultWeeklyInsights(page);
        const pagePromotionState = promotionState[page.id];
        const promotionEvaluation = getArtifactPromotionEvaluation(page);
        const relatedPages =
          activePageId === page.id ? rankRelatedArtifacts(page, filteredPages, 3) : [];
        return (
          <article
          key={page.id}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            padding: "12px",
            borderRadius: "14px",
            ...presentation.articleStyle,
          }}
        >
          {presentation.eyebrow ? (
            <div
              style={{
                fontSize: "10px",
                fontWeight: 700,
                color: "#93c5fd",
                textTransform: "uppercase",
                letterSpacing: "0.8px",
              }}
            >
              {presentation.eyebrow}
            </div>
          ) : null}
          <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", flexWrap: "wrap" }}>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text)" }}>
              {page.title}
            </div>
            <div style={{ fontSize: "11px", color: "var(--text2)" }}>
              {new Date(page.updatedAt).toLocaleDateString()}
            </div>
          </div>

          <div style={{ fontSize: "12px", lineHeight: 1.45, color: "var(--text2)" }}>
            {page.summary}
          </div>

          {presentation.cue ? (
            <div style={{ fontSize: "11px", lineHeight: 1.45, color: "#bfdbfe" }}>
              {presentation.cue}
            </div>
          ) : null}

          {marketReviewLessons ? (
            <div
              style={{
                display: "grid",
                gap: "4px",
                padding: "8px 10px",
                borderRadius: "10px",
                border: "1px solid rgba(250, 204, 21, 0.14)",
                background: "rgba(31, 23, 7, 0.34)",
                fontSize: "10px",
                lineHeight: 1.45,
                color: "var(--text3)",
              }}
            >
              {marketReviewLessons.nextRule ? (
                <div>
                  <strong style={{ color: "#fde68a" }}>Next rule:</strong>{" "}
                  {truncateInline(marketReviewLessons.nextRule, 156)}
                </div>
              ) : null}
              {marketReviewLessons.whatToRepeat ? (
                <div>
                  <strong style={{ color: "var(--text)" }}>Repeat:</strong>{" "}
                  {truncateInline(marketReviewLessons.whatToRepeat, 156)}
                </div>
              ) : null}
              {marketReviewLessons.whatToAvoid ? (
                <div>
                  <strong style={{ color: "var(--text)" }}>Avoid:</strong>{" "}
                  {truncateInline(marketReviewLessons.whatToAvoid, 156)}
                </div>
              ) : null}
            </div>
          ) : null}

          {repoAssimilationInsights ? (
            <div
              style={{
                display: "grid",
                gap: "4px",
                padding: "8px 10px",
                borderRadius: "10px",
                border: "1px solid rgba(110, 231, 183, 0.14)",
                background: "rgba(8, 26, 22, 0.34)",
                fontSize: "10px",
                lineHeight: 1.45,
                color: "var(--text3)",
              }}
            >
              {repoAssimilationInsights.nexusFitMap ? (
                <div>
                  <strong style={{ color: "#a7f3d0" }}>Fit map:</strong>{" "}
                  {truncateInline(repoAssimilationInsights.nexusFitMap, 164)}
                </div>
              ) : null}
              {repoAssimilationInsights.safeAdoptionPoints ? (
                <div>
                  <strong style={{ color: "var(--text)" }}>Safe adoption:</strong>{" "}
                  {truncateInline(repoAssimilationInsights.safeAdoptionPoints, 164)}
                </div>
              ) : null}
              {repoAssimilationInsights.boundariesAndRisks ? (
                <div>
                  <strong style={{ color: "var(--text)" }}>Boundaries:</strong>{" "}
                  {truncateInline(repoAssimilationInsights.boundariesAndRisks, 164)}
                </div>
              ) : null}
            </div>
          ) : null}

          {repoCompareInsights ? (
            <div
              style={{
                display: "grid",
                gap: "4px",
                padding: "8px 10px",
                borderRadius: "10px",
                border: "1px solid rgba(191, 219, 254, 0.14)",
                background: "rgba(10, 18, 31, 0.34)",
                fontSize: "10px",
                lineHeight: 1.45,
                color: "var(--text3)",
              }}
            >
              {repoCompareInsights.recommendedPick ? (
                <div>
                  <strong style={{ color: "#bfdbfe" }}>Recommended:</strong>{" "}
                  {truncateInline(repoCompareInsights.recommendedPick, 164)}
                </div>
              ) : null}
              {repoCompareInsights.keyDifferences ? (
                <div>
                  <strong style={{ color: "var(--text)" }}>Differences:</strong>{" "}
                  {truncateInline(repoCompareInsights.keyDifferences, 164)}
                </div>
              ) : null}
              {repoCompareInsights.boundariesAndRisks ? (
                <div>
                  <strong style={{ color: "var(--text)" }}>Boundaries:</strong>{" "}
                  {truncateInline(repoCompareInsights.boundariesAndRisks, 164)}
                </div>
              ) : null}
            </div>
          ) : null}

          {vaultLibrarianInsights ? (
            <div
              style={{
                display: "grid",
                gap: "4px",
                padding: "8px 10px",
                borderRadius: "10px",
                border: "1px solid rgba(125, 211, 252, 0.14)",
                background: "rgba(9, 20, 34, 0.34)",
                fontSize: "10px",
                lineHeight: 1.45,
                color: "var(--text3)",
              }}
            >
              {vaultLibrarianInsights.highestPriorityRepairs ? (
                <div>
                  <strong style={{ color: "#bae6fd" }}>Repair cue:</strong>{" "}
                  {truncateInline(
                    vaultLibrarianInsights.highestPriorityRepairs
                      .replace(/^- /gm, "")
                      .replace(/\s+/g, " "),
                    164,
                  )}
                </div>
              ) : null}
              {vaultLibrarianInsights.topGaps ? (
                <div>
                  <strong style={{ color: "var(--text)" }}>Gap topics:</strong>{" "}
                  {truncateInline(
                    vaultLibrarianInsights.topGaps
                      .replace(/^- /gm, "")
                      .replace(/\s+/g, " "),
                    164,
                  )}
                </div>
              ) : null}
              {vaultLibrarianInsights.strongestNextSession ? (
                <div>
                  <strong style={{ color: "var(--text)" }}>Next session:</strong>{" "}
                  {truncateInline(
                    vaultLibrarianInsights.strongestNextSession
                      .replace(/^- /gm, "")
                      .replace(/\s+/g, " "),
                    164,
                  )}
                </div>
              ) : null}
            </div>
          ) : null}

          {vaultWeeklyInsights ? (
            <div
              style={{
                display: "grid",
                gap: "4px",
                padding: "8px 10px",
                borderRadius: "10px",
                border: "1px solid rgba(125, 211, 252, 0.14)",
                background: "rgba(9, 20, 34, 0.34)",
                fontSize: "10px",
                lineHeight: 1.45,
                color: "var(--text3)",
              }}
            >
              {vaultWeeklyInsights.vaultPosture ? (
                <div>
                  <strong style={{ color: "#bae6fd" }}>Posture:</strong>{" "}
                  {truncateInline(vaultWeeklyInsights.vaultPosture, 164)}
                </div>
              ) : null}
              {vaultWeeklyInsights.topThemes ? (
                <div>
                  <strong style={{ color: "var(--text)" }}>Themes:</strong>{" "}
                  {truncateInline(vaultWeeklyInsights.topThemes, 164)}
                </div>
              ) : null}
              {vaultWeeklyInsights.repairLane ? (
                <div>
                  <strong style={{ color: "var(--text)" }}>Repair lane:</strong>{" "}
                  {truncateInline(vaultWeeklyInsights.repairLane, 164)}
                </div>
              ) : null}
            </div>
          ) : null}

          <div style={{ fontSize: "11px", lineHeight: 1.45, color: "var(--text3)" }}>
            {buildCompiledPageMeta(page)}
            {page.researchSignals.signalsWithheld
              ? " · research signals withheld"
              : page.researchSignals.referencedDomains.length > 0
                ? ` · ${truncateInline(page.researchSignals.referencedDomains.join(", "), 72)}`
                : ""}
          </div>

          <MissionContinuationActions
            memoryQuery={[page.title, page.summary].filter(Boolean).join("\n")}
            routeHint={page.route}
            extraTargets={
              page.layer !== "raw"
                ? ([
                    {
                      href: buildMissionHref("/vault", "archive"),
                      label: "Continue in VAULT",
                      tab: "vault",
                    },
                  ] satisfies MissionContinuationTarget[])
                : undefined
            }
            showReturnToHQ
          />

          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {presentation.accentBadges.map((badge) => (
              <ShellBadge key={badge.label} tone={badge.tone}>
                {badge.label}
              </ShellBadge>
            ))}
            <ShellBadge tone="accent">{page.layer}</ShellBadge>
            <ShellBadge tone="muted">{page.domain}</ShellBadge>
            <ShellBadge tone={page.visibility === "safe" ? "success" : "muted"}>
              {page.visibility}
            </ShellBadge>
            {page.workflowLabel ? (
              <ShellBadge tone="muted">{page.workflowLabel}</ShellBadge>
            ) : null}
            {page.agentId ? (
              <ShellBadge tone="muted">{page.agentId}</ShellBadge>
            ) : null}
          </div>

          <div style={{ fontSize: "10px", lineHeight: 1.45, color: "var(--text3)" }}>
            {truncateInline(page.sourceLabel, 96)}
            {page.documentMetadata &&
            !page.documentMetadata.metadataWithheld &&
            page.documentMetadata.originLabel
              ? ` · ${truncateInline(page.documentMetadata.originLabel, 72)}`
              : ""}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => void togglePageDetail(page)}
                disabled={detailLoading && activePageId !== page.id}
                className="nexus-shell-button"
                style={{ minHeight: "32px", padding: "0 12px", fontSize: "11px" }}
              >
                {activePageId === page.id ? "Hide page" : "Read page"}
              </button>
              {page.workflowId === "market-review" ||
              page.workflowId === "vuln-review" ||
              page.workflowId === "osint-casefile" ||
              page.workflowId === "repo-assimilation" ||
              page.workflowId === "vault-librarian" ||
              page.workflowId === "vault-weekly" ||
              page.workflowId === "repo-compare" ? (
                <button
                  type="button"
                  onClick={() => openExactCompiledPage(page)}
                  className="nexus-shell-button"
                  style={{ minHeight: "32px", padding: "0 12px", fontSize: "11px" }}
                >
                  Exact reopen
                </button>
              ) : null}
              {page.workflowId === "repo-assimilation" ? (
                <button
                  type="button"
                  onClick={() => briefOrbitFromAssimilation(page)}
                  className="nexus-shell-button"
                  style={{ minHeight: "32px", padding: "0 12px", fontSize: "11px" }}
                  disabled={!page.content}
                >
                  Brief ORBIT
                </button>
              ) : null}
              {page.workflowId === "repo-compare" ? (
                <button
                  type="button"
                  onClick={() => briefOrbitFromRepoCompare(page)}
                  className="nexus-shell-button"
                  style={{ minHeight: "32px", padding: "0 12px", fontSize: "11px" }}
                  disabled={!page.content}
                >
                  Brief ORBIT
                </button>
              ) : null}
              {page.workflowId === "vault-librarian" ? (
                <button
                  type="button"
                  onClick={() => router.push("/vault?focus=vault-graph-focus")}
                  className="nexus-shell-button"
                  style={{ minHeight: "32px", padding: "0 12px", fontSize: "11px" }}
                >
                  Reopen graph focus
                </button>
              ) : null}
              {page.workflowId === "vault-weekly" ? (
                <button
                  type="button"
                  onClick={() => router.push("/vault?focus=vault-compiled-pages&workflowId=vault-weekly")}
                  className="nexus-shell-button"
                  style={{ minHeight: "32px", padding: "0 12px", fontSize: "11px" }}
                >
                  Weekly archive
                </button>
              ) : null}
              {page.workflowId === "vuln-review" ? (
                <button
                  type="button"
                  onClick={() => router.push("/cyber?view=vuln-review&focus=cyber-vuln-review")}
                  className="nexus-shell-button"
                  style={{ minHeight: "32px", padding: "0 12px", fontSize: "11px" }}
                >
                  Reopen in CYBER
                </button>
              ) : null}
              {promotionEvaluation.targetClass ? (
                <button
                  type="button"
                  onClick={() => void promoteToBrief(page)}
                  disabled={
                    pagePromotionState?.state === "saving" ||
                    !promotionEvaluation.eligible
                  }
                  className="nexus-shell-button"
                  style={{ minHeight: "32px", padding: "0 12px", fontSize: "11px" }}
                  title={promotionEvaluation.reason}
                >
                  {pagePromotionState?.state === "saving"
                    ? "Promoting…"
                    : pagePromotionState?.state === "saved"
                      ? getPromotionReadyLabel(promotionEvaluation.targetClass)
                      : getPromotionActionLabel(promotionEvaluation.targetClass)}
                </button>
              ) : null}
            </div>
            <div style={{ display: "grid", justifyItems: "end", gap: "4px" }}>
              {page.contentWithheld ? (
                <span style={{ fontSize: "10px", color: "var(--text3)" }}>
                  Restricted page content withheld
                </span>
              ) : null}
              {pagePromotionState?.state === "saved" ? (
                <span style={{ fontSize: "10px", color: "#bfdbfe" }}>
                  Higher-order brief is durable in VAULT.
                </span>
              ) : null}
              {pagePromotionState?.state === "error" ? (
                <span style={{ fontSize: "10px", color: "var(--flo)" }}>
                  {getPromotionFailureLabel(promotionEvaluation.targetClass)}
                </span>
              ) : null}
            </div>
          </div>

          {activePageId === page.id ? (
            <div
              style={{
                padding: "10px 12px",
                borderRadius: "12px",
                border: "1px solid rgba(123, 167, 212, 0.12)",
                background: "rgba(9, 14, 28, 0.55)",
                fontSize: "11px",
                lineHeight: 1.55,
                color: "var(--text2)",
                whiteSpace: "pre-wrap",
              }}
            >
              {!page.researchSignals.signalsWithheld &&
              (page.researchSignals.sectionHeadings.length > 0 ||
                page.researchSignals.referencedDomains.length > 0) ? (
                <div
                  style={{
                    display: "grid",
                    gap: "6px",
                    marginBottom: "10px",
                    paddingBottom: "10px",
                    borderBottom: "1px solid rgba(123, 167, 212, 0.12)",
                  }}
                >
                  {page.contentPreview ? (
                    <div>
                      <strong style={{ color: "var(--text)" }}>Preview:</strong>{" "}
                      {truncateInline(page.contentPreview, 220)}
                    </div>
                  ) : null}
                  {page.researchSignals.sectionHeadings.length > 0 ? (
                    <div>
                      <strong style={{ color: "var(--text)" }}>Sections:</strong>{" "}
                      {page.researchSignals.sectionHeadings.join(" · ")}
                    </div>
                  ) : null}
                  {page.researchSignals.referencedDomains.length > 0 ? (
                    <div>
                      <strong style={{ color: "var(--text)" }}>Referenced domains:</strong>{" "}
                      {page.researchSignals.referencedDomains.join(", ")}
                    </div>
                  ) : null}
                  {page.continuity.sourceRefs.length > 0 ? (
                    <div>
                      <strong style={{ color: "var(--text)" }}>Source trail:</strong>{" "}
                      {page.continuity.sourceRefs
                        .slice(0, 4)
                        .map((sourceRef) => sourceRef.title)
                        .join(" · ")}
                    </div>
                  ) : null}
                </div>
              ) : null}
              {relatedPages.length > 0 ? (
                <div
                  style={{
                    display: "grid",
                    gap: "6px",
                    marginBottom: "10px",
                    paddingBottom: "10px",
                    borderBottom: "1px solid rgba(123, 167, 212, 0.12)",
                  }}
                >
                  <strong style={{ color: "var(--text)" }}>Related durable notes:</strong>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {relatedPages.map((match) => (
                      <button
                        key={match.item.id}
                        type="button"
                        onClick={() => openExactCompiledPage(match.item)}
                        className="nexus-shell-button"
                        style={{ minHeight: "30px", padding: "0 10px", fontSize: "10px" }}
                        title={match.reasons.join(" · ")}
                      >
                        Read {truncateInline(match.item.title, 42)}
                      </button>
                    ))}
                  </div>
                  <div style={{ fontSize: "10px", color: "var(--text3)" }}>
                    {relatedPages
                      .map((match) => match.reasons.slice(0, 2).join(" · "))
                      .join(" · ")}
                  </div>
                </div>
              ) : null}
              {page.contentWithheld
                ? "This page is restricted. Metadata and counts remain visible, but the compiled page body is intentionally withheld from the shared VAULT surface."
                : page.content ?? page.contentPreview}
            </div>
          ) : null}
        </article>
      )})}
    </div>
  );
}
