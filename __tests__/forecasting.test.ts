import { describe, expect, it } from "vitest";
import {
  buildDefaultForecastProviderStatus,
  forecastQualityLabel,
  forecastQualityText,
} from "@/lib/forecasting";
import { parseForecastEvalPayload } from "@/lib/runtimeTypes";

describe("forecasting", () => {
  it("exposes a baseline provider posture that stays compatible with future providers", () => {
    const provider = buildDefaultForecastProviderStatus();

    expect(provider.id).toBe("native_baseline");
    expect(provider.requiresCompanion).toBe(false);
    expect(provider.confidenceSupported).toBe(false);
    expect(provider.supportedHorizons).toEqual(["1h", "6h", "24h"]);
  });

  it("maps forecast scores into stable quality bands", () => {
    expect(forecastQualityLabel(82, 0)).toBe("ready");
    expect(forecastQualityLabel(70, 2)).toBe("guarded");
    expect(forecastQualityLabel(41, 0)).toBe("degraded");
    expect(forecastQualityText("guarded")).toBe("Baseline guarded");
  });

  it("parses partial forecast payloads without breaking the readiness UI", () => {
    const payload = parseForecastEvalPayload({
      provider: { id: "native_baseline", ready: true },
      latest: null,
      history: [],
      points: 0,
      freshness: { stale: true },
      runner: {},
    });

    expect(payload.provider?.id).toBe("native_baseline");
    expect(payload.provider?.ready).toBe(true);
    expect(payload.latest).toBeNull();
    expect(payload.points).toBe(0);
  });
});
