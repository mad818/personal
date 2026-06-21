export interface PaperResearchHit {
  id: string;
  title: string;
  authors: string[];
  summary: string;
  url: string;
  upvotes: number | null;
}

export interface PapersResearchResponse {
  papers: PaperResearchHit[];
  status: "ok" | "empty" | "error";
  message?: string;
  query: string;
}

const TOOL_USER_AGENT =
  "NexusPrime/1.0 (papers-research; local intelligence dashboard)";

export function normalizePapersQuery(query: string): string {
  return query.trim().replace(/\s+/g, " ").slice(0, 120);
}

export function parseHuggingFaceDailyPapers(
  payload: unknown,
  query: string,
  max = 8,
): PaperResearchHit[] {
  if (!Array.isArray(payload)) return [];
  const normalizedQuery = normalizePapersQuery(query).toLowerCase();
  const filtered = normalizedQuery
    ? payload.filter((entry) => {
        if (!entry || typeof entry !== "object") return false;
        const row = entry as {
          paper?: { title?: string; summary?: string };
        };
        const haystack = `${row.paper?.title ?? ""} ${row.paper?.summary ?? ""}`.toLowerCase();
        return haystack.includes(normalizedQuery);
      })
    : payload;

  return (filtered.length ? filtered : payload)
    .slice(0, max)
    .map((entry) => {
      const row = entry as {
        id?: string;
        paper?: {
          title?: string;
          summary?: string;
          authors?: Array<{ name?: string }>;
          upvotes?: number;
        };
      };
      const id = typeof row.id === "string" ? row.id : "";
      const title =
        typeof row.paper?.title === "string"
          ? row.paper.title.slice(0, 180)
          : "Untitled paper";
      const authors = Array.isArray(row.paper?.authors)
        ? row.paper.authors
            .map((author) => author?.name?.trim() ?? "")
            .filter(Boolean)
            .slice(0, 4)
        : [];
      const summary =
        typeof row.paper?.summary === "string"
          ? row.paper.summary.replace(/\s+/g, " ").slice(0, 280)
          : "";
      return {
        id,
        title,
        authors,
        summary,
        url: id ? `https://huggingface.co/papers/${id}` : "",
        upvotes:
          typeof row.paper?.upvotes === "number" ? row.paper.upvotes : null,
      };
    })
    .filter((paper) => paper.id && paper.title);
}

export async function fetchHuggingFaceDailyPapers(
  query: string,
  max = 8,
): Promise<PapersResearchResponse> {
  const normalizedQuery = normalizePapersQuery(query);
  try {
    const response = await fetch("https://huggingface.co/api/daily_papers", {
      headers: { "User-Agent": TOOL_USER_AGENT },
      signal: AbortSignal.timeout(12_000),
      cache: "no-store",
    });
    if (!response.ok) {
      return {
        papers: [],
        status: "error",
        message: `HuggingFace papers API returned HTTP ${response.status}`,
        query: normalizedQuery,
      };
    }
    const payload = await response.json();
    const papers = parseHuggingFaceDailyPapers(payload, normalizedQuery, max);
    return {
      papers,
      status: papers.length > 0 ? "ok" : "empty",
      message: papers.length > 0 ? undefined : "No papers matched that query today.",
      query: normalizedQuery,
    };
  } catch {
    return {
      papers: [],
      status: "error",
      message: "Papers lookup failed.",
      query: normalizedQuery,
    };
  }
}
