export const DEEP_RESEARCH_SECTION_HEADINGS = [
  "Scope",
  "Core claim",
  "Evidence ledger",
  "Counter-signals",
  "Operator takeaway",
  "Confidence & Gaps",
] as const;

export type DeepResearchSectionHeading =
  (typeof DEEP_RESEARCH_SECTION_HEADINGS)[number];

export interface DeepResearchSections {
  scope: string;
  coreClaim: string;
  evidenceLedger: string;
  counterSignals: string;
  operatorTakeaway: string;
  confidenceAndGaps: string;
}

export interface DeepResearchFetchedSource {
  url: string;
  content: string;
}

export interface DeepResearchWebResult {
  query: string;
  result: string;
}

export interface DeepResearchPipelineInput {
  topic: string;
  paperSignal: string;
  webResults: DeepResearchWebResult[];
  rssSignal: {
    url: string;
    result: string;
  } | null;
  fetchedSources: DeepResearchFetchedSource[];
  failures: string[];
}

export interface DeepResearchDeps {
  hfPapersSearch: (query: string, limit: string) => Promise<string>;
  webSearch: (query: string) => Promise<string>;
  rssFetch: (url: string, limit: string) => Promise<string>;
  fetchUrl: (url: string) => Promise<string>;
  synthesize: (input: DeepResearchPipelineInput) => Promise<string>;
}

const URL_RE = /https?:\/\/[^\s)\]}>"']+/g;
const DEEP_RESEARCH_TRIGGER_RE =
  /(?:\/deepresearch\b|\bdeep research\b|\bfull report\b|\bresearch brief\b|\bdeep dive\b)/i;

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0)));
}

function cleanInline(value: string, max = 220) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1).trimEnd()}…`;
}

function looksLikeToolFailure(value: string) {
  return /^(?:could not|search failed|no results found\.?|hf_papers_search:|rss_fetch:|deep_research:|unknown tool:|.* returned http \d+)/i.test(
    value.trim(),
  );
}

function formatSectionBody(value: string, fallback: string) {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

function extractUrls(value: string) {
  return Array.from(new Set(value.match(URL_RE) ?? []));
}

function extractJsonObject(value: string) {
  const match = value.match(/\{[\s\S]*\}/);
  return match?.[0] ?? "";
}

function toSectionString(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

function buildEvidenceLedgerFallback(input: DeepResearchPipelineInput) {
  const lines: string[] = [];

  if (input.paperSignal.trim()) {
    lines.push(
      `- Papers sweep: ${cleanInline(input.paperSignal, 240)}`,
    );
  }

  for (const webResult of input.webResults) {
    lines.push(
      `- Web angle (${webResult.query}): ${cleanInline(webResult.result, 220)}`,
    );
  }

  if (input.rssSignal?.result.trim()) {
    lines.push(
      `- Feed signal (${input.rssSignal.url}): ${cleanInline(input.rssSignal.result, 220)}`,
    );
  }

  for (const source of input.fetchedSources) {
    lines.push(
      `- ${source.url} — ${cleanInline(source.content, 220)}`,
    );
  }

  if (lines.length === 0) {
    return "- No external evidence could be gathered from the bounded research pipeline.";
  }

  return lines.join("\n");
}

function buildCounterSignalsFallback(input: DeepResearchPipelineInput) {
  const lines: string[] = [];
  const riskAngle = input.webResults.find((result) =>
    /\b(?:risk|counter|critic|limitation)\b/i.test(result.query),
  );

  if (riskAngle?.result.trim()) {
    lines.push(`- Counter-angle query: ${cleanInline(riskAngle.result, 220)}`);
  }

  if (input.failures.length > 0) {
    lines.push(`- Partial failures: ${input.failures.join(" | ")}`);
  }

  if (lines.length === 0) {
    return "- No strong counter-signals surfaced in the bounded source pass.";
  }

  return lines.join("\n");
}

export function hasDeepResearchIntent(input: string) {
  return DEEP_RESEARCH_TRIGGER_RE.test(input);
}

export function buildDeepResearchQueries(topic: string) {
  const normalizedTopic = topic.trim();
  return uniqueStrings([
    normalizedTopic,
    `${normalizedTopic} latest developments`,
    `${normalizedTopic} risks criticism counter-signals`,
  ]).slice(0, 3);
}

export function extractFeedUrlFromTopic(topic: string) {
  return (
    extractUrls(topic).find((url) => /\.(?:rss|xml|atom)(?:$|[?#])/i.test(url)) ??
    null
  );
}

export function buildDeepResearchSynthesisPrompt(
  input: DeepResearchPipelineInput,
) {
  const webBlock =
    input.webResults.length > 0
      ? input.webResults
          .map(
            (result, index) =>
              `ANGLE ${index + 1}: ${result.query}\n${cleanInline(result.result, 1800)}`,
          )
          .join("\n\n")
      : "No web-search results were collected.";

  const sourceBlock =
    input.fetchedSources.length > 0
      ? input.fetchedSources
          .map(
            (source, index) =>
              `SOURCE ${index + 1}: ${source.url}\n${cleanInline(source.content, 1800)}`,
          )
          .join("\n\n")
      : "No source pages were fetched successfully.";

  return [
    "You are NOVA's deep-research synthesis engine for Nexus Prime.",
    "Return JSON only.",
    "Use this exact shape:",
    "{",
    '  "scope": "string",',
    '  "coreClaim": "string",',
    '  "evidenceLedger": "string",',
    '  "counterSignals": "string",',
    '  "operatorTakeaway": "string",',
    '  "confidenceAndGaps": "string"',
    "}",
    "",
    "Rules:",
    "- Keep each field concise but substantive.",
    "- Ground claims in the supplied source material only.",
    "- In evidenceLedger, use bullet-style lines and include inline URLs when helpful.",
    "- In counterSignals, explicitly mention disagreement, weak evidence, or missing source coverage.",
    "- Never invent sources or certainty.",
    "",
    `TOPIC: ${input.topic}`,
    "",
    "PAPER SIGNAL:",
    input.paperSignal.trim() || "No paper signal available.",
    "",
    "WEB ANGLES:",
    webBlock,
    "",
    "RSS SIGNAL:",
    input.rssSignal
      ? `${input.rssSignal.url}\n${cleanInline(input.rssSignal.result, 1800)}`
      : "No RSS feed was relevant or available.",
    "",
    "FETCHED SOURCES:",
    sourceBlock,
    "",
    "PIPELINE FAILURES:",
    input.failures.length > 0 ? input.failures.join(" | ") : "None.",
  ].join("\n");
}

export function parseDeepResearchSections(value: string) {
  const payload = extractJsonObject(value);
  if (!payload) return null;

  try {
    const parsed = JSON.parse(payload) as Record<string, unknown>;
    return {
      scope: toSectionString(parsed.scope, ""),
      coreClaim: toSectionString(parsed.coreClaim, ""),
      evidenceLedger: toSectionString(parsed.evidenceLedger, ""),
      counterSignals: toSectionString(parsed.counterSignals, ""),
      operatorTakeaway: toSectionString(parsed.operatorTakeaway, ""),
      confidenceAndGaps: toSectionString(parsed.confidenceAndGaps, ""),
    } satisfies DeepResearchSections;
  } catch {
    return null;
  }
}

export function formatDeepResearchBrief(sections: DeepResearchSections) {
  const bodies = [
    sections.scope,
    sections.coreClaim,
    sections.evidenceLedger,
    sections.counterSignals,
    sections.operatorTakeaway,
    sections.confidenceAndGaps,
  ];

  return DEEP_RESEARCH_SECTION_HEADINGS.map((heading, index) => {
    const body = bodies[index]?.trim() || "No signal recorded.";
    return `## ${heading}\n${body}`;
  }).join("\n\n");
}

export function buildFallbackDeepResearchSections(
  input: DeepResearchPipelineInput,
): DeepResearchSections {
  const sourceCount = input.fetchedSources.length;
  const webCount = input.webResults.length;
  const rssUsed = input.rssSignal ? "One feed signal was included." : "No feed signal was used.";

  return {
    scope: `Topic: ${input.topic}. The bounded pipeline ran 1 paper sweep, ${webCount} targeted web angle${webCount === 1 ? "" : "s"}, fetched ${sourceCount} source page${sourceCount === 1 ? "" : "s"}, and ${rssUsed.toLowerCase()}`,
    coreClaim:
      sourceCount > 0
        ? `The strongest currently available signal on ${input.topic} is source-backed enough to brief the operator, but synthesis degraded and should be treated as a bounded brief rather than a final verdict.`
        : `Evidence collection on ${input.topic} was incomplete, so this brief should be treated as reconnaissance rather than a settled research conclusion.`,
    evidenceLedger: buildEvidenceLedgerFallback(input),
    counterSignals: buildCounterSignalsFallback(input),
    operatorTakeaway:
      sourceCount > 0
        ? "Use the evidence ledger as the working source list, reopen the strongest sources first, and rerun deep research if the topic changes materially."
        : "Retry with a narrower topic or stronger public source anchors before making a durable operating decision from this brief.",
    confidenceAndGaps:
      input.failures.length > 0
        ? `LOW to MEDIUM — the pipeline returned usable signal, but partial failures remain: ${input.failures.join(" | ")}`
        : sourceCount > 0
          ? "MEDIUM — multiple sources were gathered, but the final synthesis fell back to a deterministic bounded brief."
          : "LOW — the pipeline could not gather enough source material to support a stronger conclusion.",
  };
}

export async function runDeepResearch(
  topic: string,
  deps: DeepResearchDeps,
) {
  const normalizedTopic = topic.trim();
  if (!normalizedTopic) {
    return formatDeepResearchBrief({
      scope: "No research topic was provided.",
      coreClaim: "A deep-research brief cannot run without a topic or question.",
      evidenceLedger: "- No evidence was gathered.",
      counterSignals: "- No counter-signals were evaluated.",
      operatorTakeaway: "Retry with a concrete topic or question.",
      confidenceAndGaps: "LOW — missing topic.",
    });
  }

  const failures: string[] = [];

  let paperSignal = "";
  try {
    paperSignal = await deps.hfPapersSearch(normalizedTopic, "4");
    if (looksLikeToolFailure(paperSignal)) {
      failures.push(`hf_papers_search returned: ${cleanInline(paperSignal, 120)}`);
      paperSignal = "";
    }
  } catch {
    failures.push("hf_papers_search failed");
  }

  const webQueries = buildDeepResearchQueries(normalizedTopic);
  const webResults: DeepResearchWebResult[] = [];
  for (const query of webQueries) {
    try {
      const result = await deps.webSearch(query);
      if (looksLikeToolFailure(result)) {
        failures.push(`web_search returned: ${cleanInline(result, 120)}`);
        continue;
      }
      webResults.push({
        query,
        result,
      });
    } catch {
      failures.push(`web_search failed for "${query}"`);
    }
  }

  const rssUrl = extractFeedUrlFromTopic(normalizedTopic);
  let rssSignal: DeepResearchPipelineInput["rssSignal"] = null;
  if (rssUrl) {
    try {
      const result = await deps.rssFetch(rssUrl, "5");
      if (looksLikeToolFailure(result)) {
        failures.push(`rss_fetch returned: ${cleanInline(result, 120)}`);
      } else {
        rssSignal = {
          url: rssUrl,
          result,
        };
      }
    } catch {
      failures.push(`rss_fetch failed for ${rssUrl}`);
    }
  }

  const candidateUrls = uniqueStrings(
    [paperSignal, ...webResults.map((result) => result.result), rssSignal?.result ?? ""]
      .flatMap((value) => extractUrls(value)),
  ).slice(0, 4);

  const fetchedSources: DeepResearchFetchedSource[] = [];
  for (const url of candidateUrls) {
    try {
      const content = await deps.fetchUrl(url);
      if (looksLikeToolFailure(content)) {
        failures.push(`fetch_url returned: ${cleanInline(content, 120)}`);
        continue;
      }
      fetchedSources.push({
        url,
        content,
      });
    } catch {
      failures.push(`fetch_url failed for ${url}`);
    }
  }

  const pipelineInput: DeepResearchPipelineInput = {
    topic: normalizedTopic,
    paperSignal,
    webResults,
    rssSignal,
    fetchedSources,
    failures,
  };

  try {
    const synthesized = await deps.synthesize(pipelineInput);
    const parsed = parseDeepResearchSections(synthesized);
    if (parsed) {
      return formatDeepResearchBrief({
        scope: formatSectionBody(parsed.scope, `Topic: ${normalizedTopic}.`),
        coreClaim: formatSectionBody(
          parsed.coreClaim,
          "No stable core claim could be synthesized.",
        ),
        evidenceLedger: formatSectionBody(
          parsed.evidenceLedger,
          buildEvidenceLedgerFallback(pipelineInput),
        ),
        counterSignals: formatSectionBody(
          parsed.counterSignals,
          buildCounterSignalsFallback(pipelineInput),
        ),
        operatorTakeaway: formatSectionBody(
          parsed.operatorTakeaway,
          "Treat this as a bounded research brief and reopen the strongest evidence first.",
        ),
        confidenceAndGaps: formatSectionBody(
          parsed.confidenceAndGaps,
          buildFallbackDeepResearchSections(pipelineInput).confidenceAndGaps,
        ),
      });
    }
    failures.push("AI synthesis returned an invalid JSON payload");
  } catch {
    failures.push("AI synthesis failed");
  }

  return formatDeepResearchBrief(
    buildFallbackDeepResearchSections({
      ...pipelineInput,
      failures,
    }),
  );
}
