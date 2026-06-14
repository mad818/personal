export type HuggingFaceRepoType = "model" | "dataset";

export type HuggingFaceReference = {
  repoType: HuggingFaceRepoType;
  repoId: string;
  sourceUrl: string;
};

export type HuggingFaceRepoFile = {
  path: string;
  type: "file" | "directory";
  size: number | null;
};

export type HuggingFaceDatasetSplit = {
  name: string;
  examples: number | null;
  bytes: number | null;
};

export type HuggingFaceDatasetConfiguration = {
  name: string;
  features: string[];
  splits: HuggingFaceDatasetSplit[];
};

export type HuggingFaceInspection = HuggingFaceReference & {
  access: {
    private: boolean;
    gated: boolean;
    disabled: boolean;
  };
  metadata: {
    downloads: number | null;
    likes: number | null;
    license: string | null;
    pipelineTag: string | null;
    libraryName: string | null;
    tags: string[];
  };
  files: HuggingFaceRepoFile[];
  datasetStructure: HuggingFaceDatasetConfiguration[];
  warnings: string[];
};

export type HuggingFaceInspectionDeps = {
  fetchImpl?: typeof fetch;
};

export const HUGGING_FACE_INSPECTION_LIMITS = {
  maximumRepoIdLength: 180,
  maximumFiles: 40,
  maximumTags: 20,
  maximumDatasetConfigurations: 8,
  maximumSplitsPerConfiguration: 12,
  maximumFeaturesPerConfiguration: 30,
  maximumTextFileBytes: 64 * 1024,
  maximumJsonBytes: 256 * 1024,
  maximumFormattedChars: 12_000,
  timeoutMs: 10_000,
} as const;

const HUB_ORIGIN = "https://huggingface.co";
const DATASET_SERVER_ORIGIN = "https://datasets-server.huggingface.co";
const HUGGING_FACE_USER_AGENT = "NexusPrime/hugging-face-inspection";
const REPO_SEGMENT_RE = /^[A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?$/;
const SAFE_TEXT_EXTENSIONS = new Set([
  ".cfg",
  ".conf",
  ".css",
  ".csv",
  ".html",
  ".ini",
  ".js",
  ".json",
  ".jsonl",
  ".jsx",
  ".md",
  ".py",
  ".rst",
  ".toml",
  ".ts",
  ".tsv",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml",
]);
const SAFE_EXTENSIONLESS_FILES = new Set([
  "authors",
  "changelog",
  "citation",
  "codeowners",
  "license",
  "makefile",
  "notice",
  "readme",
]);

function cleanInline(value: unknown, max = 180) {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  return normalized.length <= max
    ? normalized
    : `${normalized.slice(0, max - 1).trimEnd()}…`;
}

function optionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeRepoId(rawRepoId: string) {
  const repoId = decodeURIComponent(rawRepoId).trim().replace(/\/+$/, "");
  if (
    !repoId ||
    repoId.length > HUGGING_FACE_INSPECTION_LIMITS.maximumRepoIdLength ||
    repoId.includes("\\") ||
    repoId.includes("..") ||
    repoId.includes("?") ||
    repoId.includes("#")
  ) {
    throw new Error("Hugging Face repository reference is invalid.");
  }
  const segments = repoId.split("/");
  if (
    segments.length < 1 ||
    segments.length > 2 ||
    !segments.every((segment) => REPO_SEGMENT_RE.test(segment))
  ) {
    throw new Error(
      'Hugging Face repository reference must use a public "repo" or "owner/repo" ID.',
    );
  }
  return repoId;
}

function buildSourceUrl(repoType: HuggingFaceRepoType, repoId: string) {
  return repoType === "dataset"
    ? `${HUB_ORIGIN}/datasets/${repoId}`
    : `${HUB_ORIGIN}/${repoId}`;
}

export function normalizeHuggingFaceReference(
  rawReference: string,
  explicitRepoType?: HuggingFaceRepoType,
): HuggingFaceReference {
  const raw = rawReference.trim();
  if (!raw) throw new Error("Hugging Face repository reference is required.");

  let repoType = explicitRepoType ?? "model";
  let rawRepoId = raw;
  if (/^https?:\/\//i.test(raw)) {
    let parsed: URL;
    try {
      parsed = new URL(raw);
    } catch {
      throw new Error("Hugging Face repository URL is invalid.");
    }
    if (
      parsed.protocol !== "https:" ||
      parsed.hostname.toLowerCase() !== "huggingface.co" ||
      parsed.username ||
      parsed.password ||
      parsed.port ||
      parsed.search ||
      parsed.hash
    ) {
      throw new Error("Only credential-free public huggingface.co URLs are allowed.");
    }
    const segments = parsed.pathname.split("/").filter(Boolean);
    if (segments[0]?.toLowerCase() === "datasets") {
      repoType = "dataset";
      rawRepoId = segments.slice(1).join("/");
    } else {
      repoType = explicitRepoType ?? "model";
      rawRepoId = segments.join("/");
    }
  } else if (raw.toLowerCase().startsWith("datasets/")) {
    repoType = "dataset";
    rawRepoId = raw.slice("datasets/".length);
  } else if (raw.toLowerCase().startsWith("models/")) {
    repoType = "model";
    rawRepoId = raw.slice("models/".length);
  }

  const repoId = normalizeRepoId(rawRepoId);
  return {
    repoType,
    repoId,
    sourceUrl: buildSourceUrl(repoType, repoId),
  };
}

export function findHuggingFaceReference(value: string) {
  const urlMatch = value.match(
    /https:\/\/huggingface\.co\/(?:datasets\/)?[A-Za-z0-9][A-Za-z0-9._-]*(?:\/[A-Za-z0-9][A-Za-z0-9._-]*)?/i,
  );
  if (!urlMatch?.[0]) return null;
  try {
    return normalizeHuggingFaceReference(urlMatch[0]);
  } catch {
    return null;
  }
}

function safeRequestInit(): RequestInit {
  return {
    headers: {
      Accept: "application/json, text/plain;q=0.9",
      "User-Agent": HUGGING_FACE_USER_AGENT,
    },
    signal: AbortSignal.timeout(HUGGING_FACE_INSPECTION_LIMITS.timeoutMs),
    cache: "no-store",
  };
}

async function readResponseBytes(response: Response, maximumBytes: number) {
  const contentLength = Number(response.headers.get("content-length") ?? "0");
  if (contentLength > maximumBytes) {
    throw new Error(`Hugging Face response exceeded the ${maximumBytes}-byte limit.`);
  }
  if (!response.body) return new Uint8Array();

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
        throw new Error(
          `Hugging Face response exceeded the ${maximumBytes}-byte limit.`,
        );
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
  return result;
}

async function readJson(
  url: string,
  deps: HuggingFaceInspectionDeps,
): Promise<unknown> {
  const response = await (deps.fetchImpl ?? fetch)(url, safeRequestInit());
  if (!response.ok) {
    throw new Error(`Hugging Face public API returned HTTP ${response.status}.`);
  }
  const bytes = await readResponseBytes(
    response,
    HUGGING_FACE_INSPECTION_LIMITS.maximumJsonBytes,
  );
  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  } catch {
    throw new Error("Hugging Face public API returned invalid JSON.");
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeTags(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => cleanInline(entry, 80))
    .filter(Boolean)
    .slice(0, HUGGING_FACE_INSPECTION_LIMITS.maximumTags);
}

function normalizeLicense(metadata: Record<string, unknown>) {
  const cardData = asRecord(metadata.cardData);
  const direct = cleanInline(cardData.license ?? metadata.license, 80);
  if (direct) return direct;
  const licenseTag = normalizeTags(metadata.tags).find((tag) =>
    tag.startsWith("license:"),
  );
  return licenseTag?.slice("license:".length) || null;
}

function normalizeFiles(value: unknown): HuggingFaceRepoFile[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => asRecord(entry))
    .map((entry) => {
      const filePath = cleanInline(entry.path ?? entry.rfilename, 240);
      const rawType = cleanInline(entry.type, 20).toLowerCase();
      return {
        path: filePath,
        type: rawType === "directory" || rawType === "dir" ? "directory" : "file",
        size: optionalNumber(entry.size),
      } satisfies HuggingFaceRepoFile;
    })
    .filter(
      (entry) =>
        Boolean(entry.path) &&
        !entry.path.includes("\\") &&
        !entry.path.split("/").includes(".."),
    )
    .slice(0, HUGGING_FACE_INSPECTION_LIMITS.maximumFiles);
}

function normalizeFeatures(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        const feature = asRecord(entry);
        return cleanInline(
          feature.name
            ? `${feature.name}: ${feature.dtype ?? feature._type ?? "unknown"}`
            : JSON.stringify(feature),
          140,
        );
      })
      .filter(Boolean)
      .slice(0, HUGGING_FACE_INSPECTION_LIMITS.maximumFeaturesPerConfiguration);
  }
  return Object.entries(asRecord(value))
    .map(([name, definition]) => {
      const record = asRecord(definition);
      return cleanInline(
        `${name}: ${record.dtype ?? record._type ?? cleanInline(JSON.stringify(definition), 80)}`,
        140,
      );
    })
    .slice(0, HUGGING_FACE_INSPECTION_LIMITS.maximumFeaturesPerConfiguration);
}

function normalizeSplits(value: unknown): HuggingFaceDatasetSplit[] {
  const rows = Array.isArray(value)
    ? value.map((entry, index) => [String(index), entry] as const)
    : Object.entries(asRecord(value));
  return rows
    .map(([fallbackName, rawSplit]) => {
      const split = asRecord(rawSplit);
      return {
        name: cleanInline(split.name ?? fallbackName, 100),
        examples: optionalNumber(split.num_examples ?? split.numRows),
        bytes: optionalNumber(split.num_bytes ?? split.numBytes),
      };
    })
    .filter((split) => Boolean(split.name))
    .slice(0, HUGGING_FACE_INSPECTION_LIMITS.maximumSplitsPerConfiguration);
}

function normalizeDatasetStructure(value: unknown) {
  const root = asRecord(value);
  const datasetInfo = asRecord(root.dataset_info ?? root.datasetInfo);
  return Object.entries(datasetInfo)
    .map(([name, rawConfiguration]) => {
      const configuration = asRecord(rawConfiguration);
      return {
        name: cleanInline(name, 100),
        features: normalizeFeatures(configuration.features),
        splits: normalizeSplits(configuration.splits),
      } satisfies HuggingFaceDatasetConfiguration;
    })
    .slice(0, HUGGING_FACE_INSPECTION_LIMITS.maximumDatasetConfigurations);
}

function metadataUrl(reference: HuggingFaceReference) {
  const kind = reference.repoType === "dataset" ? "datasets" : "models";
  return `${HUB_ORIGIN}/api/${kind}/${reference.repoId}`;
}

function treeUrl(reference: HuggingFaceReference) {
  const kind = reference.repoType === "dataset" ? "datasets" : "models";
  return `${HUB_ORIGIN}/api/${kind}/${reference.repoId}/tree/main?recursive=false&expand=false`;
}

function datasetInfoUrl(reference: HuggingFaceReference) {
  return `${DATASET_SERVER_ORIGIN}/info?dataset=${encodeURIComponent(reference.repoId)}`;
}

export async function inspectHuggingFaceRepository(
  reference: HuggingFaceReference,
  deps: HuggingFaceInspectionDeps = {},
): Promise<HuggingFaceInspection> {
  const normalized = normalizeHuggingFaceReference(
    reference.repoId,
    reference.repoType,
  );
  const metadataPromise = readJson(metadataUrl(normalized), deps);
  const treePromise = readJson(treeUrl(normalized), deps);
  const datasetInfoPromise =
    normalized.repoType === "dataset"
      ? readJson(datasetInfoUrl(normalized), deps)
      : Promise.resolve(null);
  const [metadataResult, treeResult, datasetInfoResult] =
    await Promise.allSettled([
      metadataPromise,
      treePromise,
      datasetInfoPromise,
    ]);

  if (metadataResult.status === "rejected") {
    throw metadataResult.reason instanceof Error
      ? metadataResult.reason
      : new Error("Hugging Face repository metadata was unavailable.");
  }
  const metadata = asRecord(metadataResult.value);
  const warnings: string[] = [];
  if (treeResult.status === "rejected") {
    warnings.push("Repository file listing was unavailable.");
  }
  if (datasetInfoResult.status === "rejected") {
    warnings.push("Dataset split and schema information was unavailable.");
  }

  return {
    ...normalized,
    access: {
      private: metadata.private === true,
      gated: Boolean(metadata.gated),
      disabled: metadata.disabled === true,
    },
    metadata: {
      downloads: optionalNumber(metadata.downloads),
      likes: optionalNumber(metadata.likes),
      license: normalizeLicense(metadata),
      pipelineTag: cleanInline(metadata.pipeline_tag, 100) || null,
      libraryName: cleanInline(metadata.library_name, 100) || null,
      tags: normalizeTags(metadata.tags),
    },
    files:
      treeResult.status === "fulfilled" ? normalizeFiles(treeResult.value) : [],
    datasetStructure:
      datasetInfoResult.status === "fulfilled"
        ? normalizeDatasetStructure(datasetInfoResult.value)
        : [],
    warnings,
  };
}

function normalizeTextFilePath(rawPath: string) {
  const filePath = decodeURIComponent(rawPath).trim().replace(/\\/g, "/");
  const segments = filePath.split("/");
  if (
    !filePath ||
    filePath.length > 240 ||
    filePath.startsWith("/") ||
    filePath.endsWith("/") ||
    filePath.includes("?") ||
    filePath.includes("#") ||
    segments.some((segment) => !segment || segment === "." || segment === "..") ||
    segments.some((segment) => segment.toLowerCase() === ".git")
  ) {
    throw new Error("Hugging Face text-file path is invalid.");
  }
  const fileName = segments.at(-1)?.toLowerCase() ?? "";
  const extensionMatch = fileName.match(/(\.[a-z0-9]+)$/);
  const extension = extensionMatch?.[1] ?? "";
  if (
    !SAFE_TEXT_EXTENSIONS.has(extension) &&
    !SAFE_EXTENSIONLESS_FILES.has(fileName)
  ) {
    throw new Error("Only allowlisted small text files can be read.");
  }
  return filePath;
}

export async function readHuggingFaceTextFile(
  reference: HuggingFaceReference,
  rawPath: string,
  deps: HuggingFaceInspectionDeps = {},
) {
  const normalized = normalizeHuggingFaceReference(
    reference.repoId,
    reference.repoType,
  );
  const filePath = normalizeTextFilePath(rawPath);
  const prefix = normalized.repoType === "dataset" ? "datasets/" : "";
  const url = `${HUB_ORIGIN}/${prefix}${normalized.repoId}/resolve/main/${filePath}`;
  const response = await (deps.fetchImpl ?? fetch)(url, {
    ...safeRequestInit(),
    headers: {
      Accept: "text/plain, application/json;q=0.9",
      "User-Agent": HUGGING_FACE_USER_AGENT,
    },
    redirect: "follow",
  });
  if (!response.ok) {
    throw new Error(`Hugging Face text-file read returned HTTP ${response.status}.`);
  }
  const bytes = await readResponseBytes(
    response,
    HUGGING_FACE_INSPECTION_LIMITS.maximumTextFileBytes,
  );
  const content = new TextDecoder("utf-8", { fatal: true }).decode(bytes).trim();
  return {
    ...normalized,
    path: filePath,
    url: `${normalized.sourceUrl}/blob/main/${filePath}`,
    content,
    bytes: bytes.byteLength,
  };
}

export function formatHuggingFaceInspection(inspection: HuggingFaceInspection) {
  const access = [
    inspection.access.private ? "private" : "public",
    inspection.access.gated ? "gated" : "ungated",
    inspection.access.disabled ? "disabled" : "enabled",
  ].join(", ");
  const structure =
    inspection.datasetStructure.length > 0
      ? inspection.datasetStructure
          .map(
            (configuration) =>
              `- ${configuration.name}: splits ${configuration.splits.map((split) => split.name).join(", ") || "unknown"}; features ${configuration.features.join(", ") || "unknown"}`,
          )
          .join("\n")
      : "- No bounded dataset split/schema information available.";
  const files =
    inspection.files.length > 0
      ? inspection.files
          .map(
            (file) =>
              `- ${file.type}: ${file.path}${file.size === null ? "" : ` (${file.size} bytes)`}`,
          )
          .join("\n")
      : "- No bounded top-level file listing available.";
  const receipt = [
    `Hugging Face ${inspection.repoType} inspection`,
    `Source: ${inspection.sourceUrl}`,
    `Repository: ${inspection.repoId}`,
    `Access: ${access}`,
    `Downloads: ${inspection.metadata.downloads ?? "unknown"}`,
    `Likes: ${inspection.metadata.likes ?? "unknown"}`,
    `License: ${inspection.metadata.license ?? "unknown"}`,
    `Pipeline: ${inspection.metadata.pipelineTag ?? "unknown"}`,
    `Library: ${inspection.metadata.libraryName ?? "unknown"}`,
    `Tags: ${inspection.metadata.tags.join(", ") || "none"}`,
    "",
    "Dataset structure:",
    structure,
    "",
    "Bounded files:",
    files,
    "",
    `Warnings: ${inspection.warnings.join(" | ") || "none"}`,
  ].join("\n");
  if (receipt.length <= HUGGING_FACE_INSPECTION_LIMITS.maximumFormattedChars) {
    return receipt;
  }
  const suffix = "\n[Receipt truncated at the bounded evidence limit.]";
  return `${receipt.slice(
    0,
    HUGGING_FACE_INSPECTION_LIMITS.maximumFormattedChars - suffix.length,
  )}${suffix}`;
}

export async function inspectHuggingFaceTopic(
  topic: string,
  deps: HuggingFaceInspectionDeps = {},
) {
  const reference = findHuggingFaceReference(topic);
  if (!reference) return null;
  const inspection = await inspectHuggingFaceRepository(reference, deps);
  return {
    url: reference.sourceUrl,
    content: formatHuggingFaceInspection(inspection),
  };
}
