export interface StructuredEvidenceAnswer {
  summary: string;
  observed: string[];
  inferred: string[];
  verifyNext: string[];
  actions: string[];
  score: number | null;
}

export interface InlineEvidencePosture {
  mainText: string;
  observed: string[];
  inferred: string[];
  verifyNext: string[];
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter(Boolean)
    .slice(0, 4);
}

function normalizeFiniteNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

function normalizeInlineSection(lines: string[]): string[] {
  const entries: string[] = [];
  let current = "";
  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      if (current) {
        entries.push(current.trim());
        current = "";
      }
      continue;
    }

    const bullet = trimmed.match(/^(?:[-*•]\s+|\d+\.\s+)(.+)$/);
    const content = (bullet?.[1] ?? trimmed).trim();
    if (!content) continue;

    if (bullet) {
      if (current) entries.push(current.trim());
      current = content;
      continue;
    }

    current = current ? `${current} ${content}` : content;
  }

  if (current) entries.push(current.trim());
  return entries.filter(Boolean).slice(0, 4);
}

function getInlineEvidenceHeading(
  line: string,
): "observed" | "inferred" | "verifyNext" | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  if (/^(?:#{1,6}\s*)?(?:\*\*)?observed(?:\*\*)?\s*:?\s*$/i.test(trimmed)) {
    return "observed";
  }
  if (/^(?:#{1,6}\s*)?(?:\*\*)?inferred(?:\*\*)?\s*:?\s*$/i.test(trimmed)) {
    return "inferred";
  }
  if (
    /^(?:#{1,6}\s*)?(?:\*\*)?verify(?:\s|-)?next(?:\*\*)?\s*:?\s*$/i.test(trimmed)
  ) {
    return "verifyNext";
  }
  return null;
}

export function extractJsonObject(raw: string): string | null {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const objectStart = trimmed.indexOf("{");
  const objectEnd = trimmed.lastIndexOf("}");
  if (objectStart >= 0 && objectEnd > objectStart) {
    return trimmed.slice(objectStart, objectEnd + 1);
  }
  return null;
}

export function parseStructuredEvidenceAnswer(
  raw: string,
  summaryKeys: string[],
): StructuredEvidenceAnswer | null {
  const payload = extractJsonObject(raw);
  if (!payload) return null;

  try {
    const parsed = JSON.parse(payload) as Record<string, unknown>;
    const summary = summaryKeys
      .map((key) => {
        const value = parsed[key];
        return typeof value === "string" ? value.trim() : "";
      })
      .find(Boolean);

    if (!summary) return null;

    return {
      summary,
      observed: normalizeStringList(parsed.observed),
      inferred: normalizeStringList(parsed.inferred),
      verifyNext: normalizeStringList(parsed.verifyNext),
      actions: normalizeStringList(parsed.actions),
      score: normalizeFiniteNumber(parsed.score),
    };
  } catch {
    return null;
  }
}

export function parseInlineEvidencePosture(raw: string): InlineEvidencePosture | null {
  const lines = raw.replace(/\r\n?/g, "\n").split("\n");
  const bodyLines: string[] = [];
  const sections = {
    observed: [] as string[],
    inferred: [] as string[],
    verifyNext: [] as string[],
  };
  let activeSection: keyof typeof sections | null = null;
  let headingCount = 0;

  for (const line of lines) {
    const heading = getInlineEvidenceHeading(line);
    if (heading) {
      activeSection = heading;
      headingCount += 1;
      continue;
    }
    if (activeSection) {
      sections[activeSection].push(line);
    } else {
      bodyLines.push(line);
    }
  }

  if (headingCount < 2) return null;

  const observed = normalizeInlineSection(sections.observed);
  const inferred = normalizeInlineSection(sections.inferred);
  const verifyNext = normalizeInlineSection(sections.verifyNext);
  if (observed.length === 0 && inferred.length === 0 && verifyNext.length === 0) {
    return null;
  }

  const mainText = bodyLines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return {
    mainText: mainText || raw.trim(),
    observed,
    inferred,
    verifyNext,
  };
}

export function buildStructuredEvidenceInstruction(opts: {
  summaryKey: string;
  summaryLabel: string;
  summaryLimitHint: string;
  extraFields?: Array<{
    key: string;
    example: string;
    rule: string;
  }>;
}) {
  const { summaryKey, summaryLabel, summaryLimitHint, extraFields = [] } = opts;
  const objectLines = [
    `  "${summaryKey}": "${summaryLabel}"`,
    `  "observed": ["fact explicitly present in the prompt"]`,
    `  "inferred": ["interpretation or recommendation derived from those facts"]`,
    `  "verifyNext": ["concise follow-up check"]`,
    ...extraFields.map((field) => `  "${field.key}": ${field.example}`),
  ];
  const rules = [
    `- "${summaryKey}" must stay ${summaryLimitHint}.`,
    `- "observed" may only contain facts explicitly present in the prompt.`,
    `- "inferred" should contain compact reasoning, implications, or recommendations.`,
    `- "verifyNext" should contain 1-3 concise checks that would improve confidence.`,
    ...extraFields.map((field) => `- ${field.rule}`),
  ];

  return `Return valid JSON only, no markdown fences:
{
${objectLines.join(",\n")}
}

Rules:
${rules.join("\n")}`;
}
