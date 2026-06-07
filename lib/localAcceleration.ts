export type TurboQuantMode = "off" | "capture_only" | "hybrid";
export type TurboVecControlOperation =
  | "prepare"
  | "persist"
  | "reload"
  | "rebuild";
export type TurboQuantControlOperation =
  | "capabilities"
  | "limitations"
  | "stats"
  | "validate"
  | "audit"
  | "test"
  | "benchmark";
export const TURBOQUANT_EXEC_CONFIRMATION = "RUN_TURBOQUANT_LOCAL_COMMAND";

export interface LocalAccelerationConfig {
  allowTailnet: boolean;
  turboVec: {
    enabled: boolean;
    endpoint: string;
    bitWidth: 2 | 3 | 4;
    timeoutMs: number;
  };
  turboQuant: {
    enabled: boolean;
    endpoint: string;
    openAiEndpoint: string;
    model: string;
    mode: TurboQuantMode;
    keyBits: 2 | 3 | 4;
    valueBits: 2 | 4;
    timeoutMs: number;
  };
}

export interface TurboVecDocument {
  id: string;
  text: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface TurboVecSearchInput {
  query: string;
  limit?: number;
  allowlist?: string[];
  filters?: {
    routes?: string[];
    tags?: string[];
    domains?: string[];
    createdAfter?: number;
    createdBefore?: number;
  };
}

export interface TurboVecMatch {
  id: string;
  score: number;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface AccelerationRuntimeStatus {
  enabled: boolean;
  available: boolean;
  endpointClass: "loopback" | "tailnet" | "invalid";
  engine: string;
  mode?: TurboQuantMode;
  bitWidth?: 2 | 3 | 4;
  keyBits?: 2 | 3 | 4;
  valueBits?: 2 | 4;
  stats: Record<string, unknown> | null;
  error: string | null;
}

export interface LocalAccelerationStatus {
  turboVec: AccelerationRuntimeStatus;
  turboQuant: AccelerationRuntimeStatus;
}

interface LocalAccelerationDeps {
  fetch?: typeof fetch;
  env?: LocalAccelerationConfig;
}

const DEFAULT_TURBOVEC_ENDPOINT = "http://127.0.0.1:5052";
const DEFAULT_TURBOQUANT_ENDPOINT = "http://127.0.0.1:5052";
const DEFAULT_TURBOQUANT_OPENAI_ENDPOINT =
  "http://127.0.0.1:8000/v1/chat/completions";
const MAX_DOCUMENTS_PER_REQUEST = 64;
const MAX_DOCUMENT_CHARS = 32_000;
const MAX_QUERY_CHARS = 4_000;
const MAX_ALLOWLIST_IDS = 4_096;

function envBool(value: string | undefined, fallback = false) {
  if (typeof value !== "string") return fallback;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function boundedInt(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function bitWidth(value: string | undefined, fallback: 2 | 3 | 4): 2 | 3 | 4 {
  const parsed = Number.parseInt(value ?? "", 10);
  return parsed === 2 || parsed === 3 || parsed === 4 ? parsed : fallback;
}

function valueBitWidth(value: string | undefined, fallback: 2 | 4): 2 | 4 {
  const parsed = Number.parseInt(value ?? "", 10);
  return parsed === 2 || parsed === 4 ? parsed : fallback;
}

function turboQuantMode(value: string | undefined): TurboQuantMode {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "capture_only" || normalized === "hybrid") return normalized;
  return "off";
}

function cleanEndpoint(raw: string, fallback: string) {
  return raw.trim() || fallback;
}

export function validateLocalAccelerationEndpoint(
  rawEndpoint: string,
  allowTailnet: boolean,
) {
  let parsed: URL;
  try {
    parsed = new URL(rawEndpoint);
  } catch {
    throw new Error("Local acceleration endpoint is invalid.");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Local acceleration endpoint must use HTTP or HTTPS.");
  }
  if (parsed.username || parsed.password) {
    throw new Error("Credential-bearing local acceleration endpoints are blocked.");
  }
  const host = parsed.hostname.toLowerCase();
  const loopback =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host === "[::1]";
  const tailnet = host.endsWith(".ts.net");
  if (!loopback && !(allowTailnet && tailnet)) {
    throw new Error(
      "Local acceleration endpoint must be loopback unless tailnet access is explicitly enabled.",
    );
  }
  return parsed;
}

function endpointClass(
  endpoint: string,
  allowTailnet: boolean,
): "loopback" | "tailnet" | "invalid" {
  try {
    const parsed = validateLocalAccelerationEndpoint(endpoint, allowTailnet);
    return parsed.hostname.toLowerCase().endsWith(".ts.net")
      ? "tailnet"
      : "loopback";
  } catch {
    return "invalid";
  }
}

export function readLocalAccelerationConfig(
  env: Record<string, string | undefined> = process.env,
): LocalAccelerationConfig {
  const allowTailnet = envBool(env.NEXUS_LOCAL_ACCELERATION_ALLOW_TAILNET);
  const tqMode = turboQuantMode(env.NEXUS_TURBOQUANT_MODE);
  return {
    allowTailnet,
    turboVec: {
      enabled: envBool(env.NEXUS_TURBOVEC_ENABLED),
      endpoint: cleanEndpoint(
        env.NEXUS_TURBOVEC_ENDPOINT ?? "",
        DEFAULT_TURBOVEC_ENDPOINT,
      ),
      bitWidth: bitWidth(env.NEXUS_TURBOVEC_BIT_WIDTH, 4),
      timeoutMs: boundedInt(env.NEXUS_TURBOVEC_TIMEOUT_MS, 4_000, 500, 30_000),
    },
    turboQuant: {
      enabled: envBool(env.NEXUS_TURBOQUANT_ENABLED) && tqMode !== "off",
      endpoint: cleanEndpoint(
        env.NEXUS_TURBOQUANT_ENDPOINT ?? "",
        DEFAULT_TURBOQUANT_ENDPOINT,
      ),
      openAiEndpoint: cleanEndpoint(
        env.NEXUS_TURBOQUANT_OPENAI_ENDPOINT ?? "",
        DEFAULT_TURBOQUANT_OPENAI_ENDPOINT,
      ),
      model: (env.NEXUS_TURBOQUANT_MODEL ?? "local-turboquant").trim(),
      mode: tqMode,
      keyBits: bitWidth(env.NEXUS_TURBOQUANT_KEY_BITS, 3),
      valueBits: valueBitWidth(env.NEXUS_TURBOQUANT_VALUE_BITS, 4),
      timeoutMs: boundedInt(
        env.NEXUS_TURBOQUANT_TIMEOUT_MS,
        8_000,
        500,
        120_000,
      ),
    },
  };
}

function resolveDeps(deps?: LocalAccelerationDeps) {
  return {
    fetchImpl: deps?.fetch ?? fetch,
    config: deps?.env ?? readLocalAccelerationConfig(),
  };
}

function operationUrl(
  endpoint: string,
  engine: "turbovec" | "turboquant",
  operation: string,
  allowTailnet: boolean,
) {
  const parsed = validateLocalAccelerationEndpoint(endpoint, allowTailnet);
  parsed.pathname = `/${engine}/${operation}`;
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString();
}

async function fetchJson(
  fetchImpl: typeof fetch,
  url: string,
  timeoutMs: number,
  init?: RequestInit,
) {
  const response = await fetchImpl(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) {
    throw new Error(`Local acceleration runtime returned HTTP ${response.status}.`);
  }
  return (await response.json()) as Record<string, unknown>;
}

function sanitizeId(value: string) {
  const normalized = value.trim();
  if (!normalized || normalized.length > 240) {
    throw new Error("Local acceleration IDs must contain 1-240 characters.");
  }
  return normalized;
}

function sanitizeDocuments(documents: TurboVecDocument[]) {
  if (!Array.isArray(documents) || documents.length === 0) {
    throw new Error("At least one TurboVec document is required.");
  }
  if (documents.length > MAX_DOCUMENTS_PER_REQUEST) {
    throw new Error(`TurboVec upsert accepts at most ${MAX_DOCUMENTS_PER_REQUEST} documents.`);
  }
  return documents.map((document) => {
    const text = document.text.trim();
    if (!text || text.length > MAX_DOCUMENT_CHARS) {
      throw new Error(`TurboVec document text must contain 1-${MAX_DOCUMENT_CHARS} characters.`);
    }
    return {
      id: sanitizeId(document.id),
      text,
      metadata: document.metadata ?? {},
    };
  });
}

function sanitizeIds(ids: string[]) {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error("At least one TurboVec ID is required.");
  }
  if (ids.length > MAX_ALLOWLIST_IDS) {
    throw new Error(`TurboVec accepts at most ${MAX_ALLOWLIST_IDS} IDs per request.`);
  }
  return Array.from(new Set(ids.map(sanitizeId)));
}

export async function turboVecUpsert(
  documents: TurboVecDocument[],
  deps?: LocalAccelerationDeps,
) {
  const { fetchImpl, config } = resolveDeps(deps);
  if (!config.turboVec.enabled) throw new Error("TurboVec is disabled.");
  return fetchJson(
    fetchImpl,
    operationUrl(
      config.turboVec.endpoint,
      "turbovec",
      "upsert",
      config.allowTailnet,
    ),
    config.turboVec.timeoutMs,
    {
      method: "POST",
      body: JSON.stringify({
        bitWidth: config.turboVec.bitWidth,
        documents: sanitizeDocuments(documents),
      }),
    },
  );
}

export async function turboVecSearch(
  input: TurboVecSearchInput,
  deps?: LocalAccelerationDeps,
): Promise<TurboVecMatch[]> {
  const { fetchImpl, config } = resolveDeps(deps);
  if (!config.turboVec.enabled) return [];
  const query = input.query.trim();
  if (!query || query.length > MAX_QUERY_CHARS) {
    throw new Error(`TurboVec query must contain 1-${MAX_QUERY_CHARS} characters.`);
  }
  const limit = Math.max(1, Math.min(100, Math.floor(input.limit ?? 12)));
  const payload = await fetchJson(
    fetchImpl,
    operationUrl(
      config.turboVec.endpoint,
      "turbovec",
      "search",
      config.allowTailnet,
    ),
    config.turboVec.timeoutMs,
    {
      method: "POST",
      body: JSON.stringify({
        query,
        limit,
        allowlist: input.allowlist ? sanitizeIds(input.allowlist) : undefined,
        filters: input.filters ?? {},
      }),
    },
  );
  const matches = Array.isArray(payload.matches) ? payload.matches : [];
  return matches
    .map((match) => match as Partial<TurboVecMatch>)
    .filter(
      (match): match is TurboVecMatch =>
        typeof match.id === "string" && typeof match.score === "number",
    )
    .slice(0, limit);
}

export async function turboVecRemove(
  ids: string[],
  deps?: LocalAccelerationDeps,
) {
  const { fetchImpl, config } = resolveDeps(deps);
  if (!config.turboVec.enabled) throw new Error("TurboVec is disabled.");
  return fetchJson(
    fetchImpl,
    operationUrl(
      config.turboVec.endpoint,
      "turbovec",
      "remove",
      config.allowTailnet,
    ),
    config.turboVec.timeoutMs,
    { method: "POST", body: JSON.stringify({ ids: sanitizeIds(ids) }) },
  );
}

export async function turboVecControl(
  operation: TurboVecControlOperation,
  deps?: LocalAccelerationDeps,
) {
  const { fetchImpl, config } = resolveDeps(deps);
  if (!config.turboVec.enabled) throw new Error("TurboVec is disabled.");
  return fetchJson(
    fetchImpl,
    operationUrl(
      config.turboVec.endpoint,
      "turbovec",
      operation,
      config.allowTailnet,
    ),
    config.turboVec.timeoutMs,
    { method: "POST", body: JSON.stringify({ bitWidth: config.turboVec.bitWidth }) },
  );
}

export async function turboQuantControl(
  operation: TurboQuantControlOperation,
  options: { confirmation?: string } = {},
  deps?: LocalAccelerationDeps,
) {
  const { fetchImpl, config } = resolveDeps(deps);
  if (!config.turboQuant.enabled) throw new Error("TurboQuant is disabled.");
  return fetchJson(
    fetchImpl,
    operationUrl(
      config.turboQuant.endpoint,
      "turboquant",
      operation,
      config.allowTailnet,
    ),
    config.turboQuant.timeoutMs,
    {
      method: operation === "capabilities" || operation === "limitations" || operation === "stats"
        ? "GET"
        : "POST",
      body:
        operation === "capabilities" || operation === "limitations" || operation === "stats"
          ? undefined
          : JSON.stringify({
              mode: config.turboQuant.mode,
              keyBits: config.turboQuant.keyBits,
              valueBits: config.turboQuant.valueBits,
              confirmation: options.confirmation,
            }),
    },
  );
}

async function runtimeStatus(
  engine: "turbovec" | "turboquant",
  deps?: LocalAccelerationDeps,
): Promise<AccelerationRuntimeStatus> {
  const { fetchImpl, config } = resolveDeps(deps);
  const runtime = engine === "turbovec" ? config.turboVec : config.turboQuant;
  const enabled = runtime.enabled;
  const base: AccelerationRuntimeStatus = {
    enabled,
    available: false,
    endpointClass: endpointClass(runtime.endpoint, config.allowTailnet),
    engine,
    stats: null,
    error: null,
    ...(engine === "turbovec"
      ? { bitWidth: config.turboVec.bitWidth }
      : {
          mode: config.turboQuant.mode,
          keyBits: config.turboQuant.keyBits,
          valueBits: config.turboQuant.valueBits,
        }),
  };
  if (!enabled) return base;
  try {
    const [health, stats] = await Promise.all([
      fetchJson(
        fetchImpl,
        operationUrl(runtime.endpoint, engine, "health", config.allowTailnet),
        runtime.timeoutMs,
      ),
      fetchJson(
        fetchImpl,
        operationUrl(runtime.endpoint, engine, "stats", config.allowTailnet),
        runtime.timeoutMs,
      ),
    ]);
    return {
      ...base,
      available: health.status === "ok" || health.available === true,
      engine: typeof health.engine === "string" ? health.engine : engine,
      stats,
    };
  } catch (error) {
    return {
      ...base,
      error:
        error instanceof Error
          ? error.message.slice(0, 180)
          : "Local acceleration runtime unavailable.",
    };
  }
}

export async function getLocalAccelerationStatus(deps?: LocalAccelerationDeps) {
  const [turboVec, turboQuant] = await Promise.all([
    runtimeStatus("turbovec", deps),
    runtimeStatus("turboquant", deps),
  ]);
  return { turboVec, turboQuant } satisfies LocalAccelerationStatus;
}
