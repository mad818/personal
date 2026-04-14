import "server-only";

import type {
  MemoryLayer,
  MemorySpineItem,
  MemoryVisibility,
} from "@/lib/memorySpine";
import { searchPersistedMemorySpine } from "@/lib/memorySpineStore";

export type MemoryAdapterId = "nexus_native" | "memory_sidecar";
export type MemoryAdapterMode = "native" | "loopback_sidecar";
export type MemoryAdapterState =
  | "default"
  | "disabled"
  | "not_configured"
  | "ready"
  | "degraded"
  | "rejected";

export interface MemoryAdapterStatus {
  id: MemoryAdapterId;
  label: string;
  provider: string;
  mode: MemoryAdapterMode;
  state: MemoryAdapterState;
  default: boolean;
  enabled: boolean;
  available: boolean;
  localOnly: true;
  freeFirst: true;
  queryOnly: true;
  corpusSync: "none";
  featureFlag: string | null;
  endpoint: string | null;
  reason: string;
}

export interface MemoryAdapterItem {
  id: string;
  title: string;
  summary: string;
  sourceLabel: string;
  layer: MemoryLayer | "unknown";
  visibility: MemoryVisibility | "unknown";
  timestamp: number | null;
}

export interface MemoryAdapterSearchResult {
  adapter: MemoryAdapterStatus;
  items: MemoryAdapterItem[];
  total: number | null;
  matchCount: number;
  error: string | null;
}

export interface MemoryAdapterStatusSnapshot {
  defaultAdapterId: MemoryAdapterId;
  evaluationMode: "query_only_no_sync";
  restrictedSyncPolicy: "never_send_restricted_artifacts";
  native: MemoryAdapterStatus;
  sidecar: MemoryAdapterStatus;
}

export interface MemoryAdapterEvalComparison {
  sharedCount: number;
  nativeOnlyCount: number;
  sidecarOnlyCount: number;
  overlapRatio: number;
  sharedKeys: string[];
}

const LOOPBACK_HOST_PATTERNS = [
  /^localhost$/i,
  /^127(?:\.\d{1,3}){3}$/,
  /^::1$/i,
  /^\[::1\]$/i,
] as const;

const SIDEcar_ENABLED_ENV = "NEXUS_MEMORY_SIDECAR_ENABLED";
const SIDEcar_URL_ENV = "NEXUS_MEMORY_SIDECAR_SEARCH_URL";
const SIDEcar_PROVIDER_ENV = "NEXUS_MEMORY_SIDECAR_PROVIDER";

function isEnabled(value: string | undefined) {
  return /^(1|true|yes|on)$/i.test(value?.trim() ?? "");
}

function trimText(value: string, max: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, Math.max(1, max - 1)).trimEnd()}…`;
}

function isLoopbackHostname(hostname: string) {
  return LOOPBACK_HOST_PATTERNS.some((pattern) => pattern.test(hostname));
}

function normalizeLayer(value: unknown): MemoryLayer | "unknown" {
  return value === "raw" || value === "knowledge" || value === "output"
    ? value
    : "unknown";
}

function normalizeVisibility(value: unknown): MemoryVisibility | "unknown" {
  return value === "safe" || value === "internal" || value === "restricted"
    ? value
    : "unknown";
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function asTimestamp(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function fingerprintAdapterItem(item: MemoryAdapterItem) {
  const title = item.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const source = item.sourceLabel
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return `${title.slice(0, 80)}|${source.slice(0, 48)}`;
}

function mapMemorySpineItem(item: MemorySpineItem): MemoryAdapterItem {
  return {
    id: item.id,
    title: item.title,
    summary: item.summary,
    sourceLabel: item.sourceLabel,
    layer: item.layer,
    visibility: item.visibility,
    timestamp: item.timestamp,
  };
}

function buildNativeStatus(): MemoryAdapterStatus {
  return {
    id: "nexus_native",
    label: "Nexus native memory",
    provider: "Nexus",
    mode: "native",
    state: "default",
    default: true,
    enabled: true,
    available: true,
    localOnly: true,
    freeFirst: true,
    queryOnly: true,
    corpusSync: "none",
    featureFlag: null,
    endpoint: null,
    reason: "Default local memory retrieval. Restricted artifacts stay inside Nexus.",
  };
}

export function parseLoopbackSidecarUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("Invalid sidecar URL.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Memory sidecar must use http or https.");
  }
  if (parsed.username || parsed.password) {
    throw new Error("Credential-bearing sidecar URLs are blocked.");
  }
  if (!isLoopbackHostname(parsed.hostname)) {
    throw new Error("Memory sidecar must stay on a loopback host.");
  }

  return parsed;
}

function buildSidecarStatus(): MemoryAdapterStatus {
  const provider =
    process.env[SIDEcar_PROVIDER_ENV]?.trim() || "Optional memory sidecar";
  const enabled = isEnabled(process.env[SIDEcar_ENABLED_ENV]);

  if (!enabled) {
    return {
      id: "memory_sidecar",
      label: "Optional sidecar",
      provider,
      mode: "loopback_sidecar",
      state: "disabled",
      default: false,
      enabled: false,
      available: false,
      localOnly: true,
      freeFirst: true,
      queryOnly: true,
      corpusSync: "none",
      featureFlag: SIDEcar_ENABLED_ENV,
      endpoint: null,
      reason: "Disabled by default. Enable only for explicit local evaluation.",
    };
  }

  const rawUrl = process.env[SIDEcar_URL_ENV]?.trim();
  if (!rawUrl) {
    return {
      id: "memory_sidecar",
      label: "Optional sidecar",
      provider,
      mode: "loopback_sidecar",
      state: "not_configured",
      default: false,
      enabled: true,
      available: false,
      localOnly: true,
      freeFirst: true,
      queryOnly: true,
      corpusSync: "none",
      featureFlag: SIDEcar_ENABLED_ENV,
      endpoint: null,
      reason: `Set ${SIDEcar_URL_ENV} to a loopback search endpoint before evaluating the sidecar.`,
    };
  }

  try {
    const parsed = parseLoopbackSidecarUrl(rawUrl);
    return {
      id: "memory_sidecar",
      label: "Optional sidecar",
      provider,
      mode: "loopback_sidecar",
      state: "ready",
      default: false,
      enabled: true,
      available: true,
      localOnly: true,
      freeFirst: true,
      queryOnly: true,
      corpusSync: "none",
      featureFlag: SIDEcar_ENABLED_ENV,
      endpoint: `${parsed.origin}${parsed.pathname}`,
      reason:
        "Loopback-only sidecar is eligible for query-time evaluation. Nexus does not auto-sync memory artifacts into it.",
    };
  } catch (error) {
    return {
      id: "memory_sidecar",
      label: "Optional sidecar",
      provider,
      mode: "loopback_sidecar",
      state: "rejected",
      default: false,
      enabled: true,
      available: false,
      localOnly: true,
      freeFirst: true,
      queryOnly: true,
      corpusSync: "none",
      featureFlag: SIDEcar_ENABLED_ENV,
      endpoint: null,
      reason:
        error instanceof Error
          ? error.message
          : "Memory sidecar configuration was rejected.",
    };
  }
}

export function readMemoryAdapterStatuses(): MemoryAdapterStatusSnapshot {
  return {
    defaultAdapterId: "nexus_native",
    evaluationMode: "query_only_no_sync",
    restrictedSyncPolicy: "never_send_restricted_artifacts",
    native: buildNativeStatus(),
    sidecar: buildSidecarStatus(),
  };
}

export async function searchNativeMemoryAdapter(options: {
  query?: string;
  layer?: MemoryLayer | "all";
  limit?: number;
}) {
  const result = await searchPersistedMemorySpine(options);

  return {
    adapter: readMemoryAdapterStatuses().native,
    items: result.items.map(mapMemorySpineItem),
    total: result.snapshot.total,
    matchCount: result.items.length,
    error: null,
  } satisfies MemoryAdapterSearchResult;
}

function normalizeSidecarPayloadItem(
  value: unknown,
  index: number,
): MemoryAdapterItem | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  const title = trimText(
    asString(item.title) ||
      asString(item.name) ||
      asString(item.id) ||
      `Sidecar result ${index + 1}`,
    90,
  );
  const summary = trimText(
    asString(item.summary) ||
      asString(item.snippet) ||
      asString(item.preview) ||
      asString(item.text) ||
      asString(item.content) ||
      "Sidecar result.",
    180,
  );
  const sourceLabel = trimText(
    asString(item.sourceLabel) ||
      asString(item.source) ||
      asString(item.collection) ||
      asString(item.namespace) ||
      "Sidecar result",
    60,
  );

  return {
    id:
      trimText(asString(item.id) || asString(item.docId) || asString(item.key), 80) ||
      `sidecar:${index}`,
    title,
    summary,
    sourceLabel,
    layer: normalizeLayer(item.layer),
    visibility: normalizeVisibility(item.visibility),
    timestamp: asTimestamp(item.timestamp ?? item.ts ?? item.createdAt),
  };
}

function extractSidecarItems(payload: unknown): MemoryAdapterItem[] {
  if (!payload || typeof payload !== "object") return [];
  const record = payload as Record<string, unknown>;
  const candidates = Array.isArray(record.items)
    ? record.items
    : Array.isArray(record.results)
      ? record.results
      : Array.isArray(record.matches)
        ? record.matches
        : [];

  return candidates
    .map((item, index) => normalizeSidecarPayloadItem(item, index))
    .filter((item): item is MemoryAdapterItem => item !== null);
}

export async function searchOptionalSidecarMemoryAdapter(options: {
  query: string;
  layer?: MemoryLayer | "all";
  limit?: number;
}) {
  const statuses = readMemoryAdapterStatuses();
  const sidecar = statuses.sidecar;
  if (sidecar.state !== "ready") {
    return {
      adapter: sidecar,
      items: [],
      total: 0,
      matchCount: 0,
      error: null,
    } satisfies MemoryAdapterSearchResult;
  }

  const target = parseLoopbackSidecarUrl(
    process.env[SIDEcar_URL_ENV]?.trim() ?? "",
  );
  target.searchParams.set("q", options.query);
  target.searchParams.set("limit", String(Math.max(1, options.limit ?? 8)));
  if (options.layer && options.layer !== "all") {
    target.searchParams.set("layer", options.layer);
  }

  try {
    const response = await fetch(target.toString(), {
      headers: {
        Accept: "application/json",
        "X-Nexus-Memory-Eval": "query-only",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(4_000),
    });

    if (!response.ok) {
      return {
        adapter: {
          ...sidecar,
          state: "degraded",
          available: false,
          reason: `${sidecar.provider} responded with HTTP ${response.status}.`,
        },
        items: [],
        total: null,
        matchCount: 0,
        error: `http_${response.status}`,
      } satisfies MemoryAdapterSearchResult;
    }

    const payload = (await response.json().catch(() => null)) as
      | Record<string, unknown>
      | null;
    const items = extractSidecarItems(payload);
    const totalValue =
      typeof payload?.total === "number" && Number.isFinite(payload.total)
        ? payload.total
        : typeof payload?.matchCount === "number" &&
            Number.isFinite(payload.matchCount)
          ? payload.matchCount
          : items.length;

    return {
      adapter: sidecar,
      items,
      total: totalValue,
      matchCount: items.length,
      error: null,
    } satisfies MemoryAdapterSearchResult;
  } catch {
    return {
      adapter: {
        ...sidecar,
        state: "degraded",
        available: false,
        reason: `${sidecar.provider} is not reachable on the configured loopback endpoint.`,
      },
      items: [],
      total: null,
      matchCount: 0,
      error: "unreachable",
    } satisfies MemoryAdapterSearchResult;
  }
}

export function compareMemoryAdapterResults(
  nativeItems: MemoryAdapterItem[],
  sidecarItems: MemoryAdapterItem[],
): MemoryAdapterEvalComparison {
  const nativeKeys = Array.from(
    new Set(nativeItems.map((item) => fingerprintAdapterItem(item))),
  );
  const sidecarKeys = new Set(
    sidecarItems.map((item) => fingerprintAdapterItem(item)),
  );
  const sharedKeys = nativeKeys.filter((key) => sidecarKeys.has(key));
  const nativeSet = new Set(nativeKeys);
  const sidecarUniqueKeys = Array.from(sidecarKeys);
  const nativeOnlyCount = nativeKeys.filter((key) => !sidecarKeys.has(key)).length;
  const sidecarOnlyCount = sidecarUniqueKeys.filter((key) => !nativeSet.has(key)).length;
  const unionSize = sharedKeys.length + nativeOnlyCount + sidecarOnlyCount;

  return {
    sharedCount: sharedKeys.length,
    nativeOnlyCount,
    sidecarOnlyCount,
    overlapRatio:
      unionSize > 0
        ? Math.round((sharedKeys.length / unionSize) * 100) / 100
        : 0,
    sharedKeys,
  };
}
