import { callAI } from "@/lib/ai";
import type { ResearchSourceRef } from "@/lib/researchSources";
import type { Article } from "@/store/useStore";
import type { CompiledMemoryPageSummary } from "@/components/vault/vaultGraphPageUtils";
import { buildCompiledPageHref } from "@/lib/xr1Workflows";
import { getArticleReasoningSummary } from "@/lib/articleReasoning";

export interface VaultWeeklySynthesisResult {
  content: string;
  sourceRefs: ResearchSourceRef[];
  tags: string[];
}

export interface VaultWeeklyInsights {
  vaultPosture?: string;
  topThemes?: string;
  notableSignals?: string;
  repairLane?: string;
  strongestNextSession?: string;
}

interface WeeklyArtifact {
  id: string;
  kind: "clip" | "page";
  title: string;
  summary: string;
  timestamp: number;
  route?: string | null;
  topic?: string | null;
  workflowId?: string | null;
  domain: string;
  tags: string[];
  href?: string | null;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function normalizeList(values: Array<string | null | undefined>, max = 6) {
  return Array.from(
    new Set(
      values.map((value) => value?.trim().toLowerCase() ?? "").filter(Boolean),
    ),
  ).slice(0, max);
}

function trimInline(value: string, max = 180) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1).trimEnd()}…`;
}

function toWeeklyArtifacts(input: {
  savedArticles: Article[];
  compiledPages: CompiledMemoryPageSummary[];
}) {
  const cutoff = Date.now() - SEVEN_DAYS_MS;
  const articleArtifacts = input.savedArticles
    .map<WeeklyArtifact | null>((article) => {
      const timestamp = Date.parse(article.date);
      if (!Number.isFinite(timestamp) || timestamp < cutoff) return null;
      return {
        id: article.id,
        kind: "clip",
        title: article.title,
        summary: getArticleReasoningSummary(article),
        timestamp,
        route: null,
        topic: null,
        workflowId: null,
        domain: article.cat ?? "general",
        tags: normalizeList(article.tags ?? [], 6),
        href: article.link || null,
      };
    })
    .filter((artifact): artifact is WeeklyArtifact => Boolean(artifact));

  const pageArtifacts = input.compiledPages
    .map<WeeklyArtifact | null>((page) => {
      if (page.updatedAt < cutoff) return null;
      return {
        id: `page:${page.id}`,
        kind: "page",
        title: page.title,
        summary: page.summary,
        timestamp: page.updatedAt,
        route: page.route ?? null,
        topic: page.topic ?? null,
        workflowId: page.workflowId ?? null,
        domain: page.domain,
        tags: normalizeList(page.tags ?? [], 8),
        href: buildCompiledPageHref(page),
      };
    })
    .filter((artifact): artifact is WeeklyArtifact => Boolean(artifact));

  return [...articleArtifacts, ...pageArtifacts].sort(
    (left, right) => right.timestamp - left.timestamp,
  );
}

function countByKey(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return Array.from(counts.entries()).sort((left, right) => right[1] - left[1]);
}

function buildFallbackWeeklyContent(artifacts: WeeklyArtifact[]) {
  const clipCount = artifacts.filter(
    (artifact) => artifact.kind === "clip",
  ).length;
  const pageCount = artifacts.filter(
    (artifact) => artifact.kind === "page",
  ).length;
  const topDomains = countByKey(artifacts.map((artifact) => artifact.domain))
    .slice(0, 3)
    .map(([domain]) => domain.replace(/-/g, " "));
  const topThemes = countByKey(
    artifacts.flatMap((artifact) => [
      artifact.workflowId ?? "",
      artifact.route?.replace(/^\//, "") ?? "",
      ...artifact.tags,
    ]),
  )
    .filter(([value]) => value.length > 0)
    .slice(0, 3)
    .map(([value]) => value.replace(/-/g, " "));
  const latestTitles = artifacts.slice(0, 3).map((artifact) => artifact.title);
  const routeLessCount = artifacts.filter(
    (artifact) => artifact.kind === "page" && !artifact.route?.trim(),
  ).length;
  const untaggedCount = artifacts.filter(
    (artifact) => artifact.tags.length === 0,
  ).length;
  const strongestNextSession = artifacts[0]?.route?.trim()
    ? `Reopen ${artifacts[0].title} in ${artifacts[0].route}.`
    : artifacts[0]
      ? `Promote the latest theme around ${artifacts[0].title}.`
      : "No weekly archive material is available yet.";

  return [
    `- Vault posture: ${artifacts.length} recent artifact${artifacts.length === 1 ? "" : "s"} landed this week (${clipCount} clips, ${pageCount} compiled pages), with the archive leaning ${topDomains.join(", ") || "mixed"} this pass.`,
    `- Top themes: ${topThemes.join(", ") || "No dominant themes yet"} stood out most clearly across the last seven days of saved clips and durable pages.`,
    `- Notable signals: ${latestTitles.join(" · ") || "No recent saved signals yet"} are the strongest concrete items worth reopening first.`,
    `- Repair lane: ${routeLessCount} route-less compiled page${routeLessCount === 1 ? "" : "s"} and ${untaggedCount} untagged artifact${untaggedCount === 1 ? "" : "s"} remain the clearest archive-maintenance pressure points.`,
    `- Strongest next session: ${strongestNextSession}`,
  ].join("\n");
}

function buildWeeklyPrompt(artifacts: WeeklyArtifact[]) {
  const compactArtifacts = artifacts.slice(0, 14).map((artifact, index) => {
    return [
      `${index + 1}. ${artifact.title}`,
      `kind=${artifact.kind}`,
      `domain=${artifact.domain}`,
      artifact.workflowId ? `workflow=${artifact.workflowId}` : "",
      artifact.route ? `route=${artifact.route}` : "",
      artifact.tags.length > 0 ? `tags=${artifact.tags.join(",")}` : "",
      `summary=${trimInline(artifact.summary, 140)}`,
    ]
      .filter(Boolean)
      .join(" | ");
  });

  return [
    "Return exactly 5 markdown bullets.",
    "Each bullet must start with one of these labels and a colon:",
    "- Vault posture:",
    "- Top themes:",
    "- Notable signals:",
    "- Repair lane:",
    "- Strongest next session:",
    "Do not add headings or extra bullets.",
    "Use only the provided local archive material.",
    "",
    "Recent archive material:",
    ...compactArtifacts,
  ].join("\n");
}

function sanitizeWeeklyContent(content: string, fallback: string) {
  const bullets = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^-\s+[A-Za-z]/.test(line))
    .slice(0, 5);

  if (bullets.length !== 5) return fallback;

  const requiredLabels = [
    "vault posture:",
    "top themes:",
    "notable signals:",
    "repair lane:",
    "strongest next session:",
  ];
  const normalized = bullets.map((line) => line.toLowerCase());
  if (
    !requiredLabels.every((label, index) => normalized[index]?.includes(label))
  ) {
    return fallback;
  }
  return bullets.join("\n");
}

export function buildVaultWeeklySourceRefs(input: {
  savedArticles: Article[];
  compiledPages: CompiledMemoryPageSummary[];
}): ResearchSourceRef[] {
  const artifacts = toWeeklyArtifacts(input).slice(0, 6);
  return artifacts.map((artifact, index) => ({
    id: `vault-weekly-${index + 1}`,
    title: artifact.title,
    sourceType: "vault-artifact",
    evidenceStrength: "contextual",
    href: artifact.href ?? null,
  }));
}

export async function buildVaultWeeklySynthesis(input: {
  savedArticles: Article[];
  compiledPages: CompiledMemoryPageSummary[];
}): Promise<VaultWeeklySynthesisResult> {
  const artifacts = toWeeklyArtifacts(input);
  const fallback = buildFallbackWeeklyContent(artifacts);

  if (artifacts.length === 0) {
    return {
      content: fallback,
      sourceRefs: [],
      tags: ["vault-weekly", "archive-synthesis", "empty-archive"],
    };
  }

  let content = fallback;
  try {
    const raw = await callAI(buildWeeklyPrompt(artifacts), 420, "reasoning");
    content = sanitizeWeeklyContent(raw, fallback);
  } catch {
    content = fallback;
  }

  return {
    content,
    sourceRefs: buildVaultWeeklySourceRefs(input),
    tags: normalizeList(
      [
        "vault-weekly",
        "archive-synthesis",
        ...artifacts.flatMap((artifact) => artifact.tags.slice(0, 2)),
        ...artifacts.slice(0, 3).map((artifact) => artifact.domain),
      ],
      10,
    ),
  };
}

export function parseVaultWeeklyMarkdown(content: string): VaultWeeklyInsights {
  const insights: VaultWeeklyInsights = {};
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "));

  for (const line of lines) {
    const normalized = line.replace(/^- /, "");
    if (normalized.toLowerCase().startsWith("vault posture:")) {
      insights.vaultPosture = normalized.slice("Vault posture:".length).trim();
    } else if (normalized.toLowerCase().startsWith("top themes:")) {
      insights.topThemes = normalized.slice("Top themes:".length).trim();
    } else if (normalized.toLowerCase().startsWith("notable signals:")) {
      insights.notableSignals = normalized
        .slice("Notable signals:".length)
        .trim();
    } else if (normalized.toLowerCase().startsWith("repair lane:")) {
      insights.repairLane = normalized.slice("Repair lane:".length).trim();
    } else if (normalized.toLowerCase().startsWith("strongest next session:")) {
      insights.strongestNextSession = normalized
        .slice("Strongest next session:".length)
        .trim();
    }
  }

  return insights;
}
