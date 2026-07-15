// ── lib/secondBrainExport ──────────────────────────────────────────────────
// Build a multi-file Obsidian-ready markdown bundle from saved clips and
// durable compiled artifacts.

import type {
  ArtifactContinuityComparable,
  ArtifactContinuityMetadata,
} from "@/lib/artifactContinuity";
import {
  buildArtifactContinuityMetadata,
  rankRelatedArtifacts,
} from "@/lib/artifactContinuity";
import type { VaultArchiveLink } from "@/components/home/office/types";
import type { Article } from "@/store/useStore";

// ── Types ──────────────────────────────────────────────────────────────────
export type SecondBrainExportMode = "full" | "compiled" | "clips" | "heartbeat";

export const SECOND_BRAIN_EXPORT_MODE_LABELS: Record<
  SecondBrainExportMode,
  string
> = {
  full: "Full pack",
  compiled: "Compiled only",
  clips: "Clips only",
  heartbeat: "Heartbeat",
};

export interface SecondBrainExportFile {
  path: string;
  content: string;
}

export interface SecondBrainExportBundle {
  mode: SecondBrainExportMode;
  files: SecondBrainExportFile[];
  totalNotes: number;
  exportDate: string;
}

export interface SecondBrainExportCompiledArtifact {
  id: string;
  title: string;
  summary: string;
  contentPreview: string;
  sourceLabel: string;
  workflowId?: string;
  workflowLabel?: string;
  route?: string;
  topic?: string;
  domain: string;
  visibility: "safe" | "internal" | "restricted";
  tags: string[];
  continuity: ArtifactContinuityMetadata;
  createdAt: number;
  updatedAt: number;
  content?: string;
  contentWithheld?: boolean;
}

export interface SecondBrainExportInput {
  articles: Article[];
  compiledPages?: SecondBrainExportCompiledArtifact[];
  mode?: SecondBrainExportMode;
}

interface SecondBrainExportArtifact extends ArtifactContinuityComparable {
  id: string;
  kind: "clip" | "compiled_page";
  title: string;
  summary: string;
  content: string;
  sourceLabel: string;
  dateLabel: string;
  domain: string;
  tags: string[];
  link?: string | null;
  route?: string | null;
  visibility: "safe" | "internal" | "restricted";
  continuity: ArtifactContinuityMetadata;
  notePath: string;
  archiveLinks: VaultArchiveLink[];
  workflowId?: string | null;
  workflowLabel?: string | null;
  topic?: string | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function safeName(s: string) {
  return s
    .replace(/[/\\:*?"<>|]/g, "-")
    .slice(0, 80)
    .trim();
}

function fmtDate(d: string) {
  return (d ?? "").slice(0, 10);
}

function fmtTimestamp(value: number) {
  return new Date(value).toISOString().slice(0, 10);
}

function truncateInline(text: string, max = 220) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
}

function assignNotePaths(
  artifacts: Omit<SecondBrainExportArtifact, "notePath">[],
): SecondBrainExportArtifact[] {
  const counts = new Map<string, number>();
  return artifacts.map((artifact) => {
    const base = safeName(artifact.title) || artifact.id;
    const seen = counts.get(base) ?? 0;
    counts.set(base, seen + 1);
    const suffix = seen > 0 ? `-${artifact.id.slice(-6)}` : "";
    return {
      ...artifact,
      notePath: `${base}${suffix}.md`,
    };
  });
}

function normalizeArticleArtifact(
  article: Article,
): Omit<SecondBrainExportArtifact, "notePath"> {
  const continuity = buildArtifactContinuityMetadata({
    title: article.title,
    summary: article.desc ?? "",
    tags: article.tags ?? [],
    sourceLabel: article.src ?? "Unknown",
    content: article.desc ?? "",
  });
  return {
    id: article.id,
    kind: "clip",
    title: article.title,
    summary: article.desc ?? "",
    content: article.desc ?? "",
    sourceLabel: article.src ?? "Unknown",
    dateLabel: fmtDate(article.date),
    domain: article.cat ?? "Uncategorized",
    tags: article.tags ?? [],
    link: article.link,
    route: null,
    visibility: "safe",
    continuity,
    archiveLinks: article.archiveLinks ?? [],
    workflowId: undefined,
    workflowLabel: undefined,
    topic: undefined,
  };
}

function normalizeCompiledArtifact(
  page: SecondBrainExportCompiledArtifact,
): Omit<SecondBrainExportArtifact, "notePath"> {
  return {
    id: `page:${page.id}`,
    kind: "compiled_page",
    title: page.title,
    summary: page.summary,
    content: page.contentWithheld
      ? "Restricted compiled artifact body withheld from the export bundle."
      : (page.content ?? page.contentPreview),
    sourceLabel: page.sourceLabel,
    dateLabel: fmtTimestamp(page.updatedAt),
    domain: page.domain,
    tags: page.tags,
    link: null,
    route: page.route ?? "/vault",
    visibility: page.visibility,
    continuity: page.continuity,
    archiveLinks: [],
    workflowId: page.workflowId,
    workflowLabel: page.workflowLabel,
    topic: page.topic,
  };
}

function filterArtifactsByMode(
  artifacts: SecondBrainExportArtifact[],
  mode: SecondBrainExportMode,
) {
  if (mode === "compiled") {
    return artifacts.filter((artifact) => artifact.kind === "compiled_page");
  }
  if (mode === "clips") {
    return artifacts.filter((artifact) => artifact.kind === "clip");
  }
  return artifacts;
}

// ── 00 Index ───────────────────────────────────────────────────────────────
function buildIndexFile(
  items: SecondBrainExportArtifact[],
  mode: SecondBrainExportMode,
): SecondBrainExportFile {
  const label = SECOND_BRAIN_EXPORT_MODE_LABELS[mode];
  const rows = items.map(
    (item) =>
      `| [[${item.notePath.replace(/\.md$/, "")}\\|${item.title.slice(0, 55)}]] | ${item.kind === "clip" ? "clip" : "compiled"} | ${item.sourceLabel} | ${item.dateLabel} |`,
  );
  const lines = [
    `# Second Brain — ${label}`,
    ``,
    `> Exported from Homefront · Mode: **${label}**`,
    `> Date: ${new Date().toISOString().slice(0, 10)}`,
    ``,
    `## Navigation`,
    ``,
    `- [[01 Second Brain Heartbeat|Heartbeat]]`,
    `- [[05 Export Manifest|Export Manifest]]`,
    `- [[Maps/|Maps folder]]`,
    ``,
    `## Contents (${items.length})`,
    ``,
    `| Note | Kind | Source | Date |`,
    `| ---- | ---- | ------ | ---- |`,
    ...rows,
  ];
  return { path: "00 Index.md", content: lines.join("\n") };
}

// ── 01 Heartbeat ───────────────────────────────────────────────────────────
function buildHeartbeatFile(
  allItems: SecondBrainExportArtifact[],
): SecondBrainExportFile {
  const domains = Array.from(new Set(allItems.map((item) => item.domain)));
  const sources = Array.from(new Set(allItems.map((item) => item.sourceLabel)));
  const clipCount = allItems.filter((item) => item.kind === "clip").length;
  const compiledCount = allItems.filter(
    (item) => item.kind === "compiled_page",
  ).length;
  const reverseEngineeringPrepCount = allItems.filter(
    (item) => item.continuity.artifactClass === "reverse_engineering_prep",
  ).length;
  const reverseEngineeringBriefCount = allItems.filter(
    (item) => item.continuity.artifactClass === "reverse_engineering_brief",
  ).length;
  const learningNoteCount = allItems.filter(
    (item) => item.continuity.artifactClass === "learning_note",
  ).length;
  const studyBriefCount = allItems.filter(
    (item) => item.continuity.artifactClass === "study_brief",
  ).length;
  const reviewSheetCount = allItems.filter(
    (item) => item.continuity.artifactClass === "review_sheet",
  ).length;
  const quizSetCount = allItems.filter(
    (item) => item.continuity.artifactClass === "quiz_set",
  ).length;
  const researchArtifactCount = allItems.filter(
    (item) => item.continuity.artifactClass === "research_artifact",
  ).length;
  const researchBriefCount = allItems.filter(
    (item) => item.continuity.artifactClass === "research_brief",
  ).length;
  const lines = [
    `# Second Brain Heartbeat`,
    ``,
    `> System snapshot for this export session.`,
    ``,
    `## Counts`,
    ``,
    `| Metric | Value |`,
    `| ------ | ----- |`,
    `| Total notes | ${allItems.length} |`,
    `| Clips | ${clipCount} |`,
    `| Compiled artifacts | ${compiledCount} |`,
    `| Reverse-engineering prep | ${reverseEngineeringPrepCount} |`,
    `| Reverse-engineering briefs | ${reverseEngineeringBriefCount} |`,
    `| Learning notes | ${learningNoteCount} |`,
    `| Study briefs | ${studyBriefCount} |`,
    `| Review sheets | ${reviewSheetCount} |`,
    `| Quiz sets | ${quizSetCount} |`,
    `| Research artifacts | ${researchArtifactCount} |`,
    `| Research briefs | ${researchBriefCount} |`,
    `| Domains | ${domains.length} |`,
    `| Sources | ${sources.length} |`,
    ``,
    `## Domains`,
    ``,
    ...domains.map((d) => `- [[Maps/Domain — ${safeName(d)}|${d}]]`),
    ``,
    `## Reopen in Nexus`,
    ``,
    `[Open export session](/vault?focus=vault-export-second-brain)`,
    ``,
  ];
  return { path: "01 Second Brain Heartbeat.md", content: lines.join("\n") };
}

function buildContinuityIndexFiles(
  items: SecondBrainExportArtifact[],
): SecondBrainExportFile[] {
  const reverseEngineeringPrep = items.filter(
    (item) => item.continuity.artifactClass === "reverse_engineering_prep",
  );
  const reverseEngineeringBriefs = items.filter(
    (item) => item.continuity.artifactClass === "reverse_engineering_brief",
  );
  const researchArtifacts = items.filter(
    (item) => item.continuity.artifactClass === "research_artifact",
  );
  const researchBriefs = items.filter(
    (item) => item.continuity.artifactClass === "research_brief",
  );
  const learningNotes = items.filter(
    (item) => item.continuity.artifactClass === "learning_note",
  );
  const studyBriefs = items.filter(
    (item) => item.continuity.artifactClass === "study_brief",
  );
  const reviewSheets = items.filter(
    (item) => item.continuity.artifactClass === "review_sheet",
  );
  const quizSets = items.filter(
    (item) => item.continuity.artifactClass === "quiz_set",
  );
  const files: SecondBrainExportFile[] = [];

  if (
    reverseEngineeringPrep.length > 0 ||
    reverseEngineeringBriefs.length > 0
  ) {
    files.push({
      path: "02 Reverse Engineering Continuity.md",
      content: [
        "# Reverse Engineering Continuity",
        "",
        `- Prep notes: ${reverseEngineeringPrep.length}`,
        `- Promoted briefs: ${reverseEngineeringBriefs.length}`,
        "",
        "## Prep notes",
        ...(reverseEngineeringPrep.length > 0
          ? reverseEngineeringPrep.map(
              (item) =>
                `- [[${item.notePath.replace(/\.md$/, "")}\\|${item.title}]]`,
            )
          : ["- None in this export slice."]),
        "",
        "## Promoted briefs",
        ...(reverseEngineeringBriefs.length > 0
          ? reverseEngineeringBriefs.map(
              (item) =>
                `- [[${item.notePath.replace(/\.md$/, "")}\\|${item.title}]]`,
            )
          : ["- None in this export slice."]),
      ].join("\n"),
    });
  }

  if (researchArtifacts.length > 0 || researchBriefs.length > 0) {
    files.push({
      path: "03 Research Continuity.md",
      content: [
        "# Research Continuity",
        "",
        `- Research artifacts: ${researchArtifacts.length}`,
        `- Research briefs: ${researchBriefs.length}`,
        "",
        "## Research artifacts",
        ...(researchArtifacts.length > 0
          ? researchArtifacts.map(
              (item) =>
                `- [[${item.notePath.replace(/\.md$/, "")}\\|${item.title}]]`,
            )
          : ["- None in this export slice."]),
        "",
        "## Research briefs",
        ...(researchBriefs.length > 0
          ? researchBriefs.map(
              (item) =>
                `- [[${item.notePath.replace(/\.md$/, "")}\\|${item.title}]]`,
            )
          : ["- None in this export slice."]),
      ].join("\n"),
    });
  }

  if (
    learningNotes.length > 0 ||
    studyBriefs.length > 0 ||
    reviewSheets.length > 0 ||
    quizSets.length > 0
  ) {
    files.push({
      path: "04 Study Continuity.md",
      content: [
        "# Study Continuity",
        "",
        `- Learning notes: ${learningNotes.length}`,
        `- Study briefs: ${studyBriefs.length}`,
        `- Review sheets: ${reviewSheets.length}`,
        `- Quiz sets: ${quizSets.length}`,
        "",
        "## Learning notes",
        ...(learningNotes.length > 0
          ? learningNotes.map(
              (item) =>
                `- [[${item.notePath.replace(/\.md$/, "")}\\|${item.title}]]`,
            )
          : ["- None in this export slice."]),
        "",
        "## Higher-order study artifacts",
        ...([...studyBriefs, ...reviewSheets, ...quizSets].length > 0
          ? [...studyBriefs, ...reviewSheets, ...quizSets].map(
              (item) =>
                `- [[${item.notePath.replace(/\.md$/, "")}\\|${item.title}]]`,
            )
          : ["- None in this export slice."]),
      ].join("\n"),
    });
  }

  return files;
}

// ── 04 Manifest ────────────────────────────────────────────────────────────
function buildManifestFile(
  allItems: SecondBrainExportArtifact[],
  mode: SecondBrainExportMode,
  exportDate: string,
): SecondBrainExportFile {
  const domains = Array.from(new Set(allItems.map((item) => item.domain)));
  const sources = Array.from(new Set(allItems.map((item) => item.sourceLabel)));
  const lines = [
    `# Export Manifest`,
    ``,
    `| Field | Value |`,
    `| ----- | ----- |`,
    `| Mode | ${SECOND_BRAIN_EXPORT_MODE_LABELS[mode]} |`,
    `| Date | ${exportDate} |`,
    `| Total notes | ${allItems.length} |`,
    `| Domains | ${domains.length} |`,
    `| Sources | ${sources.length} |`,
    ``,
    `## Domains covered`,
    ``,
    ...domains.map((d) => `- ${d}`),
    ``,
    `## Sources covered`,
    ``,
    ...sources.map((s) => `- ${s}`),
    ``,
    `## Export session`,
    ``,
    `[Reopen export session](/vault?focus=vault-export-second-brain)`,
    ``,
  ];
  return { path: "05 Export Manifest.md", content: lines.join("\n") };
}

// ── Maps — Domain ──────────────────────────────────────────────────────────
function buildDomainMocFile(
  domain: string,
  items: SecondBrainExportArtifact[],
): SecondBrainExportFile {
  const domainItems = items.filter((item) => item.domain === domain);
  const compiled = domainItems.filter((item) => item.kind === "compiled_page");
  const clips = domainItems.filter((item) => item.kind === "clip");
  const lines = [
    `# Domain — ${domain}`,
    ``,
    `> Map of content for the **${domain}** domain.`,
    ``,
    `## Compiled artifacts (${compiled.length})`,
    ``,
    ...compiled.map(
      (item) =>
        `- [[${item.notePath.replace(/\.md$/, "")}\\|${item.title.slice(0, 60)}]]`,
    ),
    ``,
    `## Saved clips (${clips.length})`,
    ``,
    ...clips.map(
      (item) =>
        `- [[${item.notePath.replace(/\.md$/, "")}\\|${item.title.slice(0, 60)}]]`,
    ),
  ];
  return {
    path: `Maps/Domain — ${safeName(domain)}.md`,
    content: lines.join("\n"),
  };
}

// ── Maps — Source ──────────────────────────────────────────────────────────
function buildRouteMocFile(
  source: string,
  items: SecondBrainExportArtifact[],
): SecondBrainExportFile {
  const srcItems = items.filter((item) => item.sourceLabel === source);
  const domains = Array.from(new Set(srcItems.map((item) => item.domain)));
  const lines = [
    `# Route — ${source}`,
    ``,
    `> Map of content from source **${source}**.`,
    ``,
    `## Domains (${domains.length})`,
    ``,
    ...domains.map((d) => `- [[Maps/Domain — ${safeName(d)}|${d}]]`),
    ``,
    `## Notes (${srcItems.length})`,
    ``,
    ...srcItems.map(
      (item) =>
        `- [[${item.notePath.replace(/\.md$/, "")}\\|${item.title.slice(0, 60)}]]`,
    ),
  ];
  return {
    path: `Maps/Route — ${safeName(source)}.md`,
    content: lines.join("\n"),
  };
}

function buildMapNoteFiles(
  items: SecondBrainExportArtifact[],
): SecondBrainExportFile[] {
  const domains = Array.from(new Set(items.map((item) => item.domain)));
  const sources = Array.from(new Set(items.map((item) => item.sourceLabel)));
  return [
    ...domains.map((d) => buildDomainMocFile(d, items)),
    ...sources.map((s) => buildRouteMocFile(s, items)),
  ];
}

// ── Individual note ────────────────────────────────────────────────────────
function buildArtifactFile(
  artifact: SecondBrainExportArtifact,
  items: SecondBrainExportArtifact[],
): SecondBrainExportFile {
  const relatedNotes = rankRelatedArtifacts(artifact, items);
  const continuity = artifact.continuity;
  const notePathById = new Map(items.map((item) => [item.id, item.notePath]));
  const confirmedArchiveLinks = artifact.archiveLinks
    .filter((link) => link.state === "confirmed")
    .map((link) => ({
      ...link,
      notePath: notePathById.get(link.targetId) ?? null,
    }))
    .filter((link) => Boolean(link.notePath));
  const derivedWikiLinks = relatedNotes
    .filter(
      (match) =>
        !confirmedArchiveLinks.some((link) => link.targetId === match.item.id),
    )
    .slice(0, 3);
  const lines = [
    `---`,
    `title: "${artifact.title.replace(/"/g, "'")}"`,
    `source: "${artifact.sourceLabel.replace(/"/g, "'")}"`,
    `date: ${artifact.dateLabel}`,
    `category: "${artifact.domain.replace(/"/g, "'")}"`,
    `kind: "${artifact.kind}"`,
    `visibility: "${artifact.visibility}"`,
    `tags: [${artifact.tags.join(", ")}]`,
    `route: "${(artifact.route ?? "").replace(/"/g, "'")}"`,
    `workflow_id: "${(artifact.workflowId ?? "").replace(/"/g, "'")}"`,
    `workflow_label: "${(artifact.workflowLabel ?? "").replace(/"/g, "'")}"`,
    `archive_link_ids: [${artifact.archiveLinks.map((link) => `"${link.targetId}"`).join(", ")}]`,
    `source_ref_ids: [${artifact.continuity.sourceRefs.map((ref) => `"${ref.id}"`).join(", ")}]`,
    continuity.continuityId
      ? `continuity_id: "${continuity.continuityId}"`
      : `continuity_id: ""`,
    continuity.continuityTag
      ? `continuity_tag: "${continuity.continuityTag}"`
      : `continuity_tag: ""`,
    continuity.promotionKind
      ? `promotion_kind: "${continuity.promotionKind}"`
      : `promotion_kind: ""`,
    `---`,
    ``,
    `# ${artifact.title}`,
    ``,
    artifact.summary ? truncateInline(artifact.summary, 320) : "",
    ``,
    `## Continuity`,
    ``,
    `- Artifact class: ${continuity.artifactClass}`,
    continuity.routeOrigin
      ? `- Route origin: ${continuity.routeOrigin}`
      : `- Route origin: unavailable`,
    continuity.workflowClass
      ? `- Workflow class: ${continuity.workflowClass}`
      : `- Workflow class: unavailable`,
    continuity.promotionKind
      ? `- Promotion path: ${continuity.promotionKind}`
      : `- Promotion path: none`,
    ``,
    `## Related maps`,
    ``,
    `- [[00 Index|Index]]`,
    `- [[01 Second Brain Heartbeat|Heartbeat]]`,
    `- [[Maps/Domain — ${safeName(artifact.domain)}|Domain map: ${artifact.domain}]]`,
    `- [[Maps/Route — ${safeName(artifact.sourceLabel)}|Route map: ${artifact.sourceLabel}]]`,
    ``,
    `## Archive links`,
    ``,
    ...(artifact.visibility === "restricted"
      ? [
          "- Restricted artifact export stays redacted, so confirmed archive links are withheld in this bundle.",
        ]
      : confirmedArchiveLinks.length > 0
        ? confirmedArchiveLinks.map(
            (link) =>
              `- [[${String(link.notePath).replace(/\.md$/, "")}]] — ${link.reason}`,
          )
        : derivedWikiLinks.length > 0
          ? derivedWikiLinks.map(
              (match) =>
                `- [[${match.item.notePath.replace(/\.md$/, "")}\\|${match.item.title.slice(0, 60)}]] — ${match.reasons.join(", ")}`,
            )
          : ["- No archive wikilinks were available in this export slice."]),
    ``,
    `## Related notes`,
    ``,
    ...(relatedNotes.length > 0
      ? relatedNotes.map(
          (match) =>
            `- [[${match.item.notePath.replace(/\.md$/, "")}\\|${match.item.title.slice(0, 60)}]] — ${match.reasons.join(", ")}`,
        )
      : ["- No directly related notes were found in this export slice."]),
    ``,
    `## Note body`,
    ``,
    artifact.content,
    ``,
    ...(artifact.continuity.sourceRefs.length > 0
      ? [
          "## Source refs",
          "",
          ...artifact.continuity.sourceRefs.map((ref) =>
            ref.href
              ? `- [${ref.title}](${ref.href}) · ${ref.sourceType}`
              : `- ${ref.title} · ${ref.sourceType}`,
          ),
          "",
        ]
      : []),
    ...(artifact.route ? [`[Reopen in Nexus](${artifact.route})`, ``] : []),
    ...(artifact.link ? [`[Read original](${artifact.link})`] : []),
  ].filter(Boolean);

  return {
    path: artifact.notePath,
    content: lines.join("\n"),
  };
}

// ── Main builder ───────────────────────────────────────────────────────────
export function buildSecondBrainExportBundle(
  input: SecondBrainExportInput,
): SecondBrainExportBundle {
  const { articles, compiledPages = [], mode = "full" } = input;
  const exportDate = new Date().toISOString().slice(0, 10);

  const artifacts = assignNotePaths([
    ...articles.map(normalizeArticleArtifact),
    ...compiledPages.map(normalizeCompiledArtifact),
  ]);
  const noteItems = filterArtifactsByMode(artifacts, mode);

  const files: SecondBrainExportFile[] = [
    buildIndexFile(mode === "heartbeat" ? [] : noteItems, mode),
    buildHeartbeatFile(artifacts),
    ...buildContinuityIndexFiles(artifacts),
    buildManifestFile(artifacts, mode, exportDate),
  ];

  const mocBase = mode === "heartbeat" ? artifacts : noteItems;
  files.push(...buildMapNoteFiles(mocBase));

  if (mode !== "heartbeat") {
    files.push(...noteItems.map((item) => buildArtifactFile(item, noteItems)));
  }

  return {
    mode,
    files,
    totalNotes: mode === "heartbeat" ? 0 : noteItems.length,
    exportDate,
  };
}
