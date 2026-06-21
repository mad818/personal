export type IdeaLinkKind = "github" | "x" | "other";

export interface IdeaLinkIntakeItem {
  id: string;
  source: string;
  kind: IdeaLinkKind;
  status: "pending" | "triaged" | "shipped" | "rejected";
  addedAt: string;
  lane?: string;
  priority?: "high" | "medium" | "low";
  targetMatrix?: string;
  note?: string;
}

export interface IdeaLinkIntakeQueue {
  schemaVersion: number;
  updatedAt: string;
  notes?: string;
  items: IdeaLinkIntakeItem[];
}

const URL_RE = /https?:\/\/[^\s<>"')\]]+/gi;

export function classifyIdeaLink(url: string): IdeaLinkKind {
  const lower = url.toLowerCase();
  if (lower.includes("github.com") || lower.includes("gitlab.com")) {
    return "github";
  }
  if (lower.includes("x.com/") || lower.includes("twitter.com/")) {
    return "x";
  }
  return "other";
}

export function slugifyIdeaLinkId(url: string): string {
  const kind = classifyIdeaLink(url);
  if (kind === "github") {
    const match = url.match(/github\.com\/([^/\s]+)\/([^/\s#?]+)/i);
    if (match) {
      return `${match[1]}-${match[2]}`.toLowerCase().replace(/[^a-z0-9-]+/g, "-");
    }
  }
  if (kind === "x") {
    const match = url.match(/status\/(\d+)/i);
    if (match) return `x-${match[1]}`;
  }
  return `link-${hashLinkFallback(url)}`;
}

function hashLinkFallback(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}

export function parseIdeaLinksFromText(text: string): string[] {
  const matches = text.match(URL_RE) ?? [];
  return [...new Set(matches.map((url) => url.replace(/[),.;]+$/g, "").trim()))].filter(
    Boolean,
  );
}

export function buildIdeaLinkIntakeItem(url: string): IdeaLinkIntakeItem {
  const source = url.trim();
  return {
    id: slugifyIdeaLinkId(source),
    source,
    kind: classifyIdeaLink(source),
    status: "pending",
    addedAt: new Date().toISOString(),
    targetMatrix: `docs/ideas/source-parity/${slugifyIdeaLinkId(source)}.json`,
  };
}

export function mergeIdeaLinkIntakeItems(
  existing: IdeaLinkIntakeItem[],
  incoming: IdeaLinkIntakeItem[],
): { merged: IdeaLinkIntakeItem[]; added: IdeaLinkIntakeItem[] } {
  const bySource = new Map(existing.map((item) => [item.source, item]));
  const added: IdeaLinkIntakeItem[] = [];
  for (const item of incoming) {
    if (bySource.has(item.source)) continue;
    bySource.set(item.source, item);
    added.push(item);
  }
  return {
    merged: [...bySource.values()].sort((a, b) => b.addedAt.localeCompare(a.addedAt)),
    added,
  };
}

export function summarizeIdeaLinkIntake(queue: IdeaLinkIntakeQueue) {
  const pending = queue.items.filter((item) => item.status === "pending").length;
  const triaged = queue.items.filter((item) => item.status === "triaged").length;
  return {
    total: queue.items.length,
    pending,
    triaged,
    readyForAssimilation: pending + triaged,
  };
}
