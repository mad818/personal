export type PaperReference = {
  arxivId: string | null;
  doi: string | null;
  sourceUrl: string;
};

export type PaperAuthor = {
  name: string;
};

export type PaperMetadata = {
  arxivId: string | null;
  doi: string | null;
  title: string;
  authors: PaperAuthor[];
  abstract: string;
  publishedAt: string | null;
  updatedAt: string | null;
  githubUrl: string | null;
  sourceUrl: string;
};

export type PaperSection = {
  kind: "abstract" | "full";
  content: string;
  truncated: boolean;
};

export type PaperAnnotation = {
  arxivId: string | null;
  doi: string | null;
  sourceUrl: string;
  note: string;
  annotatedAt: string;
};

export type PaperInspection = PaperMetadata & {
  section: PaperSection;
  codeReferences: string[];
  warnings: string[];
};

export type PaperSearchResult = {
  arxivId: string;
  title: string;
  authors: PaperAuthor[];
  abstract: string;
  publishedAt: string | null;
  sourceUrl: string;
};

export type PaperInspectionDeps = {
  fetchImpl?: typeof fetch;
};

export const FEYNMAN_PAPER_INSPECTION_LIMITS = {
  maximumSearchResults: 10,
  maximumAuthors: 8,
  maximumAbstractLength: 1_200,
  maximumFullSectionLength: 3_000,
  maximumFormattedChars: 12_000,
  maximumCodeReferences: 5,
  timeoutMs: 10_000,
} as const;

const ARXIV_EXPORT_BASE = "https://export.arxiv.org/api/query";
const ARXIV_ABS_BASE = "https://arxiv.org/abs";
const PAPER_USER_AGENT = "NexusPrime/feynman-paper-inspection";

const ARXIV_ID_RE =
  /(?:arxiv\.org\/(?:abs|pdf)\/|^)(\d{4}\.\d{4,5}(?:v\d+)?)$/i;
const ARXIV_URL_RE =
  /https?:\/\/arxiv\.org\/(?:abs|pdf)\/(\d{4}\.\d{4,5}(?:v\d+)?)/i;
const DOI_URL_RE = /https?:\/\/doi\.org\/(10\.[^\s/]+\/[^\s]+)/i;
const GITHUB_URL_RE =
  /https?:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\/[^\s"<>)]+)?/gi;

function cleanInline(value: unknown, max = 200) {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  return normalized.length <= max
    ? normalized
    : `${normalized.slice(0, max - 1).trimEnd()}…`;
}

function extractText(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : "";
}

function extractAll(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
  const results: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const text = m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (text) results.push(text);
  }
  return results;
}

function extractArxivId(xml: string): string | null {
  const idTag = extractText(xml, "id");
  const m = idTag.match(ARXIV_ID_RE);
  return m ? m[1].replace(/v\d+$/, "") : null;
}

function parsePublishedDate(xml: string): string | null {
  const published = extractText(xml, "published");
  if (!published) return null;
  const d = published.slice(0, 10);
  return d.length === 10 ? d : null;
}

function extractGithubUrl(text: string): string | null {
  const matches = text.match(GITHUB_URL_RE) ?? [];
  return matches[0]?.replace(/[.)]+$/, "") ?? null;
}

function extractAllGithubUrls(text: string): string[] {
  const seen = new Set<string>();
  const results: string[] = [];
  for (const raw of text.match(GITHUB_URL_RE) ?? []) {
    const url = raw.replace(/[.)]+$/, "");
    if (!seen.has(url)) {
      seen.add(url);
      results.push(url);
    }
    if (results.length >= FEYNMAN_PAPER_INSPECTION_LIMITS.maximumCodeReferences) break;
  }
  return results;
}

function safeRequestInit(): RequestInit {
  return {
    headers: {
      Accept: "application/atom+xml, application/xml, text/xml",
      "User-Agent": PAPER_USER_AGENT,
    },
    signal: AbortSignal.timeout(FEYNMAN_PAPER_INSPECTION_LIMITS.timeoutMs),
    cache: "no-store",
  };
}

async function readResponseText(response: Response, maximumBytes: number) {
  const contentLength = Number(response.headers.get("content-length") ?? "0");
  if (contentLength > maximumBytes) {
    throw new Error(`Paper API response exceeded the ${maximumBytes}-byte limit.`);
  }
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      total += next.value.byteLength;
      if (total > maximumBytes) {
        await reader.cancel();
        throw new Error(`Paper API response exceeded the ${maximumBytes}-byte limit.`);
      }
      chunks.push(next.value);
    }
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(result).trim();
}

export function normalizePaperReference(raw: string): PaperReference {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error("Paper reference is required.");

  if (trimmed.length > 1024) throw new Error("Paper reference is too long.");
  if (trimmed.includes("..") || trimmed.includes("\\")) {
    throw new Error("Paper reference contains invalid characters.");
  }

  const arxivUrlMatch = trimmed.match(ARXIV_URL_RE);
  if (arxivUrlMatch) {
    const arxivId = arxivUrlMatch[1].replace(/v\d+$/, "");
    return {
      arxivId,
      doi: null,
      sourceUrl: `${ARXIV_ABS_BASE}/${arxivId}`,
    };
  }

  const doiUrlMatch = trimmed.match(DOI_URL_RE);
  if (doiUrlMatch) {
    return {
      arxivId: null,
      doi: doiUrlMatch[1],
      sourceUrl: `https://doi.org/${doiUrlMatch[1]}`,
    };
  }

  const absPathMatch = trimmed.match(/^(?:arxiv:)?(\d{4}\.\d{4,5}(?:v\d+)?)$/i);
  if (absPathMatch) {
    const arxivId = absPathMatch[1].replace(/v\d+$/, "");
    return {
      arxivId,
      doi: null,
      sourceUrl: `${ARXIV_ABS_BASE}/${arxivId}`,
    };
  }

  throw new Error(
    "Paper reference must be an arxiv abs URL (arxiv.org/abs/NNNN.NNNNN), arxiv ID (NNNN.NNNNN), or DOI URL (doi.org/10.xxx/yyy).",
  );
}

export function findPaperReference(value: string): PaperReference | null {
  const arxivMatch = value.match(ARXIV_URL_RE);
  if (arxivMatch) {
    try {
      return normalizePaperReference(arxivMatch[0]);
    } catch {
      return null;
    }
  }
  const doiMatch = value.match(DOI_URL_RE);
  if (doiMatch) {
    try {
      return normalizePaperReference(doiMatch[0]);
    } catch {
      return null;
    }
  }
  return null;
}

function parseAtomEntry(entryXml: string): PaperSearchResult | null {
  const rawId = extractArxivId(entryXml);
  if (!rawId) return null;
  const title = cleanInline(extractText(entryXml, "title"), 300);
  if (!title) return null;

  const authorNames = extractAll(entryXml, "name")
    .map((name) => cleanInline(name, 100))
    .filter(Boolean)
    .slice(0, FEYNMAN_PAPER_INSPECTION_LIMITS.maximumAuthors);

  const abstract = cleanInline(
    extractText(entryXml, "summary"),
    FEYNMAN_PAPER_INSPECTION_LIMITS.maximumAbstractLength,
  );

  return {
    arxivId: rawId,
    title,
    authors: authorNames.map((name) => ({ name })),
    abstract,
    publishedAt: parsePublishedDate(entryXml),
    sourceUrl: `${ARXIV_ABS_BASE}/${rawId}`,
  };
}

function splitAtomEntries(xml: string): string[] {
  const entries: string[] = [];
  const re = /<entry>([\s\S]*?)<\/entry>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    entries.push(m[0]);
  }
  return entries;
}

export async function searchPapers(
  query: string,
  maxResults: number = FEYNMAN_PAPER_INSPECTION_LIMITS.maximumSearchResults,
  deps: PaperInspectionDeps = {},
): Promise<PaperSearchResult[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) throw new Error("Paper search query is required.");

  const bounded = Math.min(
    Math.max(1, maxResults),
    FEYNMAN_PAPER_INSPECTION_LIMITS.maximumSearchResults,
  );
  const url =
    `${ARXIV_EXPORT_BASE}?search_query=all:${encodeURIComponent(trimmedQuery)}` +
    `&max_results=${bounded}&sortBy=relevance`;

  const response = await (deps.fetchImpl ?? fetch)(url, safeRequestInit());
  if (!response.ok) {
    throw new Error(`arxiv export API returned HTTP ${response.status}.`);
  }
  const xml = await readResponseText(response, 512 * 1024);
  const entries = splitAtomEntries(xml);
  const results: PaperSearchResult[] = [];
  for (const entry of entries.slice(0, bounded)) {
    const parsed = parseAtomEntry(entry);
    if (parsed) results.push(parsed);
  }
  return results;
}

export async function fetchPaperMetadata(
  reference: PaperReference,
  deps: PaperInspectionDeps = {},
): Promise<PaperMetadata> {
  if (!reference.arxivId) {
    throw new Error(
      "Paper metadata fetch requires an arxiv ID; DOI-only references are not supported.",
    );
  }

  const url =
    `${ARXIV_EXPORT_BASE}?id_list=${encodeURIComponent(reference.arxivId)}&max_results=1`;
  const response = await (deps.fetchImpl ?? fetch)(url, safeRequestInit());
  if (!response.ok) {
    throw new Error(`arxiv export API returned HTTP ${response.status}.`);
  }
  const xml = await readResponseText(response, 512 * 1024);
  const entries = splitAtomEntries(xml);
  const entryXml = entries[0];
  if (!entryXml) {
    throw new Error(`arxiv paper ${reference.arxivId} was not found.`);
  }

  const title = cleanInline(extractText(entryXml, "title"), 300);
  if (!title) throw new Error(`arxiv paper ${reference.arxivId} returned no title.`);

  const authorNames = extractAll(entryXml, "name")
    .map((name) => cleanInline(name, 100))
    .filter(Boolean)
    .slice(0, FEYNMAN_PAPER_INSPECTION_LIMITS.maximumAuthors);

  const rawAbstract = extractText(entryXml, "summary");
  const abstract = cleanInline(
    rawAbstract,
    FEYNMAN_PAPER_INSPECTION_LIMITS.maximumAbstractLength,
  );

  const doiMatch = entryXml.match(/arxiv:doi[^>]*>([^<]+)/i);
  const doi = doiMatch ? cleanInline(doiMatch[1], 200) || null : reference.doi;

  const githubUrl = extractGithubUrl(rawAbstract);

  return {
    arxivId: reference.arxivId,
    doi,
    title,
    authors: authorNames.map((name) => ({ name })),
    abstract,
    publishedAt: parsePublishedDate(entryXml),
    updatedAt: cleanInline(extractText(entryXml, "updated"), 30) || null,
    githubUrl,
    sourceUrl: reference.sourceUrl,
  };
}

export function readPaperSection(
  metadata: PaperMetadata,
  kind: "abstract" | "full" = "abstract",
): PaperSection {
  const abstract = metadata.abstract;
  if (kind === "abstract") {
    return { kind: "abstract", content: abstract, truncated: false };
  }

  const parts: string[] = [];
  parts.push(`Abstract: ${abstract}`);

  if (metadata.githubUrl) {
    parts.push(`Code: ${metadata.githubUrl}`);
  }
  if (metadata.doi) {
    parts.push(`DOI: ${metadata.doi}`);
  }
  if (metadata.publishedAt) {
    parts.push(`Published: ${metadata.publishedAt}`);
  }
  if (metadata.updatedAt) {
    parts.push(`Updated: ${metadata.updatedAt}`);
  }

  const joined = parts.join("\n");
  const limit = FEYNMAN_PAPER_INSPECTION_LIMITS.maximumFullSectionLength;
  if (joined.length <= limit) {
    return { kind: "full", content: joined, truncated: false };
  }
  return {
    kind: "full",
    content: `${joined.slice(0, limit - 40).trimEnd()}\n[Section truncated at the bounded evidence limit.]`,
    truncated: true,
  };
}

export function formatPaperInspection(inspection: PaperInspection): string {
  const authors =
    inspection.authors.length > 0
      ? inspection.authors.map((a) => a.name).join(", ")
      : "unknown";

  const codeRefs =
    inspection.codeReferences.length > 0
      ? inspection.codeReferences.map((url) => `- ${url}`).join("\n")
      : "- No GitHub code references found in abstract.";

  const receipt = [
    `Paper inspection`,
    `Source: ${inspection.sourceUrl}`,
    `ArXiv ID: ${inspection.arxivId ?? "unknown"}`,
    `DOI: ${inspection.doi ?? "unknown"}`,
    `Title: ${inspection.title}`,
    `Authors: ${authors}`,
    `Published: ${inspection.publishedAt ?? "unknown"}`,
    "",
    `Section: ${inspection.section.kind}${inspection.section.truncated ? " (truncated)" : ""}`,
    inspection.section.content,
    "",
    "Code references:",
    codeRefs,
    "",
    `Warnings: ${inspection.warnings.join(" | ") || "none"}`,
  ].join("\n");

  if (receipt.length <= FEYNMAN_PAPER_INSPECTION_LIMITS.maximumFormattedChars) {
    return receipt;
  }
  const suffix = "\n[Receipt truncated at the bounded evidence limit.]";
  return `${receipt.slice(
    0,
    FEYNMAN_PAPER_INSPECTION_LIMITS.maximumFormattedChars - suffix.length,
  )}${suffix}`;
}

export function askPaperQuestion(
  question: string,
  metadata: PaperMetadata,
): string {
  const section = readPaperSection(metadata, "full");
  return [
    `Question: ${question.trim()}`,
    "",
    `Paper: ${metadata.title}`,
    `Source: ${metadata.sourceUrl}`,
    "",
    "Paper context:",
    section.content,
  ].join("\n");
}

export function annotatePaper(
  reference: PaperReference,
  note: string,
  now = new Date().toISOString(),
): PaperAnnotation {
  return {
    arxivId: reference.arxivId,
    doi: reference.doi,
    sourceUrl: reference.sourceUrl,
    note: note.trim().slice(0, 2000),
    annotatedAt: now,
  };
}

export function extractPaperCodeReferences(
  metadata: PaperMetadata,
): string[] {
  const combined = [
    metadata.abstract,
    metadata.githubUrl ?? "",
  ].join(" ");
  return extractAllGithubUrls(combined);
}

export async function inspectPaperTopic(
  topic: string,
  deps: PaperInspectionDeps = {},
): Promise<{ url: string; content: string } | null> {
  const reference = findPaperReference(topic);
  if (!reference) return null;

  try {
    const metadata = await fetchPaperMetadata(reference, deps);
    const section = readPaperSection(metadata, "full");
    const codeReferences = extractPaperCodeReferences(metadata);
    const inspection: PaperInspection = {
      ...metadata,
      section,
      codeReferences,
      warnings: [],
    };
    return {
      url: metadata.sourceUrl,
      content: formatPaperInspection(inspection),
    };
  } catch (error) {
    const warning = error instanceof Error ? error.message : "Paper fetch failed.";
    const fallbackSection: PaperSection = {
      kind: "abstract",
      content: "Paper metadata was unavailable.",
      truncated: false,
    };
    const fallbackInspection: PaperInspection = {
      arxivId: reference.arxivId,
      doi: reference.doi,
      title: "Unknown",
      authors: [],
      abstract: "",
      publishedAt: null,
      updatedAt: null,
      githubUrl: null,
      sourceUrl: reference.sourceUrl,
      section: fallbackSection,
      codeReferences: [],
      warnings: [warning],
    };
    return {
      url: reference.sourceUrl,
      content: formatPaperInspection(fallbackInspection),
    };
  }
}
