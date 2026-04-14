interface ConnectorMetaCache {
  maxAgeSeconds?: number;
  staleWhileRevalidateSeconds?: number;
  scope?: string;
}

export interface ConnectorMeta {
  source?: string;
  status?: string;
  generatedAt?: string;
  warnings: string[];
  cache?: ConnectorMetaCache;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function readConnectorMeta(payload: unknown): ConnectorMeta | null {
  if (!isRecord(payload) || !isRecord(payload.meta)) {
    return null;
  }

  const warnings = Array.isArray(payload.meta.warnings)
    ? payload.meta.warnings.filter(
        (warning): warning is string => typeof warning === "string",
      )
    : [];

  return {
    source:
      typeof payload.meta.source === "string" ? payload.meta.source : undefined,
    status:
      typeof payload.meta.status === "string" ? payload.meta.status : undefined,
    generatedAt:
      typeof payload.meta.generatedAt === "string"
        ? payload.meta.generatedAt
        : undefined,
    warnings,
    cache: isRecord(payload.meta.cache)
      ? {
          scope:
            typeof payload.meta.cache.scope === "string"
              ? payload.meta.cache.scope
              : undefined,
          maxAgeSeconds:
            typeof payload.meta.cache.maxAgeSeconds === "number"
              ? payload.meta.cache.maxAgeSeconds
              : undefined,
          staleWhileRevalidateSeconds:
            typeof payload.meta.cache.staleWhileRevalidateSeconds === "number"
              ? payload.meta.cache.staleWhileRevalidateSeconds
              : undefined,
        }
      : undefined,
  };
}

export function readConnectorWarnings(payload: unknown): string[] {
  return readConnectorMeta(payload)?.warnings ?? [];
}

export function isConnectorDegraded(payload: unknown): boolean {
  return readConnectorMeta(payload)?.status === "degraded";
}
