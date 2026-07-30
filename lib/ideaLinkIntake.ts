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
const CODE_HOSTS = new Set(["github.com", "www.github.com", "gitlab.com"]);
const SOCIAL_HOSTS = new Set([
  "x.com",
  "www.x.com",
  "twitter.com",
  "www.twitter.com",
]);

export function classifyIdeaLink(url: string): IdeaLinkKind {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (CODE_HOSTS.has(hostname)) return "github";
    if (SOCIAL_HOSTS.has(hostname)) return "x";
  } catch {
    return "other";
  }
  return "other";
}

export function slugifyIdeaLinkId(url: string): string {
  const kind = classifyIdeaLink(url);
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split("/").filter(Boolean);
    if (kind === "github" && segments.length >= 2) {
      return `${segments[0]}-${segments[1]}`
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, "-");
    }
    if (kind === "x") {
      const statusIndex = segments.findIndex(
        (segment) => segment.toLowerCase() === "status",
      );
      const statusId = statusIndex >= 0 ? segments[statusIndex + 1] : "";
      if (statusId && /^\d+$/.test(statusId)) return `x-${statusId}`;
    }
  } catch {
    // Fall through to the stable local hash.
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
  return [...new Set(matches.map(trimTrailingPunctuation))].filter(Boolean);
}

function trimTrailingPunctuation(value: string) {
  let end = value.length;
  while (end > 0 && [")", ",", ".", ";"].includes(value[end - 1]!)) {
    end -= 1;
  }
  return value.slice(0, end).trim();
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
    merged: [...bySource.values()].sort((a, b) =>
      b.addedAt.localeCompare(a.addedAt),
    ),
    added,
  };
}

export function summarizeIdeaLinkIntake(queue: IdeaLinkIntakeQueue) {
  const pending = queue.items.filter(
    (item) => item.status === "pending",
  ).length;
  const triaged = queue.items.filter(
    (item) => item.status === "triaged",
  ).length;
  return {
    total: queue.items.length,
    pending,
    triaged,
    readyForAssimilation: pending + triaged,
  };
}
