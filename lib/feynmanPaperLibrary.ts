import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import {
  FEYNMAN_PAPER_SECTIONS,
  inspectFeynmanPaper,
  normalizeFeynmanPaperReference,
  parseFeynmanPaperSections,
  type FeynmanPaperInspection,
  type FeynmanPaperSection,
} from "./feynmanPaperInspection.ts";
import {
  getLocalAccelerationStatus,
  turboVecSearch,
  turboVecUpsert,
  type LocalAccelerationStatus,
  type TurboVecDocument,
  type TurboVecMatch,
} from "./localAcceleration.ts";

export const FEYNMAN_PAPER_LIBRARY_LIMITS = {
  maximumPapers: 160,
  maximumAnnotationChars: 4_000,
  maximumTags: 16,
  maximumTagChars: 40,
  maximumQueryChars: 240,
  maximumResults: 40,
} as const;

export type FeynmanPaperRetrievalMode =
  | "recent"
  | "local_vector"
  | "keyword_fallback";

export interface FeynmanPaperLibraryEntry {
  version: 1;
  id: string;
  arxivId: string;
  title: string;
  authors: string[];
  publishedAt: string | null;
  categories: string[];
  sourceUrl: string;
  pdfUrl: string;
  htmlUrl: string;
  sections: Partial<Record<FeynmanPaperSection, string>>;
  repositoryLinks: string[];
  warnings: string[];
  annotation: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface FeynmanPaperLibrarySummary {
  id: string;
  arxivId: string;
  title: string;
  authors: string[];
  publishedAt: string | null;
  categories: string[];
  sourceUrl: string;
  pdfUrl: string;
  repositoryLinks: string[];
  abstract: string;
  annotation: string;
  tags: string[];
  warnings: string[];
  createdAt: number;
  updatedAt: number;
}

export interface FeynmanPaperAccelerationPosture {
  enabled: boolean;
  available: boolean;
  embeddingMode: "ollama" | "auto" | "hash" | "unknown";
}

export class FeynmanPaperLibraryError extends Error {
  readonly kind: "validation" | "not_found" | "storage" | "inspection";

  constructor(
    message: string,
    kind: "validation" | "not_found" | "storage" | "inspection",
  ) {
    super(message);
    this.name = "FeynmanPaperLibraryError";
    this.kind = kind;
  }
}

type PaperLibraryFile = {
  version: 1;
  papers: FeynmanPaperLibraryEntry[];
};

type FeynmanPaperLibraryDeps = {
  dataFile?: string;
  now?: () => number;
  inspect?: typeof inspectFeynmanPaper;
  vectorStatus?: () => Promise<LocalAccelerationStatus>;
  vectorSearch?: (input: {
    query: string;
    limit: number;
    allowlist: string[];
  }) => Promise<TurboVecMatch[]>;
  vectorUpsert?: (documents: TurboVecDocument[]) => Promise<unknown>;
};

function defaultDataFile() {
  return path.join(process.cwd(), ".nexus", "feynman-paper-library.json");
}

function resolveDeps(deps: FeynmanPaperLibraryDeps = {}) {
  return {
    dataFile: deps.dataFile ?? defaultDataFile(),
    now: deps.now ?? Date.now,
    inspect: deps.inspect ?? inspectFeynmanPaper,
    vectorStatus: deps.vectorStatus ?? getLocalAccelerationStatus,
    vectorSearch: deps.vectorSearch ?? turboVecSearch,
    vectorUpsert: deps.vectorUpsert ?? turboVecUpsert,
  };
}

function libraryId(arxivId: string) {
  return `feynman-paper:${arxivId.toLowerCase()}`;
}

function boundedText(value: unknown, maximumChars: number) {
  return typeof value === "string"
    ? value.replace(/\r\n?/g, "\n").trim().slice(0, maximumChars)
    : "";
}

export function normalizeFeynmanPaperTags(value: unknown) {
  const rawTags = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];
  return Array.from(
    new Set(
      rawTags
        .filter((tag): tag is string => typeof tag === "string")
        .map((tag) =>
          tag
            .replace(/[^a-z0-9 _.-]/gi, "")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase()
            .slice(0, FEYNMAN_PAPER_LIBRARY_LIMITS.maximumTagChars),
        )
        .filter(Boolean),
    ),
  ).slice(0, FEYNMAN_PAPER_LIBRARY_LIMITS.maximumTags);
}

export function normalizeFeynmanPaperAnnotation(value: unknown) {
  const annotation = boundedText(
    value,
    FEYNMAN_PAPER_LIBRARY_LIMITS.maximumAnnotationChars + 1,
  );
  if (annotation.length > FEYNMAN_PAPER_LIBRARY_LIMITS.maximumAnnotationChars) {
    throw new FeynmanPaperLibraryError(
      `Annotation must contain at most ${FEYNMAN_PAPER_LIBRARY_LIMITS.maximumAnnotationChars} characters.`,
      "validation",
    );
  }
  return annotation;
}

export function normalizeFeynmanPaperQuery(value: unknown) {
  const query = boundedText(
    value,
    FEYNMAN_PAPER_LIBRARY_LIMITS.maximumQueryChars + 1,
  );
  if (!query) {
    throw new FeynmanPaperLibraryError(
      "Search query is required.",
      "validation",
    );
  }
  if (query.length > FEYNMAN_PAPER_LIBRARY_LIMITS.maximumQueryChars) {
    throw new FeynmanPaperLibraryError(
      `Search query must contain at most ${FEYNMAN_PAPER_LIBRARY_LIMITS.maximumQueryChars} characters.`,
      "validation",
    );
  }
  return query;
}

function isLibraryEntry(value: unknown): value is FeynmanPaperLibraryEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<FeynmanPaperLibraryEntry>;
  const stringArray = (candidate: unknown, maximumItems: number) =>
    Array.isArray(candidate) &&
    candidate.length <= maximumItems &&
    candidate.every((item) => typeof item === "string");
  const sections = entry.sections;
  const validSections =
    sections !== null &&
    typeof sections === "object" &&
    Object.entries(sections).every(
      ([section, excerpt]) =>
        FEYNMAN_PAPER_SECTIONS.includes(section as FeynmanPaperSection) &&
        typeof excerpt === "string",
    );
  let referenceMatches = false;
  try {
    const reference = normalizeFeynmanPaperReference(entry.arxivId ?? "");
    referenceMatches =
      entry.id === libraryId(reference.id) &&
      entry.sourceUrl === reference.sourceUrl &&
      entry.pdfUrl === reference.pdfUrl &&
      entry.htmlUrl === reference.htmlUrl;
  } catch {
    referenceMatches = false;
  }
  return Boolean(
    entry.version === 1 &&
    referenceMatches &&
    typeof entry.title === "string" &&
    entry.title.length > 0 &&
    stringArray(entry.authors, 12) &&
    (entry.publishedAt === null || typeof entry.publishedAt === "string") &&
    stringArray(entry.categories, 20) &&
    validSections &&
    stringArray(entry.repositoryLinks, 8) &&
    stringArray(entry.warnings, 20) &&
    typeof entry.annotation === "string" &&
    entry.annotation.length <=
      FEYNMAN_PAPER_LIBRARY_LIMITS.maximumAnnotationChars &&
    stringArray(entry.tags, FEYNMAN_PAPER_LIBRARY_LIMITS.maximumTags) &&
    entry.tags?.every(
      (tag) =>
        tag.length > 0 &&
        tag.length <= FEYNMAN_PAPER_LIBRARY_LIMITS.maximumTagChars,
    ) &&
    Number.isFinite(entry.createdAt) &&
    Number.isFinite(entry.updatedAt),
  );
}

function boundedResultLimit(value: number | undefined) {
  const candidate = Number.isFinite(value) ? Math.floor(value ?? 20) : 20;
  return Math.max(
    1,
    Math.min(FEYNMAN_PAPER_LIBRARY_LIMITS.maximumResults, candidate),
  );
}

async function readLibrary(deps: FeynmanPaperLibraryDeps = {}) {
  const { dataFile } = resolveDeps(deps);
  try {
    const raw = await readFile(dataFile, "utf8");
    const parsed = JSON.parse(raw) as Partial<PaperLibraryFile>;
    if (
      parsed.version !== 1 ||
      !Array.isArray(parsed.papers) ||
      !parsed.papers.every(isLibraryEntry)
    ) {
      throw new Error("Invalid paper library schema.");
    }
    return parsed.papers
      .slice(0, FEYNMAN_PAPER_LIBRARY_LIMITS.maximumPapers)
      .sort((left, right) => right.updatedAt - left.updatedAt);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return [];
    }
    throw new FeynmanPaperLibraryError(
      "The local Feynman paper library could not be read safely.",
      "storage",
    );
  }
}

async function writeLibrary(
  papers: FeynmanPaperLibraryEntry[],
  deps: FeynmanPaperLibraryDeps = {},
) {
  const { dataFile } = resolveDeps(deps);
  try {
    await mkdir(path.dirname(dataFile), { recursive: true });
    const payload: PaperLibraryFile = {
      version: 1,
      papers: papers.slice(0, FEYNMAN_PAPER_LIBRARY_LIMITS.maximumPapers),
    };
    await writeFile(dataFile, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  } catch {
    throw new FeynmanPaperLibraryError(
      "The local Feynman paper library could not be saved.",
      "storage",
    );
  }
}

export function toFeynmanPaperLibrarySummary(
  paper: FeynmanPaperLibraryEntry,
): FeynmanPaperLibrarySummary {
  return {
    id: paper.id,
    arxivId: paper.arxivId,
    title: paper.title,
    authors: paper.authors,
    publishedAt: paper.publishedAt,
    categories: paper.categories,
    sourceUrl: paper.sourceUrl,
    pdfUrl: paper.pdfUrl,
    repositoryLinks: paper.repositoryLinks,
    abstract: paper.sections.abstract ?? "",
    annotation: paper.annotation,
    tags: paper.tags,
    warnings: paper.warnings,
    createdAt: paper.createdAt,
    updatedAt: paper.updatedAt,
  };
}

function indexDocument(paper: FeynmanPaperLibraryEntry): TurboVecDocument {
  return {
    id: paper.id,
    text: [
      paper.title,
      paper.authors.join(" "),
      paper.categories.join(" "),
      ...Object.entries(paper.sections).map(
        ([section, excerpt]) => `${section}\n${excerpt}`,
      ),
      paper.tags.join(" "),
      paper.annotation,
    ]
      .filter(Boolean)
      .join("\n"),
    metadata: {
      domain: "research",
      route: "/vault",
      source: "arxiv",
      arxivId: paper.arxivId,
      createdAt: paper.createdAt,
    },
  };
}

async function attemptPaperIndex(
  paper: FeynmanPaperLibraryEntry,
  deps: FeynmanPaperLibraryDeps = {},
) {
  try {
    await resolveDeps(deps).vectorUpsert([indexDocument(paper)]);
    return true;
  } catch {
    return false;
  }
}

function entryFromInspection(
  inspection: FeynmanPaperInspection,
  existing: FeynmanPaperLibraryEntry | undefined,
  now: number,
): FeynmanPaperLibraryEntry {
  return {
    version: 1,
    id: libraryId(inspection.id),
    arxivId: inspection.id,
    title: inspection.title,
    authors: inspection.authors,
    publishedAt: inspection.publishedAt,
    categories: inspection.categories,
    sourceUrl: inspection.sourceUrl,
    pdfUrl: inspection.pdfUrl,
    htmlUrl: inspection.htmlUrl,
    sections: inspection.sections,
    repositoryLinks: inspection.repositoryLinks,
    warnings: inspection.warnings,
    annotation: existing?.annotation ?? "",
    tags: existing?.tags ?? [],
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

export async function addFeynmanPaperToLibrary(
  rawReference: string,
  deps: FeynmanPaperLibraryDeps = {},
) {
  let reference;
  try {
    reference = normalizeFeynmanPaperReference(rawReference);
  } catch (error) {
    throw new FeynmanPaperLibraryError(
      error instanceof Error ? error.message : "Invalid arXiv reference.",
      "validation",
    );
  }

  const resolved = resolveDeps(deps);
  let inspection: FeynmanPaperInspection;
  try {
    inspection = await resolved.inspect(
      reference,
      parseFeynmanPaperSections(""),
    );
  } catch (error) {
    throw new FeynmanPaperLibraryError(
      error instanceof Error
        ? error.message
        : "Public arXiv inspection failed.",
      "inspection",
    );
  }

  const papers = await readLibrary(deps);
  const existing = papers.find((paper) => paper.id === libraryId(reference.id));
  const paper = entryFromInspection(inspection, existing, resolved.now());
  const next = [paper, ...papers.filter((item) => item.id !== paper.id)];
  await writeLibrary(next, deps);
  return {
    paper: toFeynmanPaperLibrarySummary(paper),
    indexed: await attemptPaperIndex(paper, deps),
    refreshed: Boolean(existing),
  };
}

export async function updateFeynmanPaperAnnotation(
  input: { id: string; annotation: unknown; tags: unknown },
  deps: FeynmanPaperLibraryDeps = {},
) {
  const id = boundedText(input.id, 240);
  if (!id.startsWith("feynman-paper:")) {
    throw new FeynmanPaperLibraryError(
      "A valid Feynman paper library ID is required.",
      "validation",
    );
  }
  const papers = await readLibrary(deps);
  const index = papers.findIndex((paper) => paper.id === id);
  if (index < 0) {
    throw new FeynmanPaperLibraryError("Feynman paper not found.", "not_found");
  }
  const paper: FeynmanPaperLibraryEntry = {
    ...papers[index],
    annotation: normalizeFeynmanPaperAnnotation(input.annotation),
    tags: normalizeFeynmanPaperTags(input.tags),
    updatedAt: resolveDeps(deps).now(),
  };
  const next = [paper, ...papers.filter((item) => item.id !== paper.id)];
  await writeLibrary(next, deps);
  return {
    paper: toFeynmanPaperLibrarySummary(paper),
    indexed: await attemptPaperIndex(paper, deps),
  };
}

function embeddingMode(
  status: LocalAccelerationStatus,
): FeynmanPaperAccelerationPosture["embeddingMode"] {
  const value = status.turboVec.stats?.embeddingMode;
  return value === "ollama" || value === "auto" || value === "hash"
    ? value
    : "unknown";
}

async function accelerationPosture(
  deps: FeynmanPaperLibraryDeps = {},
): Promise<FeynmanPaperAccelerationPosture> {
  try {
    const status = await resolveDeps(deps).vectorStatus();
    return {
      enabled: status.turboVec.enabled,
      available: status.turboVec.available,
      embeddingMode: embeddingMode(status),
    };
  } catch {
    return { enabled: false, available: false, embeddingMode: "unknown" };
  }
}

function keywordRank(papers: FeynmanPaperLibraryEntry[], query: string) {
  const tokens = Array.from(
    new Set(
      query
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(Boolean),
    ),
  );
  return papers
    .map((paper) => {
      const publicText = [
        paper.title,
        paper.authors.join(" "),
        paper.categories.join(" "),
        Object.values(paper.sections).join(" "),
        paper.tags.join(" "),
      ]
        .join(" ")
        .toLowerCase();
      const annotation = paper.annotation.toLowerCase();
      const score = tokens.reduce(
        (total, token) =>
          total +
          (publicText.includes(token) ? 1 : 0) +
          (annotation.includes(token) ? 2 : 0),
        0,
      );
      return { paper, score };
    })
    .filter((entry) => entry.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        right.paper.updatedAt - left.paper.updatedAt,
    )
    .map((entry) => entry.paper);
}

export async function listFeynmanPaperLibrary(
  options: { limit?: number } = {},
  deps: FeynmanPaperLibraryDeps = {},
) {
  const limit = boundedResultLimit(options.limit);
  const papers = await readLibrary(deps);
  return {
    papers: papers.slice(0, limit).map(toFeynmanPaperLibrarySummary),
    retrieval: "recent" as const,
    acceleration: await accelerationPosture(deps),
  };
}

export async function searchFeynmanPaperLibrary(
  rawQuery: unknown,
  options: { limit?: number } = {},
  deps: FeynmanPaperLibraryDeps = {},
) {
  const query = normalizeFeynmanPaperQuery(rawQuery);
  const limit = boundedResultLimit(options.limit);
  const papers = await readLibrary(deps);
  const acceleration = await accelerationPosture(deps);

  if (acceleration.enabled && acceleration.available && papers.length > 0) {
    try {
      const matches = await resolveDeps(deps).vectorSearch({
        query,
        limit,
        allowlist: papers.map((paper) => paper.id),
      });
      const paperById = new Map(papers.map((paper) => [paper.id, paper]));
      return {
        papers: matches
          .map((match) => paperById.get(match.id))
          .filter((paper): paper is FeynmanPaperLibraryEntry => Boolean(paper))
          .slice(0, limit)
          .map(toFeynmanPaperLibrarySummary),
        retrieval: "local_vector" as const,
        acceleration,
      };
    } catch {
      // Preserve deterministic local retrieval if the optional vector call fails.
    }
  }

  return {
    papers: keywordRank(papers, query)
      .slice(0, limit)
      .map(toFeynmanPaperLibrarySummary),
    retrieval: "keyword_fallback" as const,
    acceleration,
  };
}
