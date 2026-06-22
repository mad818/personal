/**
 * TimesFM forecast-lab descriptor and advisory spike.
 * Google's foundation model for zero-shot time-series forecasting.
 * Pattern from Wave 18 Forecast Lab — advisory-only, no paid compute.
 * Operator activates by setting TIMESFM_ENDPOINT to a local or docker endpoint.
 */

export const TIMESFM_VERSION = "timesfm-forecast.v1" as const;

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

export interface TimesFmForecastResult {
  ok: boolean;
  forecasts?: number[];
  error?: string;
}

export function readTimesFmEndpoint(): string | null {
  return process.env.TIMESFM_ENDPOINT?.trim() || null;
}

export function isTimesFmConfigured(): boolean {
  return Boolean(readTimesFmEndpoint());
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
      ? "Operator-configured TimesFM endpoint found — call /predict for advisory forecasts."
      : "TimesFM not configured. Set TIMESFM_ENDPOINT to a local or operator-hosted inference URL. " +
        "Run locally: docker run -p 8000:8000 google/timesfm (or pip install timesfm).",
  };
}

/**
 * Call the operator-configured TimesFM endpoint with a context window.
 * context: historical values (up to 512), horizon: steps to forecast.
 * Returns advisory point forecasts; never blocks on failure.
 */
export async function callTimesFmForecast(input: {
  context: number[];
  horizon: number;
  frequency?: number;
}): Promise<TimesFmForecastResult> {
  const endpoint = readTimesFmEndpoint();
  if (!endpoint) {
    return {
      ok: false,
      error: "TimesFM endpoint not configured (TIMESFM_ENDPOINT).",
    };
  }

  const context = input.context.slice(-512);
  const horizon = Math.min(Math.max(1, input.horizon), 512);

  try {
    const response = await fetch(`${endpoint.replace(/\/$/, "")}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        context,
        horizon,
        freq: input.frequency ?? 0,
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!response.ok) {
      return { ok: false, error: `TimesFM returned HTTP ${response.status}.` };
    }

    const data = (await response.json()) as { point_forecast?: number[][] };
    const forecasts = data.point_forecast?.[0];
    if (!forecasts || !Array.isArray(forecasts)) {
      return { ok: false, error: "No point_forecast in TimesFM response." };
    }
    return { ok: true, forecasts };
  } catch {
    return { ok: false, error: "TimesFM forecast call failed." };
  }
}

export function buildTimesFmCapabilityBlock(): string {
  const descriptor = evaluateTimesFmReadiness();
  return (
    `\n[FORECAST LAB — TimesFM pattern]\n` +
    `Model: ${descriptor.model}\n` +
    `Status: ${descriptor.available ? "configured" : "not configured"}\n` +
    `Advisory-only: yes — no paid inference; local/operator endpoint only.\n` +
    `${
      descriptor.available
        ? `Endpoint: ${descriptor.endpointUrl}`
        : "Set TIMESFM_ENDPOINT to activate (docker or pip install timesfm)."
    }\n` +
    `[END FORECAST LAB]\n`
  );
}
