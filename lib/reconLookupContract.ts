import { apiFetch } from "@/lib/apiFetch";
import type {
  ReconLookupFailure,
  ReconLookupRequest,
  ReconLookupServerErrorCode,
  ReconLookupSuccess,
} from "@/lib/reconLookupTypes";
export { RECON_LOOKUP_OPERATIONS } from "@/lib/reconLookupTypes";
export type {
  ReconLookupFailure,
  ReconLookupOperation,
  ReconLookupRequest,
  ReconLookupResponse,
  ReconLookupServerErrorCode,
  ReconLookupSuccess,
  VirusTotalTargetType,
} from "@/lib/reconLookupTypes";

export type ReconLookupClientErrorCode =
  | ReconLookupServerErrorCode
  | "blocked"
  | "nexus_unavailable";

export class ReconLookupClientError extends Error {
  readonly code: ReconLookupClientErrorCode;

  constructor(code: ReconLookupClientErrorCode) {
    super(code);
    this.name = "ReconLookupClientError";
    this.code = code;
  }
}

const SERVER_ERROR_CODES = new Set<ReconLookupServerErrorCode>([
  "invalid_request",
  "key_required",
  "rate_limited",
  "upstream_unavailable",
]);

export async function requestReconLookup<T>(
  request: ReconLookupRequest,
): Promise<T> {
  let response: Response;
  try {
    response = await apiFetch("/api/recon/lookup", {
      method: "POST",
      cache: "no-store",
      body: JSON.stringify(request),
    });
  } catch {
    throw new ReconLookupClientError("nexus_unavailable");
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ReconLookupClientError("nexus_unavailable");
  }

  if (response.ok && isLookupSuccess(payload)) return payload.data as T;

  if (response.status === 401 || response.status === 403) {
    throw new ReconLookupClientError("blocked");
  }
  if (response.status === 429) {
    throw new ReconLookupClientError("rate_limited");
  }
  if (isLookupFailure(payload) && SERVER_ERROR_CODES.has(payload.code)) {
    throw new ReconLookupClientError(payload.code);
  }
  throw new ReconLookupClientError("nexus_unavailable");
}

function isLookupSuccess(value: unknown): value is ReconLookupSuccess {
  return Boolean(
    value &&
    typeof value === "object" &&
    value !== null &&
    (value as { ok?: unknown }).ok === true &&
    "data" in value,
  );
}

function isLookupFailure(value: unknown): value is ReconLookupFailure {
  return Boolean(
    value &&
    typeof value === "object" &&
    value !== null &&
    (value as { ok?: unknown }).ok === false &&
    typeof (value as { code?: unknown }).code === "string",
  );
}

export function reconLookupErrorMessage(error: unknown, provider?: string) {
  const code =
    error instanceof ReconLookupClientError
      ? error.code
      : ("nexus_unavailable" as const);

  if (code === "invalid_request")
    return "Enter a valid target for this lookup.";
  if (code === "key_required") {
    return `Add ${provider ?? "the provider"} key in Settings, then try again.`;
  }
  if (code === "rate_limited") {
    return `${provider ?? "Provider"} rate limit reached — try again later.`;
  }
  if (code === "blocked") {
    return "Lookup is blocked by the current Nexus network policy.";
  }
  if (code === "upstream_unavailable") {
    return `${provider ?? "Provider"} lookup is temporarily unavailable.`;
  }
  return "Nexus lookup service is temporarily unavailable.";
}
