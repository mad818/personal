export const FEYNMAN_PAPER_RANK_WEIGHTS = {
  topicalRelevance: 0.3,
  citationImpact: 0.2,
  graphPrestige: 0.2,
  citationVelocity: 0.1,
  methodologyEvidence: 0.1,
  reproducibility: 0.1,
} as const;

export type FeynmanPaperRankSignalId = keyof typeof FEYNMAN_PAPER_RANK_WEIGHTS;

export interface FeynmanPaperRankCandidate {
  id?: string;
  title: string;
  abstract?: string;
  url?: string;
  year?: number;
  citationCount?: number;
  graphPrestige?: number;
  codeUrl?: string;
  dataUrl?: string;
  methodologyText?: string;
  reproducibilityText?: string;
}

export interface FeynmanPaperRankSignal {
  id: FeynmanPaperRankSignalId;
  label: string;
  weight: number;
  available: boolean;
  value: number | null;
  detail: string;
}

export interface FeynmanPaperRankedCandidate {
  rank: number;
  inputIndex: number;
  candidate: FeynmanPaperRankCandidate;
  score: number;
  availableWeight: number;
  signals: FeynmanPaperRankSignal[];
  missingSignals: string[];
}

export interface FeynmanPaperRankResult {
  topic: string;
  ranked: FeynmanPaperRankedCandidate[];
}

const SIGNAL_LABELS: Record<FeynmanPaperRankSignalId, string> = {
  topicalRelevance: "Topical relevance",
  citationImpact: "Citation impact",
  graphPrestige: "Graph prestige",
  citationVelocity: "Citation velocity",
  methodologyEvidence: "Methodology evidence",
  reproducibility: "Reproducibility",
};

const ALLOWED_CANDIDATE_KEYS = new Set([
  "id",
  "title",
  "abstract",
  "url",
  "year",
  "citationCount",
  "graphPrestige",
  "codeUrl",
  "dataUrl",
  "methodologyText",
  "reproducibilityText",
]);

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "how",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "this",
  "to",
  "using",
  "what",
  "when",
  "where",
  "which",
  "with",
]);

const METHODOLOGY_MARKERS = [
  {
    label: "study design",
    pattern:
      /\b(method|methodology|protocol|randomi[sz]ed|controlled|design)\b/i,
  },
  {
    label: "sample or data",
    pattern: /\b(sample|dataset|cohort|participants?|observations?|corpus)\b/i,
  },
  {
    label: "evaluation or metrics",
    pattern:
      /\b(evaluat(?:e|ed|ion)|metric|benchmark|accuracy|precision|recall)\b/i,
  },
  {
    label: "statistics or uncertainty",
    pattern:
      /\b(confidence interval|p[- ]?value|statistic|uncertaint|variance|standard deviation)\b/i,
  },
  {
    label: "baseline or limitations",
    pattern:
      /\b(baseline|ablation|control group|limitation|threats? to validity)\b/i,
  },
];

const REPRODUCIBILITY_MARKERS = [
  { label: "environment", pattern: /\b(environment|container|docker)\b/i },
  {
    label: "configuration",
    pattern: /\b(config|configuration|hyperparameter)\b/i,
  },
  { label: "seed", pattern: /\b(random seed|seeded|deterministic)\b/i },
  {
    label: "instructions",
    pattern: /\b(reproduc|instructions?|setup|install)\b/i,
  },
  {
    label: "artifacts",
    pattern: /\b(checkpoints?|weights|artifacts?|supplements?)\b/i,
  },
];

function assertString(
  value: unknown,
  field: string,
  maxLength: number,
  required = false,
): string | undefined {
  if (value === undefined) {
    if (required) throw new Error(`${field} is required.`);
    return undefined;
  }
  if (typeof value !== "string") throw new Error(`${field} must be text.`);
  const normalized = value.replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  if (required && normalized.length === 0)
    throw new Error(`${field} is required.`);
  if (normalized.length > maxLength)
    throw new Error(`${field} exceeds ${maxLength} characters.`);
  return normalized || undefined;
}

function assertOptionalNumber(
  value: unknown,
  field: string,
  minimum: number,
  maximum: number,
  integer = false,
): number | undefined {
  if (value === undefined) return undefined;
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < minimum ||
    value > maximum ||
    (integer && !Number.isInteger(value))
  ) {
    throw new Error(`${field} is outside its accepted range.`);
  }
  return value;
}

function assertOptionalUrl(value: unknown, field: string): string | undefined {
  const normalized = assertString(value, field, 2_000);
  if (!normalized) return undefined;
  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:")
      throw new Error("unsupported protocol");
  } catch {
    throw new Error(`${field} must be an HTTP(S) URL.`);
  }
  return normalized;
}

function normalizeCandidate(
  value: unknown,
  index: number,
): FeynmanPaperRankCandidate {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(`Candidate ${index + 1} must be an object.`);
  const record = value as Record<string, unknown>;
  const unknownKey = Object.keys(record).find(
    (key) => !ALLOWED_CANDIDATE_KEYS.has(key),
  );
  if (unknownKey)
    throw new Error(`Candidate ${index + 1} contains an unsupported field.`);

  const currentYear = new Date().getUTCFullYear();
  return {
    ...(assertString(record.id, "id", 160)
      ? { id: assertString(record.id, "id", 160) }
      : {}),
    title: assertString(record.title, "title", 300, true)!,
    ...(assertString(record.abstract, "abstract", 8_000)
      ? { abstract: assertString(record.abstract, "abstract", 8_000) }
      : {}),
    ...(assertOptionalUrl(record.url, "url")
      ? { url: assertOptionalUrl(record.url, "url") }
      : {}),
    ...(record.year !== undefined
      ? {
          year: assertOptionalNumber(
            record.year,
            "year",
            1900,
            currentYear + 1,
            true,
          ),
        }
      : {}),
    ...(record.citationCount !== undefined
      ? {
          citationCount: assertOptionalNumber(
            record.citationCount,
            "citationCount",
            0,
            1_000_000_000,
            true,
          ),
        }
      : {}),
    ...(record.graphPrestige !== undefined
      ? {
          graphPrestige: assertOptionalNumber(
            record.graphPrestige,
            "graphPrestige",
            0,
            100,
          ),
        }
      : {}),
    ...(assertOptionalUrl(record.codeUrl, "codeUrl")
      ? { codeUrl: assertOptionalUrl(record.codeUrl, "codeUrl") }
      : {}),
    ...(assertOptionalUrl(record.dataUrl, "dataUrl")
      ? { dataUrl: assertOptionalUrl(record.dataUrl, "dataUrl") }
      : {}),
    ...(assertString(record.methodologyText, "methodologyText", 8_000)
      ? {
          methodologyText: assertString(
            record.methodologyText,
            "methodologyText",
            8_000,
          ),
        }
      : {}),
    ...(assertString(record.reproducibilityText, "reproducibilityText", 8_000)
      ? {
          reproducibilityText: assertString(
            record.reproducibilityText,
            "reproducibilityText",
            8_000,
          ),
        }
      : {}),
  };
}

export function parseFeynmanPaperRankInput(
  topicValue: string,
  candidatesJson: string,
): { topic: string; candidates: FeynmanPaperRankCandidate[] } {
  const topic = assertString(topicValue, "topic", 240, true)!;
  if (candidatesJson.length > 250_000)
    throw new Error("candidates_json is too large.");

  let parsed: unknown;
  try {
    parsed = JSON.parse(candidatesJson);
  } catch {
    throw new Error("candidates_json must be a valid JSON array.");
  }
  if (!Array.isArray(parsed) || parsed.length < 2 || parsed.length > 25)
    throw new Error("candidates_json must contain 2 to 25 paper objects.");

  return {
    topic,
    candidates: parsed.map(normalizeCandidate),
  };
}

function tokenize(value: string): string[] {
  return Array.from(
    new Set(
      value
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[^a-z0-9\s-]/g, " ")
        .split(/[\s-]+/)
        .map((token) => token.trim())
        .filter((token) => token.length > 1 && !STOP_WORDS.has(token)),
    ),
  );
}

function clampScore(value: number): number {
  return Math.round(Math.max(0, Math.min(100, value)) * 10) / 10;
}

function buildSignal(
  id: FeynmanPaperRankSignalId,
  available: boolean,
  value: number | null,
  detail: string,
): FeynmanPaperRankSignal {
  return {
    id,
    label: SIGNAL_LABELS[id],
    weight: FEYNMAN_PAPER_RANK_WEIGHTS[id],
    available,
    value: value === null ? null : clampScore(value),
    detail,
  };
}

function topicalRelevance(
  topicTokens: string[],
  candidate: FeynmanPaperRankCandidate,
) {
  const titleTokens = new Set(tokenize(candidate.title));
  const abstractTokens = new Set(tokenize(candidate.abstract ?? ""));
  const contributions: number[] = topicTokens.map((token) =>
    titleTokens.has(token) ? 100 : abstractTokens.has(token) ? 60 : 0,
  );
  const value =
    contributions.length > 0
      ? contributions.reduce((sum, part) => sum + part, 0) /
        contributions.length
      : 0;
  const matched = contributions.filter((part) => part > 0).length;
  return buildSignal(
    "topicalRelevance",
    true,
    value,
    `${matched}/${Math.max(topicTokens.length, 1)} topic terms matched supplied title/abstract.`,
  );
}

function markerSignal(
  id: "methodologyEvidence" | "reproducibility",
  text: string | undefined,
  markers: Array<{ label: string; pattern: RegExp }>,
  baseScore = 0,
) {
  if (!text && baseScore === 0)
    return buildSignal(id, false, null, "No direct evidence supplied.");
  const matches = markers.filter((marker) => marker.pattern.test(text ?? ""));
  const remaining = Math.max(0, 100 - baseScore);
  const markerPoints = markers.length > 0 ? remaining / markers.length : 0;
  return buildSignal(
    id,
    true,
    baseScore + matches.length * markerPoints,
    matches.length > 0
      ? `Supplied evidence includes: ${matches.map((match) => match.label).join(", ")}.`
      : "No configured evidence markers were found in the supplied text.",
  );
}

export function rankFeynmanPapers(
  topic: string,
  candidates: FeynmanPaperRankCandidate[],
): FeynmanPaperRankResult {
  const topicTokens = tokenize(topic);
  const maximumCitationLog = Math.max(
    0,
    ...candidates
      .filter((candidate) => candidate.citationCount !== undefined)
      .map((candidate) => Math.log1p(candidate.citationCount ?? 0)),
  );
  const currentYear = new Date().getUTCFullYear();
  const citationVelocities = candidates.map((candidate) =>
    candidate.citationCount !== undefined && candidate.year !== undefined
      ? candidate.citationCount / Math.max(1, currentYear - candidate.year + 1)
      : null,
  );
  const maximumVelocity = Math.max(
    0,
    ...citationVelocities.filter((value): value is number => value !== null),
  );

  const scored = candidates.map((candidate, inputIndex) => {
    const methodologyText = [candidate.abstract, candidate.methodologyText]
      .filter(Boolean)
      .join(" ");
    const reproducibilityText = candidate.reproducibilityText;
    const reproducibilityBase =
      (candidate.codeUrl ? 35 : 0) + (candidate.dataUrl ? 35 : 0);
    const signals: FeynmanPaperRankSignal[] = [
      topicalRelevance(topicTokens, candidate),
      buildSignal(
        "citationImpact",
        candidate.citationCount !== undefined,
        candidate.citationCount === undefined
          ? null
          : maximumCitationLog > 0
            ? (Math.log1p(candidate.citationCount) / maximumCitationLog) * 100
            : 0,
        candidate.citationCount === undefined
          ? "Citation count was not supplied."
          : `${candidate.citationCount.toLocaleString("en-US")} supplied citations; log-normalized within this candidate set.`,
      ),
      buildSignal(
        "graphPrestige",
        candidate.graphPrestige !== undefined,
        candidate.graphPrestige ?? null,
        candidate.graphPrestige === undefined
          ? "No direct citation-graph prestige signal was supplied."
          : "Caller-supplied citation-graph prestige signal.",
      ),
      buildSignal(
        "citationVelocity",
        citationVelocities[inputIndex] !== null,
        citationVelocities[inputIndex] === null
          ? null
          : maximumVelocity > 0
            ? (citationVelocities[inputIndex]! / maximumVelocity) * 100
            : 0,
        citationVelocities[inputIndex] === null
          ? "Both year and citation count are required."
          : `${citationVelocities[inputIndex]!.toFixed(2)} supplied citations per paper-year; normalized within this candidate set.`,
      ),
      markerSignal(
        "methodologyEvidence",
        methodologyText || undefined,
        METHODOLOGY_MARKERS,
      ),
      markerSignal(
        "reproducibility",
        reproducibilityText,
        REPRODUCIBILITY_MARKERS,
        reproducibilityBase,
      ),
    ];
    const availableSignals = signals.filter(
      (signal): signal is FeynmanPaperRankSignal & { value: number } =>
        signal.available && signal.value !== null,
    );
    const availableWeight = availableSignals.reduce(
      (sum, signal) => sum + signal.weight,
      0,
    );
    const score =
      availableWeight > 0
        ? availableSignals.reduce(
            (sum, signal) => sum + signal.value * signal.weight,
            0,
          ) / availableWeight
        : 0;

    return {
      rank: 0,
      inputIndex,
      candidate,
      score: clampScore(score),
      availableWeight: Math.round(availableWeight * 100) / 100,
      signals,
      missingSignals: signals
        .filter((signal) => !signal.available)
        .map((signal) => signal.label),
    } satisfies FeynmanPaperRankedCandidate;
  });

  scored.sort(
    (left, right) =>
      right.score - left.score || left.inputIndex - right.inputIndex,
  );
  scored.forEach((candidate, index) => {
    candidate.rank = index + 1;
  });

  return { topic, ranked: scored };
}

function escapeTableCell(value: string) {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function formatCandidateLink(candidate: FeynmanPaperRankCandidate) {
  const title = escapeTableCell(candidate.title);
  return candidate.url ? `[${title}](${candidate.url})` : title;
}

export function formatFeynmanPaperRank(result: FeynmanPaperRankResult) {
  const lines = [
    "# Feynman PaperRank",
    "",
    `**Read-order question:** ${escapeTableCell(result.topic)}`,
    "",
    "## Ranked reading order",
    "",
    "| Rank | Paper | Score | Available weight | Missing signals |",
    "| ---: | --- | ---: | ---: | --- |",
    ...result.ranked.map(
      (item) =>
        `| ${item.rank} | ${formatCandidateLink(item.candidate)} | ${item.score.toFixed(1)} | ${(item.availableWeight * 100).toFixed(0)}% | ${item.missingSignals.length > 0 ? item.missingSignals.join(", ") : "None"} |`,
    ),
    "",
    "## Score audit",
    "",
  ];

  for (const item of result.ranked) {
    lines.push(
      `### ${item.rank}. ${item.candidate.title}`,
      "",
      ...item.signals.map(
        (signal) =>
          `- **${signal.label} (${Math.round(signal.weight * 100)}%):** ${signal.available && signal.value !== null ? signal.value.toFixed(1) : "missing"} — ${signal.detail}`,
      ),
      `- **Available-signal score:** ${item.score.toFixed(1)} across ${(item.availableWeight * 100).toFixed(0)}% of the formula.`,
      "",
    );
  }

  lines.push(
    "## Formula",
    "",
    "`0.30 topical relevance + 0.20 citation impact + 0.20 graph prestige + 0.10 citation velocity + 0.10 methodology evidence + 0.10 reproducibility`",
    "",
    "Missing components are excluded from that paper's denominator and remain visible above.",
    "",
    "## Limitations",
    "",
    "- This is transparent read-order triage, not peer review, scientific-quality judgment, truth verification, or completed replication.",
    "- Fixed weights are not calibrated to an individual researcher's preferences.",
    "- Citation and graph values are only as reliable as the supplied metadata; Nexus did not fetch or validate them.",
    "- Methodology and reproducibility text markers screen for visible evidence only; read the underlying papers before concluding.",
  );

  return lines.join("\n");
}
