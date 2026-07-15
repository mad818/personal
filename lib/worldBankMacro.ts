/**
 * World Bank open macro indicators — free, no API key.
 * Pattern from ideas-assimilation-plan-3 Batch 5D.
 */

export interface WorldBankMacroResult {
  country: string;
  countryCode: string;
  indicator: string;
  indicatorCode: string;
  value: number | null;
  unit: string;
  year: string;
  sourceUrl: string;
}

const INDICATOR_LABELS: Record<string, { label: string; unit: string }> = {
  "NY.GDP.MKTP.CD": { label: "GDP (current US$)", unit: "USD" },
  "FP.CPI.TOTL.ZG": { label: "Inflation (CPI annual %)", unit: "%" },
  "GC.DOD.TOTL.GD.ZS": {
    label: "Central government debt (% of GDP)",
    unit: "% of GDP",
  },
};

function normalizeCountryCode(input: string): string {
  const trimmed = input.trim().toUpperCase();
  if (/^[A-Z]{2,3}$/.test(trimmed)) return trimmed;
  const aliases: Record<string, string> = {
    USA: "US",
    "UNITED STATES": "US",
    UK: "GB",
    "UNITED KINGDOM": "GB",
  };
  return aliases[trimmed] ?? trimmed.slice(0, 3);
}

export async function fetchWorldBankMacro(input: {
  country: string;
  indicator?: string;
}): Promise<WorldBankMacroResult | string> {
  const countryCode = normalizeCountryCode(input.country);
  const indicatorCode = (
    input.indicator?.trim() || "NY.GDP.MKTP.CD"
  ).toUpperCase();
  const meta = INDICATOR_LABELS[indicatorCode] ?? {
    label: indicatorCode,
    unit: "value",
  };

  const sourceUrl =
    `https://api.worldbank.org/v2/country/${encodeURIComponent(countryCode)}` +
    `/indicator/${encodeURIComponent(indicatorCode)}?format=json&per_page=1`;

  try {
    const response = await fetch(sourceUrl, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      return `World Bank API returned HTTP ${response.status}`;
    }

    const payload = (await response.json()) as unknown;
    if (!Array.isArray(payload) || payload.length < 2) {
      return "World Bank returned no series for that country/indicator.";
    }

    const rows = payload[1] as Array<{
      country?: { value?: string; id?: string };
      indicator?: { value?: string; id?: string };
      value?: number | null;
      date?: string;
    }>;

    const row = rows?.[0];
    if (!row) {
      return `No data for ${countryCode} / ${indicatorCode}. Try US, GB, DE, JP, or CN.`;
    }

    return {
      country: row.country?.value ?? countryCode,
      countryCode: row.country?.id ?? countryCode,
      indicator: row.indicator?.value ?? meta.label,
      indicatorCode: row.indicator?.id ?? indicatorCode,
      value: row.value ?? null,
      unit: meta.unit,
      year: row.date ?? "—",
      sourceUrl,
    };
  } catch {
    return "World Bank macro fetch failed.";
  }
}

export function formatWorldBankMacroResult(
  result: WorldBankMacroResult,
): string {
  const value =
    result.value == null
      ? "n/a"
      : result.unit === "USD"
        ? `$${result.value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
        : `${result.value}${result.unit.startsWith("%") ? "" : " "}${result.unit}`;

  return [
    `[World Bank — ${result.country} (${result.countryCode})]`,
    `${result.indicator}: ${value} (${result.year})`,
    `Source: ${result.sourceUrl}`,
    "Credibility: [HIGH] — primary multilateral data.",
  ].join("\n");
}
