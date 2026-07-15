import type { MemorySpineItem } from "@/lib/memorySpine";
import type {
  WorkflowPackId,
  EvidenceStrength,
  ResearchSourceType,
} from "@/lib/researchSources";
import { inferWorkflowPackIdFromText } from "@/lib/workflowPacks";

export type MemoryCompartment =
  | "project"
  | "conversation"
  | "general"
  | "research"
  | "study";

export interface MinedMemorySourceRef {
  id: string;
  title: string;
  sourceLabel: string;
  timestamp: number;
  sourceType?: ResearchSourceType;
  evidenceStrength?: EvidenceStrength;
}

export interface MinedMemory {
  id: string;
  title: string;
  summary: string;
  compartment: MemoryCompartment;
  sourceRefs: MinedMemorySourceRef[];
  facts: string[];
  decisions: string[];
  entities: string[];
  openLoops: string[];
  continuityId: string | null;
  freshness: number;
  confidence: number;
  inferred: boolean;
  workflowPackId: WorkflowPackId | null;
  workflowClass: string | null;
  sourceType: ResearchSourceType;
  evidenceStrength: EvidenceStrength;
}

const PROJECT_RE =
  /\b(?:repo|repository|codebase|typescript|next\.?js|react|component|hook|api route|refactor|debug|impact|system|playbook|spec)\b/i;
const CONVERSATION_RE =
  /\b(?:session|chronicle|conversation|briefing|handoff|lesson|mode|run|office)\b/i;
const RESEARCH_RE =
  /\b(?:research|sources|evidence|compare|literature|citation|citations|review brief|synthesis|review the sources)\b/i;
const STUDY_RE =
  /\b(?:study|teach|explain|quiz|practice|review sheet|study brief|checkpoint|learn)\b/i;

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function uniqueStrings(values: string[], limit = 6) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const normalized = normalizeText(value);
    if (!normalized || seen.has(normalized.toLowerCase())) continue;
    seen.add(normalized.toLowerCase());
    result.push(normalized);
    if (result.length >= limit) break;
  }
  return result;
}

function trimSentence(value: string, max = 160) {
  const normalized = normalizeText(value);
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1).trimEnd()}…`;
}

export function detectMemoryCompartment(
  item: MemorySpineItem,
): MemoryCompartment {
  const text = `${item.title} ${item.summary} ${item.sourceLabel} ${item.tags.join(" ")}`;
  const taggedCompartment = item.tags
    .find((tag) => tag.startsWith("compartment:"))
    ?.slice("compartment:".length)
    .trim()
    .toLowerCase();
  if (
    taggedCompartment === "project" ||
    taggedCompartment === "conversation" ||
    taggedCompartment === "general" ||
    taggedCompartment === "research" ||
    taggedCompartment === "study"
  ) {
    return taggedCompartment;
  }
  if (
    item.kind === "page" ||
    item.kind === "learning" ||
    item.domain === "engineering" ||
    PROJECT_RE.test(text)
  ) {
    return "project";
  }
  if (
    item.kind === "run" ||
    item.kind === "briefing" ||
    CONVERSATION_RE.test(text)
  ) {
    return "conversation";
  }
  if (RESEARCH_RE.test(text)) {
    return "research";
  }
  if (STUDY_RE.test(text)) {
    return "study";
  }
  return "general";
}

function scoreMemoryItem(
  item: MemorySpineItem,
  query: string,
  requestedCompartment?: MemoryCompartment | null,
) {
  const normalizedQuery = query.toLowerCase();
  const haystack =
    `${item.title} ${item.summary} ${item.sourceLabel} ${item.tags.join(" ")}`.toLowerCase();
  let score = 0;

  for (const token of normalizedQuery
    .split(/\s+/)
    .filter((token) => token.length > 1)) {
    if (haystack.includes(token)) score += 8;
    if (item.title.toLowerCase().includes(token)) score += 6;
    if (item.tags.some((tag) => tag.toLowerCase().includes(token))) score += 4;
  }

  const compartment = detectMemoryCompartment(item);
  if (requestedCompartment && compartment === requestedCompartment) score += 18;
  if (item.kind === "page") score += 10;
  if (item.kind === "learning") score += 6;
  if (item.visibility === "safe") score += 3;
  if (item.visibility === "restricted") score -= 20;

  const ageMs = Math.max(0, Date.now() - item.timestamp);
  if (ageMs < 1000 * 60 * 60 * 24) score += 14;
  else if (ageMs < 1000 * 60 * 60 * 24 * 7) score += 8;
  else if (ageMs < 1000 * 60 * 60 * 24 * 30) score += 4;

  return score;
}

function buildFacts(item: MemorySpineItem) {
  return uniqueStrings([
    trimSentence(item.summary),
    item.sourceLabel ? `Source lane: ${item.sourceLabel}` : "",
    item.domain ? `Domain: ${item.domain}` : "",
  ]);
}

function buildDecisions(item: MemorySpineItem) {
  return uniqueStrings(
    item.tags
      .filter((tag) =>
        /\b(?:decision|chosen|selected|preferred|use|spec|playbook|impact|route|workspace)\b/i.test(
          tag,
        ),
      )
      .map((tag) => `Tracked decision signal: ${tag}`),
    4,
  );
}

function buildEntities(item: MemorySpineItem) {
  return uniqueStrings(
    [
      item.domain,
      item.sourceLabel,
      ...item.tags,
      ...item.title.split(/[:/|-]/g),
    ]
      .map((value) => normalizeText(value))
      .filter((value) => value.length > 2),
    6,
  );
}

function buildOpenLoops(item: MemorySpineItem) {
  const values: string[] = [];
  if (item.kind === "run") {
    values.push(
      "Follow through on the previous run before starting a parallel thread.",
    );
  }
  if (item.kind === "page") {
    values.push(
      "Check whether the durable artifact already needs a higher-order brief instead of creating a duplicate.",
    );
  }
  if (item.kind === "briefing") {
    values.push("Review whether this briefing changed since the last session.");
  }
  return uniqueStrings(values, 3);
}

function buildContinuityId(item: MemorySpineItem) {
  if (item.kind === "page") {
    return item.id.replace(/^page:/, "");
  }
  const meaningfulTag = item.tags.find((tag) => tag.startsWith("continuity:"));
  if (meaningfulTag) return meaningfulTag;
  return slugify(`${item.kind}-${item.title}`);
}

function detectWorkflowPackId(item: MemorySpineItem): WorkflowPackId | null {
  const text = `${item.title} ${item.summary} ${item.sourceLabel} ${item.tags.join(" ")}`;
  const inferredPack = inferWorkflowPackIdFromText(text);
  if (inferredPack) return inferredPack;
  if (RESEARCH_RE.test(text)) return "research-workflow";
  if (STUDY_RE.test(text)) return "guided-learning";
  return null;
}

function detectWorkflowClass(item: MemorySpineItem) {
  const text =
    `${item.title} ${item.summary} ${item.sourceLabel} ${item.tags.join(" ")}`.toLowerCase();
  if (/\b(reverse engineering|binary|ghidra|sample|malware)\b/i.test(text)) {
    return "reverse-engineering";
  }
  if (
    /\b(literature|research|evidence|compare|citation|synthesis)\b/i.test(text)
  ) {
    return "research";
  }
  if (/\b(study|quiz|practice|teach|explain|lesson)\b/i.test(text)) {
    return "guided-learning";
  }
  if (
    /\b(project memory|repo memory|codebase|spec|playbook|impact)\b/i.test(text)
  ) {
    return "project-memory";
  }
  return null;
}

function detectSourceType(item: MemorySpineItem): ResearchSourceType {
  const text =
    `${item.title} ${item.summary} ${item.sourceLabel} ${item.tags.join(" ")}`.toLowerCase();
  if (/\b(project-memory|repo-bound|repo memory)\b/i.test(text))
    return "repo-memory";
  if (/\b(pdf|mime:application\/pdf)\b/i.test(text)) return "local-pdf";
  if (/\b(citation|bibliography|doi|arxiv)\b/i.test(text)) return "citation";
  if (item.kind === "page") return "vault-artifact";
  if (item.kind === "clip" || item.kind === "run" || item.kind === "briefing") {
    return "memory-spine";
  }
  if (/\b(note|markdown|md)\b/i.test(text)) return "local-note";
  return "unknown";
}

function detectEvidenceStrength(
  item: MemorySpineItem,
  sourceType: ResearchSourceType,
): EvidenceStrength {
  const text = `${item.title} ${item.summary} ${item.sourceLabel} ${item.tags.join(" ")}`;
  if (
    /\b(citation|citations|doi|arxiv|source-backed|bibliography)\b/i.test(text)
  ) {
    return "synthesis-ready";
  }
  if (
    sourceType === "vault-artifact" ||
    sourceType === "local-pdf" ||
    sourceType === "citation"
  ) {
    return "source-backed";
  }
  if (
    sourceType === "repo-memory" ||
    sourceType === "memory-spine" ||
    item.kind === "learning"
  ) {
    return "contextual";
  }
  return "unverified";
}

export function mineMemorySpine(
  items: MemorySpineItem[],
  options: {
    query: string;
    limit?: number;
    compartment?: MemoryCompartment | null;
  },
) {
  const ranked = items
    .map((item) => ({
      item,
      compartment: detectMemoryCompartment(item),
      score: scoreMemoryItem(item, options.query, options.compartment),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, options.limit ?? 5);

  return ranked.map<MinedMemory>((entry) => {
    const freshness = Math.max(
      0,
      Math.min(
        100,
        100 -
          Math.round(
            (Date.now() - entry.item.timestamp) / (1000 * 60 * 60 * 24),
          ),
      ),
    );
    const sourceType = detectSourceType(entry.item);
    const evidenceStrength = detectEvidenceStrength(entry.item, sourceType);
    const sourceRef = {
      id: entry.item.id,
      title: entry.item.title,
      sourceLabel: entry.item.sourceLabel,
      timestamp: entry.item.timestamp,
      sourceType,
      evidenceStrength,
    };
    const sourceBacked =
      entry.item.kind === "page" ||
      entry.item.kind === "clip" ||
      entry.item.kind === "learning" ||
      evidenceStrength === "source-backed" ||
      evidenceStrength === "synthesis-ready";
    return {
      id: `mined:${entry.item.id}`,
      title: entry.item.title,
      summary: trimSentence(entry.item.summary),
      compartment: entry.compartment,
      sourceRefs: [sourceRef],
      facts: buildFacts(entry.item),
      decisions: buildDecisions(entry.item),
      entities: buildEntities(entry.item),
      openLoops: buildOpenLoops(entry.item),
      continuityId: buildContinuityId(entry.item),
      freshness,
      confidence: Math.max(40, Math.min(96, entry.score)),
      inferred: !sourceBacked,
      workflowPackId: detectWorkflowPackId(entry.item),
      workflowClass: detectWorkflowClass(entry.item),
      sourceType,
      evidenceStrength,
    };
  });
}

export function buildMinedMemoryPromptBlock(mined: MinedMemory[]) {
  if (mined.length === 0) return "";
  const lines = [
    "",
    "[MINED LOCAL MEMORY]",
    "- Use this only when it improves the answer.",
    "- Treat sourced facts as reusable context, and label inferred summaries as inferred.",
  ];
  for (const memory of mined.slice(0, 4)) {
    const posture = memory.inferred ? "inferred" : "source-backed";
    lines.push(
      `- ${memory.title} (${memory.compartment}, ${posture}, ${memory.confidence}% confidence, ${memory.evidenceStrength} evidence): ${memory.summary}`,
    );
    if (memory.facts.length > 0) {
      lines.push(`  Facts: ${memory.facts.join(" | ")}`);
    }
    if (memory.decisions.length > 0) {
      lines.push(`  Decisions: ${memory.decisions.join(" | ")}`);
    }
    if (memory.openLoops.length > 0) {
      lines.push(`  Open loops: ${memory.openLoops.join(" | ")}`);
    }
  }
  lines.push("[END MINED LOCAL MEMORY]", "");
  return lines.join("\n");
}
