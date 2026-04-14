import "server-only";

import { mkdir, readFile, stat, writeFile } from "fs/promises";
import { join } from "path";
import { detectMemoryCompartment } from "@/lib/memoryMining";
import type { MemorySpineItem } from "@/lib/memorySpine";

const PROJECT_MEMORY_ROOT = join(process.cwd(), ".nexus", "project-memory");
const DAILY_DIR = join(PROJECT_MEMORY_ROOT, "daily");
const REGISTRY_PATH = join(PROJECT_MEMORY_ROOT, "registry.json");
const CURRENT_PATH = join(PROJECT_MEMORY_ROOT, "current.md");
const SOURCE_INVENTORY_PATH = join(PROJECT_MEMORY_ROOT, "source-inventory.md");
const SYNTHESIS_MAP_PATH = join(PROJECT_MEMORY_ROOT, "synthesis-map.md");

interface ProjectMemoryRegistry {
  generatedAt: string;
  files: Array<{
    key: string;
    path: string;
    compartment: "project" | "research" | "study";
    updatedAt: string;
  }>;
  counts: Record<string, number>;
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function uniqueStrings(values: Array<string | null | undefined>, limit = 8) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const normalized = normalizeWhitespace(value ?? "");
    if (!normalized || seen.has(normalized.toLowerCase())) continue;
    seen.add(normalized.toLowerCase());
    result.push(normalized);
    if (result.length >= limit) break;
  }
  return result;
}

function shortDate(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

async function ensureDirs() {
  await mkdir(DAILY_DIR, { recursive: true });
}

async function writeIfChanged(path: string, content: string) {
  try {
    const current = await readFile(path, "utf8");
    if (current === content) return;
  } catch {
    // missing file is fine
  }
  await writeFile(path, content, "utf8");
}

function countByCompartment(items: MemorySpineItem[]) {
  return items.reduce<Record<string, number>>((acc, item) => {
    const compartment = detectMemoryCompartment(item);
    acc[compartment] = (acc[compartment] ?? 0) + 1;
    return acc;
  }, {});
}

function recentTitles(items: MemorySpineItem[], count: number, predicate?: (item: MemorySpineItem) => boolean) {
  return items
    .filter((item) => (predicate ? predicate(item) : true))
    .slice(0, count)
    .map((item) => item.title);
}

function buildCurrentMarkdown(items: MemorySpineItem[], generatedAt: string) {
  const counts = countByCompartment(items);
  const activeProject = recentTitles(items, 4, (item) => detectMemoryCompartment(item) === "project");
  const activeResearch = recentTitles(items, 4, (item) => detectMemoryCompartment(item) === "research");
  const activeStudy = recentTitles(items, 4, (item) => detectMemoryCompartment(item) === "study");

  return [
    "# Current Nexus Memory State",
    "",
    `Updated: ${generatedAt}`,
    "",
    "## Compartment counts",
    `- Project: ${counts.project ?? 0}`,
    `- Conversation: ${counts.conversation ?? 0}`,
    `- General: ${counts.general ?? 0}`,
    `- Research: ${counts.research ?? 0}`,
    `- Study: ${counts.study ?? 0}`,
    "",
    "## Active project lanes",
    ...(activeProject.length > 0
      ? activeProject.map((title) => `- ${title}`)
      : ["- No strong project-memory lanes have been mined yet."]),
    "",
    "## Active research lanes",
    ...(activeResearch.length > 0
      ? activeResearch.map((title) => `- ${title}`)
      : ["- No strong research-memory lanes have been mined yet."]),
    "",
    "## Active study lanes",
    ...(activeStudy.length > 0
      ? activeStudy.map((title) => `- ${title}`)
      : ["- No strong study-memory lanes have been mined yet."]),
    "",
  ].join("\n");
}

function buildDailyMarkdown(items: MemorySpineItem[], generatedAt: string) {
  const recent = items.slice(0, 8);
  return [
    `# Daily project memory · ${generatedAt.slice(0, 10)}`,
    "",
    `Updated: ${generatedAt}`,
    "",
    "## Recent durable changes",
    ...(recent.length > 0
      ? recent.map((item) => `- ${item.title} (${detectMemoryCompartment(item)})`)
      : ["- No recent durable changes were captured yet."]),
    "",
  ].join("\n");
}

function buildSourceInventoryMarkdown(items: MemorySpineItem[], generatedAt: string) {
  const sourceLabels = uniqueStrings(
    items
      .filter((item) => detectMemoryCompartment(item) === "research")
      .map((item) => item.sourceLabel),
    12,
  );
  const sourceTags = uniqueStrings(
    items
      .filter((item) => detectMemoryCompartment(item) === "research")
      .flatMap((item) => item.tags)
      .filter((tag) => /\b(source|citation|research|review|evidence|pdf|article)\b/i.test(tag)),
    12,
  );

  return [
    "# Source inventory",
    "",
    `Updated: ${generatedAt}`,
    "",
    "## Source lanes",
    ...(sourceLabels.length > 0
      ? sourceLabels.map((label) => `- ${label}`)
      : ["- No research source lanes are indexed yet."]),
    "",
    "## Source hints",
    ...(sourceTags.length > 0
      ? sourceTags.map((tag) => `- ${tag}`)
      : ["- No citation or source tags are indexed yet."]),
    "",
  ].join("\n");
}

function buildSynthesisMapMarkdown(items: MemorySpineItem[], generatedAt: string) {
  const studyItems = items.filter((item) => detectMemoryCompartment(item) === "study");
  const researchItems = items.filter((item) => detectMemoryCompartment(item) === "research");
  const continuityHints = uniqueStrings(
    [...studyItems, ...researchItems]
      .flatMap((item) => item.tags)
      .filter((tag) => tag.startsWith("continuity:") || tag.startsWith("workflow:") || tag.startsWith("workflow-class:")),
    12,
  );

  return [
    "# Synthesis map",
    "",
    `Updated: ${generatedAt}`,
    "",
    "## Study loops",
    ...(studyItems.length > 0
      ? studyItems.slice(0, 6).map((item) => `- ${item.title}`)
      : ["- No study loops are indexed yet."]),
    "",
    "## Research loops",
    ...(researchItems.length > 0
      ? researchItems.slice(0, 6).map((item) => `- ${item.title}`)
      : ["- No research loops are indexed yet."]),
    "",
    "## Continuity hints",
    ...(continuityHints.length > 0
      ? continuityHints.map((hint) => `- ${hint}`)
      : ["- No synthesis continuity hints are recorded yet."]),
    "",
  ].join("\n");
}

function summarizeLines(content: string, fallback: string) {
  const lines = content
    .split("\n")
    .map((line) => line.replace(/^#+\s*/, "").trim())
    .filter(Boolean);
  return normalizeWhitespace(lines.slice(0, 3).join(" · ")) || fallback;
}

async function readFileIfExists(path: string) {
  try {
    return await readFile(path, "utf8");
  } catch {
    return "";
  }
}

async function toProjectMemoryItem(input: {
  id: string;
  title: string;
  path: string;
  sourceLabel: string;
  tags: string[];
  compartment: "project" | "research" | "study";
}) : Promise<MemorySpineItem | null> {
  try {
    const [content, metadata] = await Promise.all([
      readFileIfExists(input.path),
      stat(input.path),
    ]);
    return {
      id: input.id,
      layer: "knowledge",
      kind: "page",
      title: input.title,
      summary: summarizeLines(content, `${input.title} is ready for local-first recall.`),
      sourceLabel: input.sourceLabel,
      domain:
        input.compartment === "project"
          ? "engineering"
          : input.compartment === "research"
            ? "intel"
            : "strategy",
      tags: [...input.tags, `compartment:${input.compartment}`, "project-memory", "repo-bound"],
      timestamp: metadata.mtimeMs,
      visibility: "internal",
    };
  } catch {
    return null;
  }
}

export async function syncProjectMemoryFromSpine(input: {
  items: MemorySpineItem[];
  syncedAt?: string | null;
}) {
  await ensureDirs();
  const generatedAt = input.syncedAt ?? new Date().toISOString();
  const dailyPath = join(DAILY_DIR, `${shortDate(new Date(generatedAt))}.md`);
  const registry: ProjectMemoryRegistry = {
    generatedAt,
    files: [
      {
        key: "current",
        path: ".nexus/project-memory/current.md",
        compartment: "project",
        updatedAt: generatedAt,
      },
      {
        key: "daily",
        path: `.nexus/project-memory/daily/${shortDate(new Date(generatedAt))}.md`,
        compartment: "project",
        updatedAt: generatedAt,
      },
      {
        key: "source-inventory",
        path: ".nexus/project-memory/source-inventory.md",
        compartment: "research",
        updatedAt: generatedAt,
      },
      {
        key: "synthesis-map",
        path: ".nexus/project-memory/synthesis-map.md",
        compartment: "study",
        updatedAt: generatedAt,
      },
    ],
    counts: countByCompartment(input.items),
  };

  await Promise.all([
    writeIfChanged(CURRENT_PATH, buildCurrentMarkdown(input.items, generatedAt)),
    writeIfChanged(dailyPath, buildDailyMarkdown(input.items, generatedAt)),
    writeIfChanged(
      SOURCE_INVENTORY_PATH,
      buildSourceInventoryMarkdown(input.items, generatedAt),
    ),
    writeIfChanged(
      SYNTHESIS_MAP_PATH,
      buildSynthesisMapMarkdown(input.items, generatedAt),
    ),
    writeIfChanged(REGISTRY_PATH, JSON.stringify(registry, null, 2)),
  ]);
}

export async function readProjectMemoryItems() {
  await ensureDirs();
  const todayPath = join(DAILY_DIR, `${shortDate()}.md`);
  const items = await Promise.all([
    toProjectMemoryItem({
      id: "project-memory:current",
      title: "Repo-bound project memory",
      path: CURRENT_PATH,
      sourceLabel: "Repo-bound project memory",
      tags: ["workflow:project-memory", "workflow-class:project-memory"],
      compartment: "project",
    }),
    toProjectMemoryItem({
      id: "project-memory:daily",
      title: "Daily memory ledger",
      path: todayPath,
      sourceLabel: "Project-memory daily note",
      tags: ["workflow:daily-memory", "workflow-class:project-memory"],
      compartment: "project",
    }),
    toProjectMemoryItem({
      id: "project-memory:sources",
      title: "Research source inventory",
      path: SOURCE_INVENTORY_PATH,
      sourceLabel: "Project-memory source inventory",
      tags: ["workflow:source-review", "workflow-class:research", "source-backed"],
      compartment: "research",
    }),
    toProjectMemoryItem({
      id: "project-memory:synthesis",
      title: "Study and synthesis map",
      path: SYNTHESIS_MAP_PATH,
      sourceLabel: "Project-memory synthesis map",
      tags: ["workflow:synthesis", "workflow-class:guided-learning", "study-ready"],
      compartment: "study",
    }),
  ]);

  return items.filter((item): item is MemorySpineItem => Boolean(item));
}
