import {
  type FearGreedEntry,
  type FearGreedResponse,
} from "./fearGreedTypes.ts";

type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

export interface FearGreedServerOptions {
  fetchImpl?: FetchLike;
  timeoutMs?: number;
  maxResponseBytes?: number;
}

export interface FearGreedExecution {
  status: number;
  body: FearGreedResponse;
}

class FearGreedProviderFailure extends Error {
  constructor() {
    super("fear_greed_provider_unavailable");
    this.name = "FearGreedProviderFailure";
  }
}

const FEAR_GREED_URL = "https://api.alternative.me/fng/?limit=30&format=json";
const DEFAULT_TIMEOUT_MS = 8_000;
const DEFAULT_MAX_RESPONSE_BYTES = 128 * 1024;
const FEAR_GREED_UNAVAILABLE =
  "Fear & Greed sentiment is temporarily unavailable.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function resolveOptions(options: FearGreedServerOptions) {
  return {
    fetchImpl: options.fetchImpl ?? fetch,
    timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    maxResponseBytes: options.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES,
  };
}

async function readBoundedText(response: Response, maxBytes: number) {
  const declared = Number.parseInt(
    response.headers.get("content-length") ?? "",
    10,
  );
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new FearGreedProviderFailure();
  }
  if (!response.body) return "";

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new FearGreedProviderFailure();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const combined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(combined);
}

function parseProviderEntry(value: unknown): FearGreedEntry | null {
  if (!isRecord(value)) return null;
  const numericValue =
    typeof value.value === "string" ? Number(value.value) : value.value;
  const classification =
    typeof value.value_classification === "string"
      ? value.value_classification.trim()
      : "";
  const timestampSeconds =
    typeof value.timestamp === "string"
      ? Number(value.timestamp)
      : value.timestamp;
  if (
    typeof numericValue !== "number" ||
    !Number.isInteger(numericValue) ||
    numericValue < 0 ||
    numericValue > 100 ||
    !classification ||
    typeof timestampSeconds !== "number" ||
    !Number.isInteger(timestampSeconds) ||
    timestampSeconds <= 0
  ) {
    return null;
  }
  const timestamp = new Date(timestampSeconds * 1000);
  if (!Number.isFinite(timestamp.getTime())) return null;
  return {
    value: numericValue,
    classification,
    timestamp: timestamp.toISOString(),
  };
}

function parseProviderPayload(value: unknown) {
  if (
    !isRecord(value) ||
    !Array.isArray(value.data) ||
    value.data.length === 0
  ) {
    throw new FearGreedProviderFailure();
  }
  const current = parseProviderEntry(value.data[0]);
  if (!current) throw new FearGreedProviderFailure();
  const history = value.data
    .slice(0, 30)
    .map(parseProviderEntry)
    .filter((entry): entry is FearGreedEntry => entry !== null);
  if (history.length === 0) throw new FearGreedProviderFailure();
  return { current, history };
}

export async function executeFearGreed(
  serverOptions: FearGreedServerOptions = {},
): Promise<FearGreedExecution> {
  const options = resolveOptions(serverOptions);
  try {
    let response: Response;
    try {
      response = await options.fetchImpl(new URL(FEAR_GREED_URL), {
        cache: "no-store",
        redirect: "follow",
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(options.timeoutMs),
      });
    } catch {
      throw new FearGreedProviderFailure();
    }
    if (!response.ok) throw new FearGreedProviderFailure();
    const text = await readBoundedText(response, options.maxResponseBytes);
    let value: unknown;
    try {
      value = JSON.parse(text) as unknown;
    } catch {
      throw new FearGreedProviderFailure();
    }
    const payload = parseProviderPayload(value);
    return { status: 200, body: { ok: true, ...payload } };
  } catch {
    return {
      status: 502,
      body: { ok: false, error: FEAR_GREED_UNAVAILABLE },
    };
  }
}
