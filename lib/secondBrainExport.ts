// ── lib/secondBrainExport ──────────────────────────────────────────────────
// Build a multi-file Obsidian-ready markdown bundle from saved articles.
// Supports four export modes: full, compiled, clips, heartbeat.

import type { Article } from "@/store/useStore";

// ── Types ──────────────────────────────────────────────────────────────────
export type SecondBrainExportMode = "full" | "compiled" | "clips" | "heartbeat";

export const SECOND_BRAIN_EXPORT_MODE_LABELS: Record<SecondBrainExportMode, string> = {
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

export interface SecondBrainExportInput {
  articles: Article[];
  mode?: SecondBrainExportMode;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function safeName(s: string): string {
  return s.replace(/[/\\:*?"<>|]/g, "-").slice(0, 80).trim();
}

function fmtDate(d: string): string {
  return (d ?? "").slice(0, 10);
}

function domainOf(a: Article): string {
  return a.cat ?? "Uncategorized";
}

function sourceOf(a: Article): string {
  return a.src ?? "Unknown";
}

// ── 00 Index ───────────────────────────────────────────────────────────────
function buildIndexFile(items: Article[], mode: SecondBrainExportMode): SecondBrainExportFile {
  const label = SECOND_BRAIN_EXPORT_MODE_LABELS[mode];
  const rows = items.map(
    (a) => `| [[${safeName(a.title)}\\|${a.title.slice(0, 55)}]] | ${sourceOf(a)} | ${fmtDate(a.date)} |`,
  );
  const lines = [
    `# Second Brain — ${label}`,
    ``,
    `> Exported from Nexus Prime · Mode: **${label}**`,
    `> Date: ${new Date().toISOString().slice(0, 10)}`,
    ``,
    `## Navigation`,
    ``,
    `- [[01 Second Brain Heartbeat|Heartbeat]]`,
    `- [[04 Export Manifest|Export Manifest]]`,
    `- [[Maps/|Maps folder]]`,
    ``,
    `## Contents (${items.length})`,
    ``,
    `| Note | Source | Date |`,
    `| ---- | ------ | ---- |`,
    ...rows,
  ];
  return { path: "00 Index.md", content: lines.join("\n") };
}

// ── 01 Heartbeat ───────────────────────────────────────────────────────────
function buildHeartbeatFile(allItems: Article[]): SecondBrainExportFile {
  const domains = Array.from(new Set(allItems.map(domainOf)));
  const sources = Array.from(new Set(allItems.map(sourceOf)));
  const lines = [
    `# Second Brain Heartbeat`,
    ``,
    `> System snapshot for this export session.`,
    ``,
    `## Counts`,
    ``,
    `| Metric | Value |`,
    `| ------ | ----- |`,
    `| Total saved | ${allItems.length} |`,
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

// ── 04 Manifest ────────────────────────────────────────────────────────────
function buildManifestFile(
  allItems: Article[],
  mode: SecondBrainExportMode,
  exportDate: string,
): SecondBrainExportFile {
  const domains = Array.from(new Set(allItems.map(domainOf)));
  const sources = Array.from(new Set(allItems.map(sourceOf)));
  const lines = [
    `# Export Manifest`,
    ``,
    `| Field | Value |`,
    `| ----- | ----- |`,
    `| Mode | ${SECOND_BRAIN_EXPORT_MODE_LABELS[mode]} |`,
    `| Date | ${exportDate} |`,
    `| Total saved | ${allItems.length} |`,
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
  return { path: "04 Export Manifest.md", content: lines.join("\n") };
}

// ── Maps — Domain ──────────────────────────────────────────────────────────
function buildDomainMocFile(domain: string, items: Article[]): SecondBrainExportFile {
  const domainItems = items.filter((a) => domainOf(a) === domain);
  const compiled = domainItems.filter((a) => (a.tags ?? []).includes("compiled"));
  const clips = domainItems.filter((a) => !(a.tags ?? []).includes("compiled"));
  const lines = [
    `# Domain — ${domain}`,
    ``,
    `> Map of content for the **${domain}** domain.`,
    ``,
    `## Compiled pages (${compiled.length})`,
    ``,
    ...compiled.map((a) => `- [[${safeName(a.title)}|${a.title.slice(0, 60)}]]`),
    ``,
    `## Saved clips (${clips.length})`,
    ``,
    ...clips.map((a) => `- [[${safeName(a.title)}|${a.title.slice(0, 60)}]]`),
  ];
  return { path: `Maps/Domain — ${safeName(domain)}.md`, content: lines.join("\n") };
}

// ── Maps — Route ───────────────────────────────────────────────────────────
function buildRouteMocFile(source: string, items: Article[]): SecondBrainExportFile {
  const srcItems = items.filter((a) => sourceOf(a) === source);
  const domains = Array.from(new Set(srcItems.map(domainOf)));
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
    ...srcItems.map((a) => `- [[${safeName(a.title)}|${a.title.slice(0, 60)}]]`),
  ];
  return { path: `Maps/Route — ${safeName(source)}.md`, content: lines.join("\n") };
}

function buildMapNoteFiles(items: Article[]): SecondBrainExportFile[] {
  const domains = Array.from(new Set(items.map(domainOf)));
  const sources = Array.from(new Set(items.map(sourceOf)));
  return [
    ...domains.map((d) => buildDomainMocFile(d, items)),
    ...sources.map((s) => buildRouteMocFile(s, items)),
  ];
}

// ── Individual article note ────────────────────────────────────────────────
function buildArticleFile(a: Article): SecondBrainExportFile {
  const lines = [
    `---`,
    `title: "${a.title.replace(/"/g, "'")}"`,
    `source: "${sourceOf(a)}"`,
    `date: ${fmtDate(a.date)}`,
    `category: "${domainOf(a)}"`,
    `tags: [${(a.tags ?? []).join(", ")}]`,
    `link: "${a.link}"`,
    `---`,
    ``,
    `# ${a.title}`,
    ``,
    a.desc ? a.desc : "",
    ``,
    `[Read original](${a.link})`,
  ];
  return {
    path: `${safeName(a.title)}.md`,
    content: lines.join("\n"),
  };
}

// ── Main builder ───────────────────────────────────────────────────────────
export function buildSecondBrainExportBundle(
  input: SecondBrainExportInput,
): SecondBrainExportBundle {
  const { articles, mode = "full" } = input;
  const exportDate = new Date().toISOString().slice(0, 10);

  // Filter note items by mode
  let noteItems: Article[];
  if (mode === "compiled") {
    noteItems = articles.filter((a) => (a.tags ?? []).includes("compiled"));
  } else if (mode === "clips") {
    noteItems = articles.filter((a) => !(a.tags ?? []).includes("compiled"));
  } else {
    noteItems = articles; // full or heartbeat — heartbeat skips individual notes
  }

  // Nav notes always use all-articles stats
  const files: SecondBrainExportFile[] = [
    buildIndexFile(mode === "heartbeat" ? [] : noteItems, mode),
    buildHeartbeatFile(articles),
    buildManifestFile(articles, mode, exportDate),
  ];

  // MOC notes
  const mocBase = mode === "heartbeat" ? articles : noteItems;
  files.push(...buildMapNoteFiles(mocBase));

  // Individual notes (not for heartbeat)
  if (mode !== "heartbeat") {
    files.push(...noteItems.map(buildArticleFile));
  }

  return {
    mode,
    files,
    totalNotes: mode === "heartbeat" ? 0 : noteItems.length,
    exportDate,
  };
}
