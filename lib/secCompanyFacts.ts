export interface SecCompanyIdentity {
  cik: string;
  ticker: string;
  title: string;
}

export interface SecCompanyFact {
  id: string;
  label: string;
  value: number;
  previousValue: number | null;
  changePct: number | null;
  unit: string;
  form: "10-K" | "10-Q";
  filed: string;
  periodEnd: string;
  fiscalYear: number | null;
  fiscalPeriod: string;
}

export interface SecCompanyFactsSummary {
  company: SecCompanyIdentity;
  facts: SecCompanyFact[];
  sourceUrl: string;
}

interface SecTickerRecord {
  cik_str?: unknown;
  ticker?: unknown;
  title?: unknown;
}

interface SecFactUnit {
  val?: unknown;
  form?: unknown;
  filed?: unknown;
  end?: unknown;
  fy?: unknown;
  fp?: unknown;
}

interface SecFactConcept {
  label?: unknown;
  units?: Record<string, SecFactUnit[]>;
}

const FACT_CONCEPTS = [
  {
    id: "revenue",
    label: "Revenue",
    concepts: [
      "RevenueFromContractWithCustomerExcludingAssessedTax",
      "Revenues",
      "SalesRevenueNet",
    ],
  },
  {
    id: "net-income",
    label: "Net income",
    concepts: ["NetIncomeLoss", "ProfitLoss"],
  },
  {
    id: "operating-income",
    label: "Operating income",
    concepts: ["OperatingIncomeLoss"],
  },
  {
    id: "assets",
    label: "Assets",
    concepts: ["Assets"],
  },
  {
    id: "liabilities",
    label: "Liabilities",
    concepts: ["Liabilities"],
  },
  {
    id: "diluted-eps",
    label: "Diluted EPS",
    concepts: ["EarningsPerShareDiluted"],
  },
] as const;

function recordValues(value: unknown): SecTickerRecord[] {
  if (!value || typeof value !== "object") return [];
  return Object.values(value as Record<string, unknown>).filter(
    (entry): entry is SecTickerRecord =>
      Boolean(entry && typeof entry === "object"),
  );
}

export function findSecCompanyIdentity(
  tickerIndex: unknown,
  ticker: string,
): SecCompanyIdentity | null {
  const normalizedTicker = ticker.trim().toUpperCase();
  if (!/^[A-Z0-9.-]{1,10}$/.test(normalizedTicker)) return null;

  for (const record of recordValues(tickerIndex)) {
    if (
      typeof record.ticker !== "string" ||
      record.ticker.toUpperCase() !== normalizedTicker ||
      !Number.isInteger(Number(record.cik_str))
    ) {
      continue;
    }
    return {
      cik: String(Number(record.cik_str)).padStart(10, "0"),
      ticker: normalizedTicker,
      title:
        typeof record.title === "string" && record.title.trim()
          ? record.title.trim()
          : normalizedTicker,
    };
  }
  return null;
}

function selectConcept(
  facts: Record<string, SecFactConcept>,
  concepts: readonly string[],
): SecFactConcept | null {
  for (const concept of concepts) {
    if (facts[concept]?.units) return facts[concept];
  }
  return null;
}

function factCandidates(concept: SecFactConcept): Array<{
  value: number;
  unit: string;
  form: "10-K" | "10-Q";
  filed: string;
  periodEnd: string;
  fiscalYear: number | null;
  fiscalPeriod: string;
}> {
  const candidates: Array<{
    value: number;
    unit: string;
    form: "10-K" | "10-Q";
    filed: string;
    periodEnd: string;
    fiscalYear: number | null;
    fiscalPeriod: string;
  }> = [];

  for (const [unit, entries] of Object.entries(concept.units ?? {})) {
    if (!Array.isArray(entries)) continue;
    for (const entry of entries) {
      const form =
        entry.form === "10-K" || entry.form === "10-Q" ? entry.form : null;
      const value = Number(entry.val);
      if (
        !form ||
        !Number.isFinite(value) ||
        typeof entry.filed !== "string" ||
        typeof entry.end !== "string"
      ) {
        continue;
      }
      candidates.push({
        value,
        unit,
        form,
        filed: entry.filed,
        periodEnd: entry.end,
        fiscalYear: Number.isFinite(Number(entry.fy)) ? Number(entry.fy) : null,
        fiscalPeriod: typeof entry.fp === "string" ? entry.fp : "",
      });
    }
  }

  const annual = candidates.filter(
    (candidate) => candidate.form === "10-K" && candidate.fiscalPeriod === "FY",
  );
  const selected = annual.length > 0 ? annual : candidates;
  const uniqueByPeriod = new Map<string, (typeof candidates)[number]>();
  for (const candidate of selected.sort((left, right) =>
    right.filed.localeCompare(left.filed),
  )) {
    const key = `${candidate.unit}:${candidate.periodEnd}`;
    if (!uniqueByPeriod.has(key)) uniqueByPeriod.set(key, candidate);
  }
  return [...uniqueByPeriod.values()].sort((left, right) =>
    right.periodEnd.localeCompare(left.periodEnd),
  );
}

export function extractSecCompanyFacts(
  payload: unknown,
  company: SecCompanyIdentity,
): SecCompanyFactsSummary {
  const factsRoot =
    payload && typeof payload === "object"
      ? (payload as { facts?: { "us-gaap"?: unknown } }).facts?.["us-gaap"]
      : null;
  const facts =
    factsRoot && typeof factsRoot === "object"
      ? (factsRoot as Record<string, SecFactConcept>)
      : {};

  const extracted: SecCompanyFact[] = [];
  for (const definition of FACT_CONCEPTS) {
    const concept = selectConcept(facts, definition.concepts);
    if (!concept) continue;
    const candidates = factCandidates(concept);
    const latest = candidates[0];
    if (!latest) continue;
    const previous =
      candidates.find(
        (candidate) =>
          candidate.unit === latest.unit &&
          candidate.periodEnd !== latest.periodEnd,
      ) ?? null;
    const changePct =
      previous && previous.value !== 0
        ? ((latest.value - previous.value) / Math.abs(previous.value)) * 100
        : null;
    extracted.push({
      id: definition.id,
      label: definition.label,
      value: latest.value,
      previousValue: previous?.value ?? null,
      changePct: Number.isFinite(changePct) ? changePct : null,
      unit: latest.unit,
      form: latest.form,
      filed: latest.filed,
      periodEnd: latest.periodEnd,
      fiscalYear: latest.fiscalYear,
      fiscalPeriod: latest.fiscalPeriod,
    });
  }

  return {
    company,
    facts: extracted,
    sourceUrl: `https://data.sec.gov/api/xbrl/companyfacts/CIK${company.cik}.json`,
  };
}
