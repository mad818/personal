import type { FeynmanWorkflowId } from "./feynmanResearch.ts";

export type FeynmanResearchQueryWave = "initial" | "refinement";

export interface FeynmanResearchQuery {
  id: string;
  wave: FeynmanResearchQueryWave;
  angle: string;
  query: string;
  recencyDays?: number;
  domainFilters?: string[];
}

export interface FeynmanProgressiveWebResult {
  query: string;
  renderedQuery: string;
  wave: FeynmanResearchQueryWave;
  angle: string;
  result: string;
  recencyDays?: number;
  domainFilters?: string[];
}

export interface FeynmanCoverageThresholds {
  discoveredSources: number;
  directlyReadSources: number;
  highConfidenceDirectSources: number;
}

export interface FeynmanCoveragePolicy extends FeynmanCoverageThresholds {
  maximumInitialQueries: number;
  maximumRefinementQueries: number;
  maximumQueryWaves: number;
  maximumDirectReads: number;
}

export interface FeynmanProgressiveCoverage {
  thresholds: FeynmanCoverageThresholds;
  discoveredSources: number;
  directlyReadSources: number;
  highConfidenceDirectSources: number;
  queryWaves: number;
  initialQueries: number;
  refinementQueries: number;
  refinementRequired: boolean;
  sufficient: boolean;
  gaps: string[];
}

export interface FeynmanProgressiveResearchResult {
  paperSignal: string;
  webResults: FeynmanProgressiveWebResult[];
  fetchedSources: Array<{ url: string; content: string }>;
  failures: string[];
  coverage: FeynmanProgressiveCoverage;
}

export interface FeynmanProgressiveResearchDeps {
  searchPapers: (query: string, limit: string) => Promise<string>;
  webSearch: (query: string) => Promise<string>;
  fetchUrl: (url: string) => Promise<string>;
  inspectHuggingFace?: (
    topic: string,
  ) => Promise<{ url: string; content: string } | null>;
  progress?: (note: string) => Promise<void> | void;
}

export const DEFAULT_FEYNMAN_COVERAGE_POLICY: FeynmanCoveragePolicy = {
  discoveredSources: 5,
  directlyReadSources: 3,
  highConfidenceDirectSources: 2,
  maximumInitialQueries: 4,
  maximumRefinementQueries: 3,
  maximumQueryWaves: 2,
  maximumDirectReads: 8,
};

const URL_RE = /https?:\/\/[^\s)\]}>"']+/g;
const DAY_MS = 24 * 60 * 60 * 1000;
const REFINEMENT_STOPWORDS = new Set([
  "about",
  "after",
  "against",
  "analysis",
  "before",
  "could",
  "evidence",
  "fixture",
  "from",
  "https",
  "initial",
  "methodology",
  "official",
  "paper",
  "primary",
  "progressive",
  "report",
  "research",
  "result",
  "source",
  "strong",
  "their",
  "there",
  "these",
  "those",
  "through",
  "weak",
  "which",
  "with",
]);

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function extractUrls(value: string) {
  return uniqueStrings(value.match(URL_RE) ?? []);
}

function isToolFailure(value: string) {
  return /^(?:could not|search failed|no results found\.?|unknown tool:|.* returned http \d+)/i.test(
    value.trim(),
  );
}

function normalizedQuery(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function authoritativeDomains(workflow: FeynmanWorkflowId) {
  if (workflow === "replicate" || workflow === "recipe" || workflow === "audit") {
    return ["github.com", "arxiv.org", ".gov", ".edu"];
  }
  return ["arxiv.org", "doi.org", ".gov", ".edu"];
}

function workflowEvidenceQuery(workflow: FeynmanWorkflowId, topic: string) {
  switch (workflow) {
    case "lit-review":
      return `${topic} literature review methodology findings`;
    case "audit":
      return `${topic} claim evidence documentation implementation`;
    case "replicate":
      return `${topic} methodology code dataset benchmark`;
    case "recipe":
      return `${topic} implementation method dataset repository`;
    case "review":
      return `${topic} peer review methodology criticism`;
    case "compare":
      return `${topic} comparison evidence tradeoffs`;
    case "watch":
      return `${topic} latest material changes`;
    default:
      return `${topic} primary evidence`;
  }
}

function isFastMovingWorkflow(workflow: FeynmanWorkflowId) {
  return workflow === "deepresearch" || workflow === "watch";
}

export function buildInitialFeynmanResearchQueries(
  workflow: FeynmanWorkflowId,
  topic: string,
  _now = Date.now(),
) {
  const normalizedTopic = topic.trim() || "Unspecified research topic";
  const recencyDays = isFastMovingWorkflow(workflow) ? 30 : undefined;
  const queries: FeynmanResearchQuery[] = [
    {
      id: "initial-landscape",
      wave: "initial",
      angle: "landscape",
      query: normalizedTopic,
    },
    {
      id: "initial-workflow-evidence",
      wave: "initial",
      angle: "workflow-evidence",
      query: workflowEvidenceQuery(workflow, normalizedTopic),
    },
    {
      id: "initial-counter-evidence",
      wave: "initial",
      angle: "counter-evidence",
      query: `${normalizedTopic} counter evidence limitations criticism`,
    },
    {
      id: "initial-authoritative-current",
      wave: "initial",
      angle: "authoritative-current",
      query: `${normalizedTopic} authoritative source`,
      ...(recencyDays ? { recencyDays } : {}),
      domainFilters: authoritativeDomains(workflow),
    },
  ];
  return queries.slice(0, DEFAULT_FEYNMAN_COVERAGE_POLICY.maximumInitialQueries);
}

export function renderFeynmanResearchQuery(
  query: FeynmanResearchQuery,
  now = Date.now(),
) {
  const parts = [query.query.trim()];
  if (query.recencyDays && query.recencyDays > 0) {
    parts.push(
      `after:${new Date(now - query.recencyDays * DAY_MS).toISOString().slice(0, 10)}`,
    );
  }
  if (query.domainFilters?.length) {
    parts.push(
      `(${uniqueStrings(query.domainFilters).map((domain) => `site:${domain}`).join(" OR ")})`,
    );
  }
  return parts.filter(Boolean).join(" ");
}

function isHighConfidenceUrl(url: string) {
  try {
    const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    return (
      hostname.endsWith(".gov") ||
      hostname.endsWith(".edu") ||
      hostname === "arxiv.org" ||
      hostname === "doi.org" ||
      hostname.includes("pubmed") ||
      hostname.includes("semanticscholar") ||
      hostname.startsWith("docs.") ||
      hostname.startsWith("developer.") ||
      hostname.includes("standards")
    );
  } catch {
    return false;
  }
}

export function prioritizeFeynmanCandidateUrls(urls: string[]) {
  return uniqueStrings(urls)
    .map((url, index) => ({
      url,
      index,
      priority: isHighConfidenceUrl(url)
        ? 0
        : /github\.com|gitlab\.com/i.test(url)
          ? 1
          : 2,
    }))
    .sort((left, right) => left.priority - right.priority || left.index - right.index)
    .map((entry) => entry.url);
}

export function assessFeynmanCoverage(input: {
  paperSignal: string;
  webResults: FeynmanProgressiveWebResult[];
  fetchedSources: Array<{ url: string; content: string }>;
  policy?: FeynmanCoveragePolicy;
  queryWaves: number;
  initialQueries: number;
  refinementQueries: number;
  refinementRequired: boolean;
}) {
  const policy = input.policy ?? DEFAULT_FEYNMAN_COVERAGE_POLICY;
  const discoveredUrls = uniqueStrings([
    ...extractUrls(input.paperSignal),
    ...input.webResults.flatMap((result) => extractUrls(result.result)),
  ]);
  const directlyReadUrls = uniqueStrings(
    input.fetchedSources
      .filter((source) => source.content.trim().length > 0)
      .map((source) => source.url),
  );
  const highConfidenceDirectSources = directlyReadUrls.filter(isHighConfidenceUrl).length;
  const gaps: string[] = [];
  if (discoveredUrls.length < policy.discoveredSources) {
    gaps.push(`discovered sources ${discoveredUrls.length}/${policy.discoveredSources}`);
  }
  if (directlyReadUrls.length < policy.directlyReadSources) {
    gaps.push(`directly read sources ${directlyReadUrls.length}/${policy.directlyReadSources}`);
  }
  if (highConfidenceDirectSources < policy.highConfidenceDirectSources) {
    gaps.push(
      `high-confidence direct sources ${highConfidenceDirectSources}/${policy.highConfidenceDirectSources}`,
    );
  }
  return {
    thresholds: {
      discoveredSources: policy.discoveredSources,
      directlyReadSources: policy.directlyReadSources,
      highConfidenceDirectSources: policy.highConfidenceDirectSources,
    },
    discoveredSources: discoveredUrls.length,
    directlyReadSources: directlyReadUrls.length,
    highConfidenceDirectSources,
    queryWaves: Math.min(input.queryWaves, policy.maximumQueryWaves),
    initialQueries: Math.min(input.initialQueries, policy.maximumInitialQueries),
    refinementQueries: Math.min(input.refinementQueries, policy.maximumRefinementQueries),
    refinementRequired: input.refinementRequired,
    sufficient: gaps.length === 0,
    gaps,
  } satisfies FeynmanProgressiveCoverage;
}

function extractRefinementTerms(topic: string, webResults: FeynmanProgressiveWebResult[]) {
  const topicTerms = new Set(
    topic.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean),
  );
  const candidates = webResults
    .flatMap((result) =>
      result.result
        .replace(URL_RE, " ")
        .split(/[^A-Za-z0-9-]+/)
        .map((term) => term.toLowerCase()),
    )
    .filter(
      (term) =>
        term.length >= 5 &&
        !topicTerms.has(term) &&
        !REFINEMENT_STOPWORDS.has(term) &&
        !/^\d+$/.test(term),
    );
  return uniqueStrings(candidates).slice(0, 3);
}

export function buildRefinementFeynmanResearchQueries(input: {
  workflow: FeynmanWorkflowId;
  topic: string;
  initialQueries: FeynmanResearchQuery[];
  webResults: FeynmanProgressiveWebResult[];
  coverage: FeynmanProgressiveCoverage;
  now?: number;
}) {
  if (input.coverage.sufficient) return [];
  const terms = extractRefinementTerms(input.topic, input.webResults);
  const anchor = terms.slice(0, 2).join(" ") || "authoritative";
  const recencyDays = isFastMovingWorkflow(input.workflow) ? 30 : undefined;
  const candidates: FeynmanResearchQuery[] = [];
  if (
    input.coverage.discoveredSources <
    input.coverage.thresholds.discoveredSources
  ) {
    candidates.push({
      id: "refinement-coverage",
      wave: "refinement",
      angle: "coverage-gap",
      query: `${input.topic} ${anchor} primary source evidence`,
      ...(recencyDays ? { recencyDays } : {}),
    });
  }
  if (
    input.coverage.highConfidenceDirectSources <
    input.coverage.thresholds.highConfidenceDirectSources
  ) {
    candidates.push({
      id: "refinement-authoritative",
      wave: "refinement",
      angle: "authoritative-gap",
      query: `${input.topic} ${anchor} official research`,
      domainFilters: authoritativeDomains(input.workflow),
    });
  }
  if (
    input.coverage.directlyReadSources <
    input.coverage.thresholds.directlyReadSources
  ) {
    candidates.push({
      id: "refinement-methodology",
      wave: "refinement",
      angle: "direct-read-gap",
      query: `${input.topic} ${anchor} methodology documentation`,
      domainFilters: ["github.com", "arxiv.org", ".edu"],
    });
  }

  const initialNormalized = new Set(
    input.initialQueries.map((query) => normalizedQuery(query.query)),
  );
  const seen = new Set<string>();
  return candidates
    .filter((query) => {
      const normalized = normalizedQuery(query.query);
      if (initialNormalized.has(normalized) || seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    })
    .slice(0, DEFAULT_FEYNMAN_COVERAGE_POLICY.maximumRefinementQueries);
}

async function emitProgress(
  deps: FeynmanProgressiveResearchDeps,
  note: string,
) {
  try {
    await deps.progress?.(note);
  } catch {
    // Collection progress is best-effort.
  }
}

async function runQueryWave(input: {
  queries: FeynmanResearchQuery[];
  deps: FeynmanProgressiveResearchDeps;
  now: number;
  failures: string[];
}) {
  const settled = await Promise.allSettled(
    input.queries.map(async (query) => ({
      query,
      renderedQuery: renderFeynmanResearchQuery(query, input.now),
      result: await input.deps.webSearch(
        renderFeynmanResearchQuery(query, input.now),
      ),
    })),
  );
  const results: FeynmanProgressiveWebResult[] = [];
  settled.forEach((entry, index) => {
    const query = input.queries[index];
    if (!query) return;
    if (entry.status === "rejected") {
      input.failures.push(`web search failed for "${query.query}"`);
      return;
    }
    if (isToolFailure(entry.value.result)) {
      input.failures.push(
        `web search returned for "${query.query}": ${entry.value.result.trim().slice(0, 120)}`,
      );
      return;
    }
    results.push({
      query: query.query,
      renderedQuery: entry.value.renderedQuery,
      wave: query.wave,
      angle: query.angle,
      result: entry.value.result,
      ...(query.recencyDays ? { recencyDays: query.recencyDays } : {}),
      ...(query.domainFilters ? { domainFilters: query.domainFilters } : {}),
    });
  });
  return results;
}

async function readCandidateUrls(input: {
  urls: string[];
  deps: FeynmanProgressiveResearchDeps;
  failures: string[];
}) {
  const settled = await Promise.allSettled(
    input.urls.map(async (url) => ({
      url,
      content: await input.deps.fetchUrl(url),
    })),
  );
  const fetchedSources: Array<{ url: string; content: string }> = [];
  settled.forEach((entry, index) => {
    const url = input.urls[index];
    if (!url) return;
    if (entry.status === "rejected") {
      input.failures.push(`source read failed for ${url}`);
      return;
    }
    if (isToolFailure(entry.value.content)) {
      input.failures.push(
        `source read returned for ${url}: ${entry.value.content.trim().slice(0, 120)}`,
      );
      return;
    }
    fetchedSources.push(entry.value);
  });
  return fetchedSources;
}

export async function runFeynmanProgressiveResearch(input: {
  workflow: FeynmanWorkflowId;
  topic: string;
  deps: FeynmanProgressiveResearchDeps;
  policy?: FeynmanCoveragePolicy;
  now?: number;
}): Promise<FeynmanProgressiveResearchResult> {
  const now = input.now ?? Date.now();
  const policy = input.policy ?? DEFAULT_FEYNMAN_COVERAGE_POLICY;
  const failures: string[] = [];
  const initialQueries = buildInitialFeynmanResearchQueries(
    input.workflow,
    input.topic,
    now,
  ).slice(0, policy.maximumInitialQueries);
  await emitProgress(
    input.deps,
    `Initial research wave started with ${initialQueries.length} varied web lanes plus one paper lane.`,
  );

  const huggingFaceInspectionPromise = input.deps.inspectHuggingFace
    ? input.deps.inspectHuggingFace(input.topic)
    : Promise.resolve(null);
  const [initialSettled, huggingFaceInspectionSettled] = await Promise.all([
    Promise.allSettled([
      input.deps.searchPapers(input.topic, "6"),
      ...initialQueries.map((query) =>
        input.deps.webSearch(renderFeynmanResearchQuery(query, now)),
      ),
    ]),
    Promise.allSettled([huggingFaceInspectionPromise]),
  ]);
  let paperSignal = "";
  const paperEntry = initialSettled[0];
  if (paperEntry?.status === "fulfilled" && !isToolFailure(paperEntry.value)) {
    paperSignal = paperEntry.value;
  } else {
    failures.push(
      paperEntry?.status === "fulfilled"
        ? `paper search returned: ${paperEntry.value.trim().slice(0, 120)}`
        : "paper search failed",
    );
  }
  const webResults: FeynmanProgressiveWebResult[] = [];
  initialSettled.slice(1).forEach((entry, index) => {
    const query = initialQueries[index];
    if (!query) return;
    if (entry.status === "rejected") {
      failures.push(`web search failed for "${query.query}"`);
      return;
    }
    if (isToolFailure(entry.value)) {
      failures.push(
        `web search returned for "${query.query}": ${entry.value.trim().slice(0, 120)}`,
      );
      return;
    }
    webResults.push({
      query: query.query,
      renderedQuery: renderFeynmanResearchQuery(query, now),
      wave: "initial",
      angle: query.angle,
      result: entry.value,
      ...(query.recencyDays ? { recencyDays: query.recencyDays } : {}),
      ...(query.domainFilters ? { domainFilters: query.domainFilters } : {}),
    });
  });

  const huggingFaceSources: Array<{ url: string; content: string }> = [];
  const huggingFaceEntry = huggingFaceInspectionSettled[0];
  if (
    huggingFaceEntry?.status === "fulfilled" &&
    huggingFaceEntry.value?.url &&
    huggingFaceEntry.value.content.trim()
  ) {
    huggingFaceSources.push(huggingFaceEntry.value);
  } else if (huggingFaceEntry?.status === "rejected") {
    failures.push("Hugging Face repository inspection failed.");
  }

  const attemptedUrls = new Set<string>(
    huggingFaceSources.map((source) => source.url),
  );
  const initialUrls = prioritizeFeynmanCandidateUrls([
    ...extractUrls(paperSignal),
    ...webResults.flatMap((result) => extractUrls(result.result)),
  ])
    .filter((url) => !attemptedUrls.has(url))
    .slice(
      0,
      Math.max(0, policy.maximumDirectReads - huggingFaceSources.length),
    );
  initialUrls.forEach((url) => attemptedUrls.add(url));
  const fetchedSources = [
    ...huggingFaceSources,
    ...(await readCandidateUrls({
      urls: initialUrls,
      deps: input.deps,
      failures,
    })),
  ];
  let coverage = assessFeynmanCoverage({
    paperSignal,
    webResults,
    fetchedSources,
    policy,
    queryWaves: 1,
    initialQueries: initialQueries.length,
    refinementQueries: 0,
    refinementRequired: false,
  });
  await emitProgress(
    input.deps,
    `Initial wave coverage: ${coverage.discoveredSources} discovered, ${coverage.directlyReadSources} directly read, ${coverage.highConfidenceDirectSources} high-confidence direct.`,
  );

  if (!coverage.sufficient && policy.maximumQueryWaves > 1) {
    const refinementQueries = buildRefinementFeynmanResearchQueries({
      workflow: input.workflow,
      topic: input.topic,
      initialQueries,
      webResults,
      coverage: { ...coverage, refinementRequired: true },
      now,
    }).slice(0, policy.maximumRefinementQueries);
    if (refinementQueries.length > 0) {
      await emitProgress(
        input.deps,
        `Refinement wave started with ${refinementQueries.length} gap-targeted lanes.`,
      );
      const refinementResults = await runQueryWave({
        queries: refinementQueries,
        deps: input.deps,
        now,
        failures,
      });
      webResults.push(...refinementResults);
      const remainingReads = Math.max(
        0,
        policy.maximumDirectReads - attemptedUrls.size,
      );
      const refinementUrls = prioritizeFeynmanCandidateUrls(
        refinementResults.flatMap((result) => extractUrls(result.result)),
      )
        .filter((url) => !attemptedUrls.has(url))
        .slice(0, remainingReads);
      refinementUrls.forEach((url) => attemptedUrls.add(url));
      fetchedSources.push(
        ...(await readCandidateUrls({
          urls: refinementUrls,
          deps: input.deps,
          failures,
        })),
      );
      coverage = assessFeynmanCoverage({
        paperSignal,
        webResults,
        fetchedSources,
        policy,
        queryWaves: 2,
        initialQueries: initialQueries.length,
        refinementQueries: refinementQueries.length,
        refinementRequired: true,
      });
    }
  }

  await emitProgress(
    input.deps,
    coverage.sufficient
      ? `Coverage threshold met after ${coverage.queryWaves} wave${coverage.queryWaves === 1 ? "" : "s"}.`
      : `Coverage remains weak after ${coverage.queryWaves} wave${coverage.queryWaves === 1 ? "" : "s"}: ${coverage.gaps.join(" | ")}.`,
  );
  return { paperSignal, webResults, fetchedSources, failures, coverage };
}
