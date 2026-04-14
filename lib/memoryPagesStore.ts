import "server-only";

import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import {
  detectMemoryVisibility,
  guessMemoryDomain,
  materializeMemorySpineItem,
  resolveMemoryVisibility,
  type MemoryDomain,
  type MemoryLayer,
  type MemorySpineItem,
  type MemoryVisibility,
} from "@/lib/memorySpine";
import {
  buildArtifactContinuityMetadata,
  type ArtifactContinuityMetadata,
} from "@/lib/artifactContinuity";
import type { LearningMissionMode, TutorProfileId } from "@/lib/learningMissions";
import type { MemoryCompartment } from "@/lib/memoryMining";
import type {
  EvidenceStrength,
  ResearchSourceRef,
  ResearchSourceType,
  WorkflowPackId,
} from "@/lib/researchSources";

export type CompiledMemoryPageSource = "workflow" | "manual" | "scheduler";

export interface CompiledMemoryResearchSignals {
  sourceCount: number;
  citationCount: number;
  structure: "light" | "structured" | "document_heavy";
  referencedDomains: string[];
  sectionHeadings: string[];
  documentHints: string[];
  signalsWithheld?: boolean;
}

export interface CompiledMemoryDocumentMetadata {
  originLabel?: string;
  mimeType?: string;
  pageCount?: number;
  metadataWithheld?: boolean;
}

export interface CompiledMemoryPage {
  id: string;
  title: string;
  summary: string;
  content: string;
  contentPreview: string;
  source: CompiledMemoryPageSource;
  sourceLabel: string;
  workflowId?: string;
  workflowLabel?: string;
  agentId?: string;
  route?: string;
  topic?: string;
  layer: MemoryLayer;
  domain: MemoryDomain;
  visibility: MemoryVisibility;
  tags: string[];
  continuity: ArtifactContinuityMetadata;
  researchSignals: CompiledMemoryResearchSignals;
  documentMetadata?: CompiledMemoryDocumentMetadata;
  createdAt: number;
  updatedAt: number;
}

const MEMORY_PAGES_PATH = join(process.cwd(), "tasks", "memory-pages.json");

function trimText(value: string, max: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length <= max
    ? normalized
    : `${normalized.slice(0, max - 1).trimEnd()}…`;
}

function deriveSummary(content: string, fallbackTitle: string) {
  const firstParagraph = content
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .find((part) => part.length > 0);
  return trimText(firstParagraph ?? fallbackTitle, 220);
}

function derivePreview(content: string) {
  return trimText(content, 280);
}

function uniqueTags(tags: string[]) {
  return Array.from(new Set(tags.filter(Boolean).map((tag) => tag.trim()).filter(Boolean)));
}

function sanitizeDocumentOriginLabel(value?: string) {
  if (!value) return undefined;
  const normalized = value.replace(/\\/g, "/").trim();
  const basename = normalized.split("/").filter(Boolean).pop() ?? normalized;
  return trimText(basename, 80) || undefined;
}

function sanitizeDocumentMimeType(value?: string) {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  return /^[a-z0-9.+-]+\/[a-z0-9.+-]+$/.test(normalized)
    ? normalized.slice(0, 80)
    : undefined;
}

function sanitizeDocumentPageCount(value?: number) {
  if (!Number.isFinite(value)) return undefined;
  const pageCount = Math.floor(Number(value));
  return pageCount > 0 && pageCount <= 5000 ? pageCount : undefined;
}

const DOCUMENT_HINTS: Array<{ label: string; pattern: RegExp }> = [
  { label: "pdf", pattern: /\bpdf\b/i },
  { label: "scan", pattern: /\bscan(?:ned)?\b|\bocr\b/i },
  { label: "paper", pattern: /\bpaper\b|\barxiv\b|\bpreprint\b|\bdoi\b/i },
  { label: "report", pattern: /\breport\b|\bwhitepaper\b|\bbrief\b/i },
  { label: "filing", pattern: /\b10-k\b|\b10-q\b|\b8-k\b|\bfiling\b|\bsec\b/i },
  { label: "table", pattern: /\btable\b|\bcsv\b|\bspreadsheet\b|\bledger\b/i },
  { label: "image", pattern: /\bimage\b|\bscreenshot\b|\bphoto\b|\bdiagram\b/i },
  { label: "manual", pattern: /\bmanual\b|\bdatasheet\b|\bspec\b|\binvoice\b|\breceipt\b/i },
];

function extractUniqueUrls(content: string) {
  return Array.from(
    new Set((content.match(/https?:\/\/[^\s)\]}>"']+/g) ?? []).map((url) => url.trim())),
  );
}

function normalizeDomain(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

function extractSectionHeadings(content: string) {
  return Array.from(
    new Set(
      content
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(
          (line) =>
            /^\d+\.\s+[A-Z0-9]/.test(line) ||
            /^[A-Z][A-Za-z0-9 /&+_-]{2,48}:$/.test(line),
        )
        .map((line) => trimText(line.replace(/:$/, ""), 48)),
    ),
  ).slice(0, 4);
}

function deriveDocumentHints(content: string) {
  return DOCUMENT_HINTS.filter((hint) => hint.pattern.test(content))
    .map((hint) => hint.label)
    .slice(0, 4);
}

function deriveResearchSignals(
  content: string,
  documentMetadata?: CompiledMemoryDocumentMetadata,
): CompiledMemoryResearchSignals {
  const urls = extractUniqueUrls(content);
  const referencedDomains = Array.from(
    new Set(urls.map(normalizeDomain).filter(Boolean)),
  ).slice(0, 4);
  const sectionHeadings = extractSectionHeadings(content);
  const metadataText = [
    documentMetadata?.originLabel ?? "",
    documentMetadata?.mimeType ?? "",
    documentMetadata?.pageCount ? `${documentMetadata.pageCount} pages` : "",
  ].join(" ");
  const documentHints = deriveDocumentHints(`${content} ${metadataText}`);
  const citationMarkers =
    urls.length +
    (content.match(/\[\d+\]/g)?.length ?? 0) +
    (content.match(/\bsource(?:s)?\s*:/gi)?.length ?? 0) +
    (content.match(/\bcitation(?:s)?\s*:/gi)?.length ?? 0);
  const structure: CompiledMemoryResearchSignals["structure"] =
    documentHints.length >= 2 || documentHints.includes("scan") || documentHints.includes("pdf")
      ? "document_heavy"
      : sectionHeadings.length >= 3 || urls.length >= 2
        ? "structured"
        : "light";

  return {
    sourceCount: urls.length,
    citationCount: citationMarkers,
    structure,
    referencedDomains,
    sectionHeadings,
    documentHints,
  };
}

function defaultLayerForWorkflow(workflowId?: string): MemoryLayer {
  if (workflowId === "deepresearch" || workflowId === "lit-review" || workflowId === "compare") {
    return "knowledge";
  }
  return "output";
}

function defaultSourceLabel(input: {
  source: CompiledMemoryPageSource;
  workflowLabel?: string;
  route?: string;
}) {
  if (input.source === "workflow" && input.workflowLabel) {
    return `Workflow page · ${input.workflowLabel}`;
  }
  if (input.source === "scheduler") {
    return `Scheduler page · ${input.route ?? "internal"}`;
  }
  return "Compiled memory page";
}

export interface CompiledMemoryPageEnvelope
  extends Omit<CompiledMemoryPage, "content"> {
  content?: string;
  contentWithheld: boolean;
}

function toMemorySpineItem(page: CompiledMemoryPage): MemorySpineItem {
  return materializeMemorySpineItem({
    id: `page:${page.id}`,
    layer: page.layer,
    kind: "page",
    title: page.title,
    summary: page.summary,
    sourceLabel: page.sourceLabel,
    domain: page.domain,
    tags: page.tags,
    timestamp: page.updatedAt,
  });
}

function normalizeCompiledMemoryPage(
  page: CompiledMemoryPage,
): CompiledMemoryPage {
  const documentMetadata = page.documentMetadata
    ? {
        originLabel: sanitizeDocumentOriginLabel(page.documentMetadata.originLabel),
        mimeType: sanitizeDocumentMimeType(page.documentMetadata.mimeType),
        pageCount: sanitizeDocumentPageCount(page.documentMetadata.pageCount),
      }
    : undefined;
  const continuity = buildArtifactContinuityMetadata({
    title: page.title,
    summary: page.summary,
    tags: page.tags,
    route: page.route,
    topic: page.topic,
    sourceLabel: page.sourceLabel,
    workflowId: page.workflowId,
    workflowLabel: page.workflowLabel,
    content: page.content,
    workflowPackId: page.continuity?.workflowPackId,
    memoryCompartment: page.continuity?.memoryCompartment,
    learningMissionMode: page.continuity?.learningMissionMode,
    tutorProfile: page.continuity?.tutorProfile,
    repoMemoryBinding: page.continuity?.repoMemoryBinding,
    sourceRefs: page.continuity?.sourceRefs,
    sourceType: page.continuity?.sourceType,
    evidenceStrength: page.continuity?.evidenceStrength,
  });
  const tags = continuity.continuityTag
    ? uniqueTags([...page.tags, continuity.continuityTag])
    : uniqueTags(page.tags);
  return {
    ...page,
    tags,
    continuity,
    contentPreview:
      typeof page.contentPreview === "string" && page.contentPreview.trim().length > 0
        ? page.contentPreview
        : page.visibility === "restricted"
        ? "Sensitive content withheld from shared memory surfaces."
        : derivePreview(page.content ?? ""),
    researchSignals:
      page.researchSignals ?? deriveResearchSignals(page.content ?? "", documentMetadata),
    documentMetadata:
      documentMetadata &&
      (documentMetadata.originLabel ||
        documentMetadata.mimeType ||
        documentMetadata.pageCount)
        ? documentMetadata
        : undefined,
  };
}

async function readPages(): Promise<CompiledMemoryPage[]> {
  try {
    const raw = await readFile(MEMORY_PAGES_PATH, "utf8");
    const parsed = JSON.parse(raw) as CompiledMemoryPage[];
    return Array.isArray(parsed)
      ? parsed
          .map(normalizeCompiledMemoryPage)
          .sort((a, b) => b.updatedAt - a.updatedAt)
      : [];
  } catch {
    return [];
  }
}

async function writePages(pages: CompiledMemoryPage[]) {
  await writeFile(MEMORY_PAGES_PATH, JSON.stringify(pages, null, 2), "utf8");
}

function toCompiledMemoryPageEnvelope(
  page: CompiledMemoryPage,
): CompiledMemoryPageEnvelope {
  if (page.visibility === "restricted") {
    const { content, ...rest } = page;
    return {
      ...rest,
      researchSignals: {
        ...page.researchSignals,
        referencedDomains: [],
        sectionHeadings: [],
        documentHints: [],
        signalsWithheld: true,
      },
      documentMetadata: page.documentMetadata
        ? {
            metadataWithheld: true,
          }
        : undefined,
      contentWithheld: true,
    };
  }

  return {
    ...page,
    contentWithheld: false,
  };
}

export async function listCompiledMemoryPages(options?: {
  limit?: number;
  workflowId?: string;
}) {
  const pages = await readPages();
  const filtered = options?.workflowId
    ? pages.filter((page) => page.workflowId === options.workflowId)
    : pages;
  return filtered.slice(0, options?.limit ?? 20);
}

export async function getCompiledMemoryPageById(id: string) {
  const pages = await readPages();
  return pages.find((page) => page.id === id) ?? null;
}

export async function createCompiledMemoryPage(input: {
  title: string;
  summary?: string;
  content: string;
  source: CompiledMemoryPageSource;
  sourceLabel?: string;
  workflowId?: string;
  workflowLabel?: string;
  agentId?: string;
  route?: string;
  topic?: string;
  tags?: string[];
  layer?: MemoryLayer;
  domain?: MemoryDomain;
  requestedVisibility?: MemoryVisibility;
  memoryCompartment?: MemoryCompartment;
  learningMissionMode?: LearningMissionMode;
  tutorProfile?: TutorProfileId;
  workflowPackId?: WorkflowPackId;
  repoMemoryBinding?: string;
  sourceRefs?: ResearchSourceRef[];
  sourceType?: ResearchSourceType;
  evidenceStrength?: EvidenceStrength;
  documentOriginLabel?: string;
  documentMimeType?: string;
  documentPageCount?: number;
}) {
  const now = Date.now();
  const baseTitle = trimText(input.title, 120) || "Compiled memory page";
  const baseSummary = trimText(
    input.summary?.trim() || deriveSummary(input.content, baseTitle),
    220,
  );
  const documentMetadata: CompiledMemoryDocumentMetadata | undefined = (() => {
    const originLabel = sanitizeDocumentOriginLabel(input.documentOriginLabel);
    const mimeType = sanitizeDocumentMimeType(input.documentMimeType);
    const pageCount = sanitizeDocumentPageCount(input.documentPageCount);
    return originLabel || mimeType || pageCount
      ? { originLabel, mimeType, pageCount }
      : undefined;
  })();
  const researchSignals = deriveResearchSignals(input.content, documentMetadata);
  const detectedVisibility = detectMemoryVisibility({
    layer: input.layer ?? defaultLayerForWorkflow(input.workflowId),
    kind: "page",
    title: baseTitle,
    summary: baseSummary,
    sourceLabel:
      input.sourceLabel ??
      defaultSourceLabel({
        source: input.source,
        workflowLabel: input.workflowLabel,
        route: input.route,
      }),
    tags: uniqueTags([
      ...(input.tags ?? []),
      input.workflowId ?? "",
      input.source,
      input.agentId ?? "",
      input.route?.replace(/^\//, "") ?? "",
    ]),
    extraText: [
      input.content,
      input.topic ?? "",
      documentMetadata?.originLabel ?? "",
      documentMetadata?.mimeType ?? "",
      documentMetadata?.pageCount ? `${documentMetadata.pageCount}` : "",
    ].join(" "),
  });
  const visibility = resolveMemoryVisibility(
    detectedVisibility,
    input.requestedVisibility,
  );
  const pageItem = materializeMemorySpineItem({
    id: `page:draft:${now}`,
    layer: input.layer ?? defaultLayerForWorkflow(input.workflowId),
    kind: "page",
    title: baseTitle,
    summary: baseSummary,
    sourceLabel:
      input.sourceLabel ??
      defaultSourceLabel({
        source: input.source,
        workflowLabel: input.workflowLabel,
        route: input.route,
      }),
    domain:
      input.domain ??
      guessMemoryDomain(
        [baseTitle, baseSummary, input.content, input.topic ?? ""].join(" "),
      ),
    tags: uniqueTags([
      ...(input.tags ?? []),
      input.workflowId ?? "",
      input.source,
      input.agentId ?? "",
      input.route?.replace(/^\//, "") ?? "",
    ]),
    timestamp: now,
  }, {
    visibility,
    extraText: [
      input.content,
      input.topic ?? "",
      documentMetadata?.originLabel ?? "",
      documentMetadata?.mimeType ?? "",
      documentMetadata?.pageCount ? `${documentMetadata.pageCount}` : "",
    ].join(" "),
  });

  const page: CompiledMemoryPage = {
    id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
    title: pageItem.title,
    summary: pageItem.summary,
    content: input.content.trim(),
    contentPreview:
      pageItem.visibility === "restricted"
        ? "Sensitive content withheld from shared memory surfaces."
        : derivePreview(input.content),
    source: input.source,
    sourceLabel: pageItem.sourceLabel,
    workflowId: input.workflowId,
    workflowLabel: input.workflowLabel,
    agentId: input.agentId,
    route: input.route,
    topic: input.topic,
    layer: pageItem.layer,
    domain: pageItem.domain,
    visibility: pageItem.visibility,
    tags: pageItem.tags,
    continuity: buildArtifactContinuityMetadata({
      title: pageItem.title,
      summary: pageItem.summary,
      tags: pageItem.tags,
      route: input.route,
      topic: input.topic,
      sourceLabel: pageItem.sourceLabel,
      workflowId: input.workflowId,
      workflowLabel: input.workflowLabel,
      content: input.content,
      workflowPackId: input.workflowPackId,
      memoryCompartment: input.memoryCompartment,
      learningMissionMode: input.learningMissionMode,
      tutorProfile: input.tutorProfile,
      repoMemoryBinding: input.repoMemoryBinding,
      sourceRefs: input.sourceRefs,
      sourceType: input.sourceType,
      evidenceStrength: input.evidenceStrength,
    }),
    researchSignals,
    documentMetadata,
    createdAt: now,
    updatedAt: now,
  };
  page.tags = page.continuity.continuityTag
    ? uniqueTags([...page.tags, page.continuity.continuityTag])
    : uniqueTags(page.tags);

  const pages = await readPages();
  const next = [page, ...pages].slice(0, 160);
  await writePages(next);
  return page;
}

export async function listCompiledMemoryPageItems(limit = 40) {
  const pages = await listCompiledMemoryPages({ limit });
  return pages.map(toMemorySpineItem);
}

export function toCompiledMemoryPageSummary(page: CompiledMemoryPage) {
  return toCompiledMemoryPageEnvelope(page);
}
