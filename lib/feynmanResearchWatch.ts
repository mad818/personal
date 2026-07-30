import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { normalizeFeynmanPaperReference } from "./feynmanPaperInspection.ts";

export const FEYNMAN_RESEARCH_WATCH_TEMPLATE_ID = "watch";

export const FEYNMAN_RESEARCH_WATCH_LIMITS = {
  maximumTopicChars: 200,
  maximumWatchIdChars: 120,
  maximumResults: 12,
  maximumResponseBytes: 512 * 1024,
  maximumWatches: 32,
  maximumReceiptsPerWatch: 40,
  cacheMs: 24 * 60 * 60 * 1_000,
  timeoutMs: 12_000,
} as const;

export type FeynmanResearchWatchStatus =
  | "baseline"
  | "changed"
  | "unchanged"
  | "cached"
  | "error";

export interface FeynmanResearchWatchEntry {
  id: string;
  title: string;
  authors: string[];
  categories: string[];
  summary: string;
  sourceUrl: string;
  publishedAt: string;
  updatedAt: string;
}

export interface FeynmanResearchWatchChange {
  kind: "new" | "updated";
  entry: FeynmanResearchWatchEntry;
  previousUpdatedAt: string | null;
}

export interface FeynmanResearchWatchReceipt {
  checkedAt: number;
  status: FeynmanResearchWatchStatus;
  cached: boolean;
  entryCount: number;
  newCount: number;
  updatedCount: number;
  changes: FeynmanResearchWatchChange[];
  error: string | null;
}

export interface FeynmanResearchWatchRecord {
  version: 1;
  id: string;
  topic: string;
  createdAt: number;
  lastCheckedAt: number;
  lastFetchedAt: number | null;
  lastStatus: FeynmanResearchWatchStatus;
  lastError: string | null;
  current: FeynmanResearchWatchEntry[];
  history: FeynmanResearchWatchReceipt[];
}

type FeynmanResearchWatchFile = {
  version: 1;
  watches: FeynmanResearchWatchRecord[];
};

type FeynmanResearchWatchDeps = {
  dataFile?: string;
  fetchImpl?: typeof fetch;
  now?: () => number;
  sleep?: (milliseconds: number) => Promise<void>;
};

let arxivRequestQueue: Promise<void> = Promise.resolve();
let lastArxivRequestAt = 0;

export class FeynmanResearchWatchError extends Error {
  readonly kind: "validation" | "network" | "storage" | "parse";

  constructor(
    message: string,
    kind: "validation" | "network" | "storage" | "parse",
  ) {
    super(message);
    this.name = "FeynmanResearchWatchError";
    this.kind = kind;
  }
}

function defaultDataFile() {
  return path.join(process.cwd(), ".nexus", "feynman-research-watches.json");
}

function resolveDeps(deps: FeynmanResearchWatchDeps = {}) {
  return {
    dataFile: deps.dataFile ?? defaultDataFile(),
    fetchImpl: deps.fetchImpl ?? fetch,
    now: deps.now ?? Date.now,
    sleep:
      deps.sleep ??
      ((milliseconds: number) =>
        new Promise((resolve) => setTimeout(resolve, milliseconds))),
  };
}

function boundedInline(value: string, maximumChars: number) {
  return value.replace(/\s+/g, " ").trim().slice(0, maximumChars);
}

export function normalizeFeynmanResearchWatchId(value: unknown) {
  const id = typeof value === "string" ? value.trim() : "";
  if (
    !id ||
    id.length > FEYNMAN_RESEARCH_WATCH_LIMITS.maximumWatchIdChars ||
    !/^[a-z0-9][a-z0-9._:-]*$/i.test(id)
  ) {
    throw new FeynmanResearchWatchError(
      "A bounded scheduler watch ID is required.",
      "validation",
    );
  }
  return id;
}

export function normalizeFeynmanResearchWatchTopic(value: unknown) {
  const raw =
    typeof value === "string"
      ? value
          .normalize("NFKC")
          .replace(/[^\p{L}\p{N}\s._/-]+/gu, " ")
          .replace(/\s+/g, " ")
          .trim()
      : "";
  if (raw.length < 3) {
    throw new FeynmanResearchWatchError(
      "Research watch topic must contain at least 3 characters.",
      "validation",
    );
  }
  if (raw.length > FEYNMAN_RESEARCH_WATCH_LIMITS.maximumTopicChars) {
    throw new FeynmanResearchWatchError(
      `Research watch topic must contain at most ${FEYNMAN_RESEARCH_WATCH_LIMITS.maximumTopicChars} characters.`,
      "validation",
    );
  }
  return raw;
}

export function buildFeynmanResearchWatchUrl(rawTopic: unknown) {
  const topic = normalizeFeynmanResearchWatchTopic(rawTopic);
  const url = new URL("https://export.arxiv.org/api/query");
  url.searchParams.set("search_query", `all:\"${topic}\"`);
  url.searchParams.set("start", "0");
  url.searchParams.set(
    "max_results",
    String(FEYNMAN_RESEARCH_WATCH_LIMITS.maximumResults),
  );
  url.searchParams.set("sortBy", "submittedDate");
  url.searchParams.set("sortOrder", "descending");
  return url;
}

function decodeXml(value: string) {
  const named: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    quot: '"',
  };
  return value.replace(
    /&(?:#(\d+)|#x([a-f\d]+)|([a-z]+));/gi,
    (entity, decimal: string, hexadecimal: string, name: string) => {
      const codePoint = decimal
        ? Number.parseInt(decimal, 10)
        : hexadecimal
          ? Number.parseInt(hexadecimal, 16)
          : Number.NaN;
      if (Number.isFinite(codePoint)) {
        try {
          return String.fromCodePoint(codePoint);
        } catch {
          return entity;
        }
      }
      return named[name?.toLowerCase()] ?? entity;
    },
  );
}

function cleanXmlText(value: string, maximumChars: number) {
  return boundedInline(
    decodeXml(
      value
        .replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/i, "$1")
        .replace(/<[^>]+>/g, " "),
    ),
    maximumChars,
  );
}

function readXmlTag(block: string, tag: string) {
  const match = block.match(
    new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"),
  );
  return match?.[1] ?? "";
}

function isIsoDate(value: string) {
  return Boolean(value) && Number.isFinite(Date.parse(value));
}

function parseArxivId(value: string) {
  const match = decodeXml(value)
    .trim()
    .match(/\/abs\/(.+?)\/?$/i);
  if (!match) {
    throw new FeynmanResearchWatchError(
      "arXiv feed entry is missing a canonical paper ID.",
      "parse",
    );
  }
  try {
    const reference = normalizeFeynmanPaperReference(match[1]);
    return {
      ...reference,
      id: reference.id.replace(/v[1-9]\d*$/i, ""),
    };
  } catch {
    throw new FeynmanResearchWatchError(
      "arXiv feed contains an invalid paper ID.",
      "parse",
    );
  }
}

export function parseFeynmanResearchWatchAtom(xml: string) {
  if (!xml.trim() || /<!DOCTYPE|<!ENTITY/i.test(xml)) {
    throw new FeynmanResearchWatchError(
      "arXiv returned unsafe or empty Atom evidence.",
      "parse",
    );
  }
  const blocks = Array.from(xml.matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry>/gi))
    .slice(0, FEYNMAN_RESEARCH_WATCH_LIMITS.maximumResults)
    .map((match) => match[1]);
  const entries = blocks.map((block) => {
    const reference = parseArxivId(readXmlTag(block, "id"));
    const title = cleanXmlText(readXmlTag(block, "title"), 300);
    const publishedAt = cleanXmlText(readXmlTag(block, "published"), 50);
    const updatedAt = cleanXmlText(readXmlTag(block, "updated"), 50);
    if (!title || !isIsoDate(publishedAt) || !isIsoDate(updatedAt)) {
      throw new FeynmanResearchWatchError(
        "arXiv feed entry is missing bounded title or timestamp evidence.",
        "parse",
      );
    }
    const authors = Array.from(
      block.matchAll(/<author\b[^>]*>([\s\S]*?)<\/author>/gi),
    )
      .map((match) => cleanXmlText(readXmlTag(match[1], "name"), 120))
      .filter(Boolean)
      .slice(0, 12);
    const categories = Array.from(
      block.matchAll(
        /<category\b[^>]*\bterm=(?:"([^"]*)"|'([^']*)')[^>]*\/?\s*>/gi,
      ),
    )
      .map((match) => cleanXmlText(match[1] ?? match[2] ?? "", 60))
      .filter(Boolean)
      .slice(0, 12);
    return {
      id: reference.id,
      title,
      authors,
      categories,
      summary: cleanXmlText(readXmlTag(block, "summary"), 800),
      sourceUrl: reference.sourceUrl,
      publishedAt: new Date(publishedAt).toISOString(),
      updatedAt: new Date(updatedAt).toISOString(),
    } satisfies FeynmanResearchWatchEntry;
  });
  if (new Set(entries.map((entry) => entry.id)).size !== entries.length) {
    throw new FeynmanResearchWatchError(
      "arXiv feed contains duplicate paper IDs.",
      "parse",
    );
  }
  return entries;
}

export function compareFeynmanResearchWatchEntries(
  previous: FeynmanResearchWatchEntry[],
  current: FeynmanResearchWatchEntry[],
) {
  const prior = new Map(previous.map((entry) => [entry.id, entry]));
  return current.flatMap<FeynmanResearchWatchChange>((entry) => {
    const known = prior.get(entry.id);
    if (!known) {
      return [{ kind: "new", entry, previousUpdatedAt: null }];
    }
    if (Date.parse(entry.updatedAt) > Date.parse(known.updatedAt)) {
      return [
        {
          kind: "updated",
          entry,
          previousUpdatedAt: known.updatedAt,
        },
      ];
    }
    return [];
  });
}

function validEntry(value: unknown): value is FeynmanResearchWatchEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<FeynmanResearchWatchEntry>;
  let referenceMatches = false;
  try {
    const sourceReference = normalizeFeynmanPaperReference(
      entry.sourceUrl ?? "",
    );
    referenceMatches =
      sourceReference.id.replace(/v[1-9]\d*$/i, "") === entry.id &&
      sourceReference.sourceUrl === entry.sourceUrl;
  } catch {
    referenceMatches = false;
  }
  return Boolean(
    referenceMatches &&
    typeof entry.title === "string" &&
    entry.title.length > 0 &&
    entry.title.length <= 300 &&
    Array.isArray(entry.authors) &&
    entry.authors.length <= 12 &&
    entry.authors.every((author) => typeof author === "string") &&
    Array.isArray(entry.categories) &&
    entry.categories.length <= 12 &&
    entry.categories.every((category) => typeof category === "string") &&
    typeof entry.summary === "string" &&
    entry.summary.length <= 800 &&
    typeof entry.publishedAt === "string" &&
    isIsoDate(entry.publishedAt) &&
    typeof entry.updatedAt === "string" &&
    isIsoDate(entry.updatedAt),
  );
}

function validReceipt(value: unknown): value is FeynmanResearchWatchReceipt {
  if (!value || typeof value !== "object") return false;
  const receipt = value as Partial<FeynmanResearchWatchReceipt>;
  return Boolean(
    Number.isFinite(receipt.checkedAt) &&
    ["baseline", "changed", "unchanged", "cached", "error"].includes(
      receipt.status ?? "",
    ) &&
    typeof receipt.cached === "boolean" &&
    Number.isInteger(receipt.entryCount) &&
    Number.isInteger(receipt.newCount) &&
    Number.isInteger(receipt.updatedCount) &&
    Array.isArray(receipt.changes) &&
    receipt.changes.length <= FEYNMAN_RESEARCH_WATCH_LIMITS.maximumResults &&
    receipt.changes.every(
      (change) =>
        change &&
        typeof change === "object" &&
        ["new", "updated"].includes(change.kind) &&
        validEntry(change.entry) &&
        (change.previousUpdatedAt === null ||
          (typeof change.previousUpdatedAt === "string" &&
            isIsoDate(change.previousUpdatedAt))),
    ) &&
    (receipt.error === null || typeof receipt.error === "string"),
  );
}

function validRecord(value: unknown): value is FeynmanResearchWatchRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<FeynmanResearchWatchRecord>;
  try {
    normalizeFeynmanResearchWatchId(record.id);
    normalizeFeynmanResearchWatchTopic(record.topic);
  } catch {
    return false;
  }
  return Boolean(
    record.version === 1 &&
    Number.isFinite(record.createdAt) &&
    Number.isFinite(record.lastCheckedAt) &&
    (record.lastFetchedAt === null || Number.isFinite(record.lastFetchedAt)) &&
    ["baseline", "changed", "unchanged", "cached", "error"].includes(
      record.lastStatus ?? "",
    ) &&
    (record.lastError === null || typeof record.lastError === "string") &&
    Array.isArray(record.current) &&
    record.current.length <= FEYNMAN_RESEARCH_WATCH_LIMITS.maximumResults &&
    record.current.every(validEntry) &&
    Array.isArray(record.history) &&
    record.history.length <=
      FEYNMAN_RESEARCH_WATCH_LIMITS.maximumReceiptsPerWatch &&
    record.history.every(validReceipt),
  );
}

async function readWatchFile(deps: FeynmanResearchWatchDeps = {}) {
  const { dataFile } = resolveDeps(deps);
  try {
    const parsed = JSON.parse(
      await readFile(dataFile, "utf8"),
    ) as Partial<FeynmanResearchWatchFile>;
    if (
      parsed.version !== 1 ||
      !Array.isArray(parsed.watches) ||
      parsed.watches.length > FEYNMAN_RESEARCH_WATCH_LIMITS.maximumWatches ||
      !parsed.watches.every(validRecord)
    ) {
      throw new Error("Invalid Feynman research-watch schema.");
    }
    return parsed.watches;
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return [];
    }
    throw new FeynmanResearchWatchError(
      "The local Feynman research-watch store could not be read safely.",
      "storage",
    );
  }
}

async function writeWatchFile(
  watches: FeynmanResearchWatchRecord[],
  deps: FeynmanResearchWatchDeps = {},
) {
  const { dataFile } = resolveDeps(deps);
  const temporaryFile = `${dataFile}.tmp`;
  try {
    await mkdir(path.dirname(dataFile), { recursive: true });
    await writeFile(
      temporaryFile,
      `${JSON.stringify({ version: 1, watches }, null, 2)}\n`,
      "utf8",
    );
    await rename(temporaryFile, dataFile);
  } catch {
    throw new FeynmanResearchWatchError(
      "The local Feynman research-watch store could not be saved.",
      "storage",
    );
  }
}

async function readBoundedAtom(url: URL, fetchImpl: typeof fetch) {
  let response: Response;
  try {
    response = await fetchImpl(url, {
      headers: {
        Accept: "application/atom+xml",
        "User-Agent": "NexusPrime/feynman-research-watch",
      },
      redirect: "error",
      signal: AbortSignal.timeout(FEYNMAN_RESEARCH_WATCH_LIMITS.timeoutMs),
    });
  } catch {
    throw new FeynmanResearchWatchError(
      "The public arXiv watch request failed.",
      "network",
    );
  }
  if (!response.ok) {
    throw new FeynmanResearchWatchError(
      `The public arXiv watch returned HTTP ${response.status}.`,
      "network",
    );
  }
  const contentLength = Number(response.headers.get("content-length") ?? "0");
  if (
    Number.isFinite(contentLength) &&
    contentLength > FEYNMAN_RESEARCH_WATCH_LIMITS.maximumResponseBytes
  ) {
    throw new FeynmanResearchWatchError(
      "The public arXiv watch response exceeded the evidence cap.",
      "parse",
    );
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
      if (total > FEYNMAN_RESEARCH_WATCH_LIMITS.maximumResponseBytes) {
        await reader.cancel();
        throw new FeynmanResearchWatchError(
          "The public arXiv watch response exceeded the evidence cap.",
          "parse",
        );
      }
      chunks.push(next.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

async function readCourtesyBoundedAtom(
  url: URL,
  fetchImpl: typeof fetch,
  sleep: (milliseconds: number) => Promise<void>,
) {
  const prior = arxivRequestQueue;
  let release: () => void = () => {};
  arxivRequestQueue = new Promise<void>((resolve) => {
    release = resolve;
  });
  await prior;
  try {
    const waitMs = Math.max(0, 3_000 - (Date.now() - lastArxivRequestAt));
    if (waitMs > 0) await sleep(waitMs);
    return await readBoundedAtom(url, fetchImpl);
  } finally {
    lastArxivRequestAt = Date.now();
    release();
  }
}

function nextRecord(input: {
  existing: FeynmanResearchWatchRecord | undefined;
  id: string;
  topic: string;
  entries: FeynmanResearchWatchEntry[];
  checkedAt: number;
  fetchedAt: number;
  cached: boolean;
}) {
  const { existing, id, topic, entries, checkedAt, fetchedAt, cached } = input;
  const changes = existing
    ? compareFeynmanResearchWatchEntries(existing.current, entries)
    : [];
  const newCount = changes.filter((change) => change.kind === "new").length;
  const updatedCount = changes.length - newCount;
  const status: FeynmanResearchWatchStatus = !existing
    ? "baseline"
    : cached && changes.length === 0
      ? "cached"
      : changes.length > 0
        ? "changed"
        : "unchanged";
  const receipt: FeynmanResearchWatchReceipt = {
    checkedAt,
    status,
    cached,
    entryCount: entries.length,
    newCount,
    updatedCount,
    changes,
    error: null,
  };
  return {
    version: 1,
    id,
    topic,
    createdAt: existing?.createdAt ?? checkedAt,
    lastCheckedAt: checkedAt,
    lastFetchedAt: fetchedAt,
    lastStatus: status,
    lastError: null,
    current: entries,
    history: [receipt, ...(existing?.history ?? [])].slice(
      0,
      FEYNMAN_RESEARCH_WATCH_LIMITS.maximumReceiptsPerWatch,
    ),
  } satisfies FeynmanResearchWatchRecord;
}

async function recordFailure(
  watches: FeynmanResearchWatchRecord[],
  input: { id: string; topic: string; checkedAt: number; message: string },
  deps: FeynmanResearchWatchDeps,
) {
  const existing = watches.find((watch) => watch.id === input.id);
  const error = boundedInline(input.message, 240);
  const receipt: FeynmanResearchWatchReceipt = {
    checkedAt: input.checkedAt,
    status: "error",
    cached: false,
    entryCount: existing?.current.length ?? 0,
    newCount: 0,
    updatedCount: 0,
    changes: [],
    error,
  };
  const failed: FeynmanResearchWatchRecord = {
    version: 1,
    id: input.id,
    topic: input.topic,
    createdAt: existing?.createdAt ?? input.checkedAt,
    lastCheckedAt: input.checkedAt,
    lastFetchedAt: existing?.lastFetchedAt ?? null,
    lastStatus: "error",
    lastError: error,
    current: existing?.current ?? [],
    history: [receipt, ...(existing?.history ?? [])].slice(
      0,
      FEYNMAN_RESEARCH_WATCH_LIMITS.maximumReceiptsPerWatch,
    ),
  };
  await writeWatchFile(
    [failed, ...watches.filter((watch) => watch.id !== input.id)].slice(
      0,
      FEYNMAN_RESEARCH_WATCH_LIMITS.maximumWatches,
    ),
    deps,
  );
}

export async function listFeynmanResearchWatches(
  deps: FeynmanResearchWatchDeps = {},
) {
  const watches = await readWatchFile(deps);
  return {
    watches: [...watches].sort(
      (left, right) => right.lastCheckedAt - left.lastCheckedAt,
    ),
    limits: FEYNMAN_RESEARCH_WATCH_LIMITS,
  };
}

export async function runFeynmanResearchWatch(
  input: { id: unknown; topic: unknown },
  deps: FeynmanResearchWatchDeps = {},
) {
  const id = normalizeFeynmanResearchWatchId(input.id);
  const topic = normalizeFeynmanResearchWatchTopic(input.topic);
  const resolved = resolveDeps(deps);
  const checkedAt = resolved.now();
  const watches = await readWatchFile(deps);
  const existing = watches.find((watch) => watch.id === id);
  if (existing && existing.topic !== topic) {
    throw new FeynmanResearchWatchError(
      "A scheduled watch ID cannot be reassigned to a different topic.",
      "validation",
    );
  }
  const cachedSource = watches.find(
    (watch) =>
      watch.topic === topic &&
      watch.lastFetchedAt !== null &&
      checkedAt - watch.lastFetchedAt < FEYNMAN_RESEARCH_WATCH_LIMITS.cacheMs,
  );
  if (cachedSource && cachedSource.lastFetchedAt !== null) {
    const record = nextRecord({
      existing,
      id,
      topic,
      entries: cachedSource.current,
      checkedAt,
      fetchedAt: cachedSource.lastFetchedAt,
      cached: true,
    });
    await writeWatchFile(
      [record, ...watches.filter((watch) => watch.id !== id)].slice(
        0,
        FEYNMAN_RESEARCH_WATCH_LIMITS.maximumWatches,
      ),
      deps,
    );
    return { watch: record, receipt: record.history[0], networkUsed: false };
  }

  let entries: FeynmanResearchWatchEntry[];
  try {
    entries = parseFeynmanResearchWatchAtom(
      await readCourtesyBoundedAtom(
        buildFeynmanResearchWatchUrl(topic),
        resolved.fetchImpl,
        resolved.sleep,
      ),
    );
  } catch (error) {
    const watchError =
      error instanceof FeynmanResearchWatchError
        ? error
        : new FeynmanResearchWatchError(
            "The public arXiv watch evidence could not be processed.",
            "parse",
          );
    await recordFailure(
      watches,
      { id, topic, checkedAt, message: watchError.message },
      deps,
    );
    throw watchError;
  }

  const record = nextRecord({
    existing,
    id,
    topic,
    entries,
    checkedAt,
    fetchedAt: checkedAt,
    cached: false,
  });
  await writeWatchFile(
    [record, ...watches.filter((watch) => watch.id !== id)].slice(
      0,
      FEYNMAN_RESEARCH_WATCH_LIMITS.maximumWatches,
    ),
    deps,
  );
  return { watch: record, receipt: record.history[0], networkUsed: true };
}
