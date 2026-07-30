/** Optional TimesFM endpoint posture; Nexus does not execute forecasts here. */

export const TIMESFM_VERSION = "timesfm-readiness.v1" as const;

export type TimesFmModel =
  | "google/timesfm-1.0-200m"
  | "google/timesfm-2.0-500m-pytorch";

export interface TimesFmReadinessDescriptor {
  version: typeof TIMESFM_VERSION;
  available: boolean;
  endpointUrl: string | null;
  advisoryOnly: true;
  model: TimesFmModel;
  note: string;
}

export function readTimesFmEndpoint(): string | null {
  return process.env.TIMESFM_ENDPOINT?.trim() || null;
}

export function evaluateTimesFmReadiness(): TimesFmReadinessDescriptor {
  const endpointUrl = readTimesFmEndpoint();
  return {
    version: TIMESFM_VERSION,
    available: Boolean(endpointUrl),
    endpointUrl,
    advisoryOnly: true,
    model: "google/timesfm-2.0-500m-pytorch",
    note: endpointUrl
      ? "Operator-configured TimesFM endpoint is present."
      : "TimesFM is not configured. Set TIMESFM_ENDPOINT to advertise an operator-managed advisory endpoint.",
  };
}
