import {
  buildInitialFeynmanResearchQueries,
  runFeynmanProgressiveResearch,
  type FeynmanProgressiveCoverage,
  type FeynmanProgressiveWebResult,
} from "./feynmanProgressiveResearch.ts";
import {
  parseFeynmanPaperSearchFilters,
  applyFeynmanPaperSearchFilters,
} from "./feynmanAcademicFilters.ts";

export type FeynmanWorkflowId =
  | "deepresearch"
  | "lit-review"
  | "review"
  | "audit"
  | "replicate"
  | "recipe"
  | "compare"
  | "draft"
  | "autoresearch"
  | "watch";

export type FeynmanAgentStage =
  | "researcher"
  | "writer"
  | "verifier"
  | "reviewer";

export type FeynmanClaimVerdict =
  | "supported"
  | "partial"
  | "conflicting"
  | "unsupported"
  | "unverifiable";

export type FeynmanReviewSeverity = "fatal" | "major" | "minor";

export type FeynmanSourceKind =
  | "paper"
  | "official"
  | "repository"
  | "primary"
  | "secondary"
  | "self-reported"
  | "unknown";

export interface FeynmanSource {
  id: string;
  title: string;
  url: string;
  kind: FeynmanSourceKind;
  confidence: "high" | "medium" | "low";
  keyClaim: string;
  accepted: boolean;
  rejectionReason?: string;
}

export interface FeynmanClaimAudit {
  id: string;
  claim: string;
  sourceIds: string[];
  verdict: FeynmanClaimVerdict;
  rationale: string;
}

export interface FeynmanReviewFinding {
  severity: FeynmanReviewSeverity;
  issue: string;
  recommendation: string;
}

export interface FeynmanResearchInput {
  workflow: FeynmanWorkflowId;
  topic: string;
  paperSignal: string;
  webResults: FeynmanProgressiveWebResult[];
  fetchedSources: Array<{ url: string; content: string }>;
  coverage: FeynmanProgressiveCoverage;
  failures: string[];
}

export interface FeynmanWriterResult {
  title: string;
  summary: string;
  synthesis: string;
  methodology: string;
  disagreements: string;
  openQuestions: string;
  nextAction: string;
  claims: Array<{ claim: string; sourceIds: string[] }>;
}

export interface FeynmanResearchResult {
  workflow: FeynmanWorkflowId;
  topic: string;
  report: string;
  sources: FeynmanSource[];
  claims: FeynmanClaimAudit[];
  reviewFindings: FeynmanReviewFinding[];
  coverage: FeynmanProgressiveCoverage;
  failures: string[];
  stageStatus: Record<FeynmanAgentStage, "complete" | "degraded">;
  approvalRequired: boolean;
}

export interface FeynmanResearchProgressEvent {
  stage: "workflow" | FeynmanAgentStage;
  status: "started" | "complete" | "degraded";
  note: string;
}

export interface FeynmanResearchDeps {
  searchPapers: (query: string, limit: string) => Promise<string>;
  webSearch: (query: string) => Promise<string>;
  fetchUrl: (url: string) => Promise<string>;
  inspectHuggingFace?: (
    topic: string,
  ) => Promise<{ url: string; content: string } | null>;
  write: (prompt: string) => Promise<string>;
  verify: (prompt: string) => Promise<string>;
  review: (prompt: string) => Promise<string>;
  progress?: (event: FeynmanResearchProgressEvent) => Promise<void> | void;
}

const URL_RE = /https?:\/\/[^\s)\]}>"']+/g;

const WORKFLOW_LABELS: Record<FeynmanWorkflowId, string> = {
  deepresearch: "Deep Research",
  "lit-review": "Literature Review",
  review: "Peer Review",
  audit: "Claim And Artifact Audit",
  replicate: "Experiment Replication",
  recipe: "Implementation Recipe",
  compare: "Source Comparison",
  draft: "Research Draft",
  autoresearch: "Autoresearch Plan",
  watch: "Research Watch",
};

const EXECUTION_GATED_WORKFLOWS = new Set<FeynmanWorkflowId>([
  "replicate",
  "autoresearch",
]);

async function emitProgress(
  deps: FeynmanResearchDeps,
  event: FeynmanResearchProgressEvent,
) {
  try {
    await deps.progress?.(event);
  } catch {
    // Continuity logging is best-effort and must not block research.
  }
}

function uniqueStrings(values: string[]) {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  );
}

function cleanInline(value: string, max = 220) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1).trimEnd()}…`;
}

function extractUrls(value: string) {
  return uniqueStrings(value.match(URL_RE) ?? []);
}

function extractJsonObject(value: string) {
  const match = value.match(/\{[\s\S]*\}/);
  return match?.[0] ?? "";
}

function inferSourceKind(url: string): FeynmanSourceKind {
  const lower = url.toLowerCase();
  if (
    /arxiv\.org|doi\.org|pubmed|semanticscholar|huggingface\.co\/papers/.test(
      lower,
    )
  ) {
    return "paper";
  }
  if (/github\.com|gitlab\.com/.test(lower)) return "repository";
  if (/\.gov(?:\/|$)|\.edu(?:\/|$)|docs\.|developer\.|standards?/.test(lower)) {
    return "official";
  }
  if (/medium\.com|substack\.com|reddit\.com|x\.com|twitter\.com/.test(lower)) {
    return "self-reported";
  }
  return "secondary";
}

function sourceConfidence(
  kind: FeynmanSourceKind,
): FeynmanSource["confidence"] {
  if (kind === "paper" || kind === "official" || kind === "primary")
    return "high";
  if (kind === "repository" || kind === "secondary") return "medium";
  return "low";
}

function sourceTitle(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./i, "");
  } catch {
    return cleanInline(url, 80);
  }
}

function workflowPurpose(workflow: FeynmanWorkflowId) {
  switch (workflow) {
    case "lit-review":
      return "Map consensus, disagreements, methodology quality, and open research gaps.";
    case "review":
      return "Simulate a rigorous peer review with severity-graded findings and revision guidance.";
    case "audit":
      return "Compare claims against direct sources, documentation, repositories, and conflicting evidence.";
    case "replicate":
      return "Produce a reproducible experiment plan, resource estimate, metrics, and stop conditions without executing it.";
    case "recipe":
      return "Rank implementable methods with datasets, code anchors, tradeoffs, and verification status.";
    case "compare":
      return "Build an evidence-grounded agreement and disagreement matrix.";
    case "draft":
      return "Turn gathered findings into a paper-style source-grounded draft.";
    case "autoresearch":
      return "Define a bounded experiment loop, one measurable objective, variants, and approval gates without executing it.";
    case "watch":
      return "Define a recurring source watch, material-change rules, and human-gated scheduler handoff.";
    default:
      return "Investigate a focused question until the bounded source pass is sufficient or exhausted.";
  }
}

export function buildFeynmanQueries(
  workflow: FeynmanWorkflowId,
  topic: string,
) {
  return buildInitialFeynmanResearchQueries(workflow, topic).map(
    (query) => query.query,
  );
}

function buildSourceLedger(input: FeynmanResearchInput): FeynmanSource[] {
  const contentByUrl = new Map(
    input.fetchedSources.map((source) => [source.url, source.content]),
  );
  const urls = uniqueStrings([
    ...input.fetchedSources.map((source) => source.url),
    ...extractUrls(input.paperSignal),
    ...input.webResults.flatMap((result) => extractUrls(result.result)),
  ]).slice(0, 12);

  return urls.map((url, index) => {
    const kind = inferSourceKind(url);
    const content = contentByUrl.get(url) ?? "";
    return {
      id: `S${index + 1}`,
      title: sourceTitle(url),
      url,
      kind,
      confidence: sourceConfidence(kind),
      keyClaim: content
        ? cleanInline(content, 180)
        : "Discovered during the bounded source sweep; direct content was not available.",
      accepted: Boolean(content),
      ...(!content
        ? { rejectionReason: "URL discovered but direct content was not read." }
        : {}),
    };
  });
}

function fallbackWriter(
  input: FeynmanResearchInput,
  sources: FeynmanSource[],
): FeynmanWriterResult {
  const accepted = sources.filter((source) => source.accepted);
  return {
    title: `${WORKFLOW_LABELS[input.workflow]} · ${cleanInline(input.topic, 90)}`,
    summary:
      accepted.length > 0
        ? `The bounded source pass found ${accepted.length} directly read source${accepted.length === 1 ? "" : "s"} for ${input.topic}.`
        : `The bounded source pass could not directly read enough evidence to settle ${input.topic}.`,
    synthesis:
      accepted.length > 0
        ? accepted
            .slice(0, 5)
            .map((source) => `- [${source.id}] ${source.keyClaim}`)
            .join("\n")
        : "- No directly read source was available. Treat this output as a research plan, not a conclusion.",
    methodology: `The Researcher ran ${input.coverage.queryWaves} bounded query wave${input.coverage.queryWaves === 1 ? "" : "s"}, one paper sweep, and ${input.webResults.length} successful web angle${input.webResults.length === 1 ? "" : "s"}, then attempted parallel direct reads before synthesis.`,
    disagreements:
      input.failures.length > 0
        ? `Collection gaps: ${input.failures.join(" | ")}`
        : "No explicit disagreement was confirmed in the bounded pass.",
    openQuestions:
      accepted.length > 1
        ? "Which source differences materially change the conclusion, and which claims need stronger primary evidence?"
        : "Which authoritative primary source should be read next before accepting the central claim?",
    nextAction: EXECUTION_GATED_WORKFLOWS.has(input.workflow)
      ? "Review the plan and explicitly approve any execution step."
      : "Reopen the strongest direct source and resolve the highest-impact evidence gap.",
    claims: accepted.slice(0, 5).map((source) => ({
      claim: source.keyClaim,
      sourceIds: [source.id],
    })),
  };
}

function parseWriterResult(value: string) {
  const payload = extractJsonObject(value);
  if (!payload) return null;
  try {
    const parsed = JSON.parse(payload) as Partial<FeynmanWriterResult>;
    if (typeof parsed.synthesis !== "string") return null;
    return {
      title: typeof parsed.title === "string" ? parsed.title : "",
      summary: typeof parsed.summary === "string" ? parsed.summary : "",
      synthesis: parsed.synthesis,
      methodology:
        typeof parsed.methodology === "string" ? parsed.methodology : "",
      disagreements:
        typeof parsed.disagreements === "string" ? parsed.disagreements : "",
      openQuestions:
        typeof parsed.openQuestions === "string" ? parsed.openQuestions : "",
      nextAction:
        typeof parsed.nextAction === "string" ? parsed.nextAction : "",
      claims: Array.isArray(parsed.claims)
        ? parsed.claims
            .filter((claim): claim is { claim: string; sourceIds: string[] } =>
              Boolean(
                claim &&
                typeof claim === "object" &&
                typeof claim.claim === "string" &&
                Array.isArray(claim.sourceIds),
              ),
            )
            .slice(0, 12)
        : [],
    } satisfies FeynmanWriterResult;
  } catch {
    return null;
  }
}

function parseClaimAudits(value: string) {
  const payload = extractJsonObject(value);
  if (!payload) return null;
  try {
    const parsed = JSON.parse(payload) as { claims?: unknown };
    if (!Array.isArray(parsed.claims)) return null;
    const verdicts = new Set<FeynmanClaimVerdict>([
      "supported",
      "partial",
      "conflicting",
      "unsupported",
      "unverifiable",
    ]);
    return parsed.claims
      .filter((claim): claim is Record<string, unknown> =>
        Boolean(claim && typeof claim === "object"),
      )
      .map((claim, index) => {
        const rawVerdict = String(
          claim.verdict ?? "unverifiable",
        ) as FeynmanClaimVerdict;
        return {
          id: String(claim.id ?? `C${index + 1}`),
          claim: String(claim.claim ?? "Unlabeled claim"),
          sourceIds: Array.isArray(claim.sourceIds)
            ? claim.sourceIds.map(String).slice(0, 8)
            : [],
          verdict: verdicts.has(rawVerdict) ? rawVerdict : "unverifiable",
          rationale: String(
            claim.rationale ?? "No verifier rationale was returned.",
          ),
        } satisfies FeynmanClaimAudit;
      })
      .slice(0, 12);
  } catch {
    return null;
  }
}

function parseReviewFindings(value: string) {
  const payload = extractJsonObject(value);
  if (!payload) return null;
  try {
    const parsed = JSON.parse(payload) as { findings?: unknown };
    if (!Array.isArray(parsed.findings)) return null;
    const severities = new Set<FeynmanReviewSeverity>([
      "fatal",
      "major",
      "minor",
    ]);
    return parsed.findings
      .filter((finding): finding is Record<string, unknown> =>
        Boolean(finding && typeof finding === "object"),
      )
      .map((finding) => {
        const rawSeverity = String(
          finding.severity ?? "minor",
        ) as FeynmanReviewSeverity;
        return {
          severity: severities.has(rawSeverity) ? rawSeverity : "minor",
          issue: String(finding.issue ?? "Unlabeled review issue"),
          recommendation: String(
            finding.recommendation ??
              "Review this issue before relying on the artifact.",
          ),
        } satisfies FeynmanReviewFinding;
      })
      .slice(0, 10);
  } catch {
    return null;
  }
}

export function buildFeynmanSynthesisPrompt(
  input: FeynmanResearchInput,
  sources: FeynmanSource[],
) {
  return [
    `You are the Writer stage of a Feynman-style ${WORKFLOW_LABELS[input.workflow]} workflow.`,
    "Return JSON only with keys: title, summary, synthesis, methodology, disagreements, openQuestions, nextAction, claims.",
    'Each claim item must be {"claim":"...","sourceIds":["S1"]}.',
    "Use only the evidence supplied. Cite source IDs inline. Label inferences. Never invent source access.",
    `Purpose: ${workflowPurpose(input.workflow)}`,
    EXECUTION_GATED_WORKFLOWS.has(input.workflow)
      ? "Do not execute anything. Produce a plan only and state that explicit operator approval is required."
      : "",
    "",
    `TOPIC: ${input.topic}`,
    "",
    "EVIDENCE LEDGER:",
    sources.length > 0
      ? sources
          .map(
            (source) =>
              `[${source.id}] ${source.kind} | ${source.confidence} | ${source.accepted ? "read" : "not-read"} | ${source.url}\n${source.keyClaim}`,
          )
          .join("\n\n")
      : "No direct sources were available.",
    "",
    "COLLECTION FAILURES:",
    input.failures.length > 0 ? input.failures.join(" | ") : "None.",
    "",
    "COVERAGE RECEIPT:",
    JSON.stringify(input.coverage),
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildFeynmanVerificationPrompt(
  writer: FeynmanWriterResult,
  sources: FeynmanSource[],
) {
  return [
    "You are the Verifier stage of a Feynman-style research workflow.",
    "Return JSON only with key claims.",
    'Each item must be {"id":"C1","claim":"...","sourceIds":["S1"],"verdict":"supported|partial|conflicting|unsupported|unverifiable","rationale":"..."}.',
    "Audit every supplied claim against only the evidence ledger. A URL that was discovered but not read cannot support a claim.",
    "",
    "CLAIMS:",
    JSON.stringify(writer.claims),
    "",
    "EVIDENCE:",
    JSON.stringify(sources),
  ].join("\n");
}

export function buildFeynmanReviewPrompt(
  workflow: FeynmanWorkflowId,
  writer: FeynmanWriterResult,
  claims: FeynmanClaimAudit[],
) {
  return [
    `You are the Reviewer stage of a Feynman-style ${WORKFLOW_LABELS[workflow]} workflow.`,
    "Return JSON only with key findings.",
    'Each finding must be {"severity":"fatal|major|minor","issue":"...","recommendation":"..."}.',
    "Check unsupported claims, contradictions, logical gaps, overconfidence, missing methodology, and single-source critical findings.",
    "Use FATAL only when the artifact cannot safely support its central conclusion.",
    "",
    "DRAFT:",
    JSON.stringify(writer),
    "",
    "CLAIM AUDIT:",
    JSON.stringify(claims),
  ].join("\n");
}

function fallbackClaims(writer: FeynmanWriterResult, sources: FeynmanSource[]) {
  const acceptedIds = new Set(
    sources.filter((source) => source.accepted).map((source) => source.id),
  );
  return writer.claims.map((claim, index) => {
    const acceptedRefs = claim.sourceIds.filter((id) => acceptedIds.has(id));
    return {
      id: `C${index + 1}`,
      claim: claim.claim,
      sourceIds: claim.sourceIds,
      verdict:
        acceptedRefs.length === 0
          ? "unverifiable"
          : acceptedRefs.length === claim.sourceIds.length
            ? "supported"
            : "partial",
      rationale:
        acceptedRefs.length === 0
          ? "No directly read source in the ledger supports this claim."
          : "The claim is linked to directly read evidence in the bounded ledger.",
    } satisfies FeynmanClaimAudit;
  });
}

function fallbackReview(
  workflow: FeynmanWorkflowId,
  sources: FeynmanSource[],
  claims: FeynmanClaimAudit[],
  failures: string[],
) {
  const findings: FeynmanReviewFinding[] = [];
  if (sources.filter((source) => source.accepted).length < 2) {
    findings.push({
      severity: "major",
      issue: "The central synthesis has fewer than two directly read sources.",
      recommendation:
        "Add an independent authoritative source before treating the conclusion as settled.",
    });
  }
  if (
    claims.some(
      (claim) =>
        claim.verdict === "unsupported" || claim.verdict === "unverifiable",
    )
  ) {
    findings.push({
      severity: "major",
      issue: "One or more claims are unsupported or unverifiable.",
      recommendation:
        "Downgrade or remove those claims until direct evidence is available.",
    });
  }
  if (failures.length > 0) {
    findings.push({
      severity: "minor",
      issue: "The bounded collection pass had partial failures.",
      recommendation:
        "Review coverage status and retry the highest-impact failed source lane.",
    });
  }
  if (EXECUTION_GATED_WORKFLOWS.has(workflow)) {
    findings.push({
      severity: "minor",
      issue: "The workflow describes execution-capable follow-through.",
      recommendation:
        "Keep every execution step behind explicit operator approval.",
    });
  }
  return findings;
}

function formatEvidenceLedger(sources: FeynmanSource[]) {
  if (sources.length === 0) return "- No direct source URLs were available.";
  return [
    "| ID | Source | Type | Read | Confidence | Key evidence |",
    "|---|---|---|---|---|---|",
    ...sources.map(
      (source) =>
        `| ${source.id} | [${source.title}](${source.url}) | ${source.kind} | ${source.accepted ? "yes" : "no"} | ${source.confidence} | ${source.keyClaim.replace(/\|/g, "\\|")} |`,
    ),
  ].join("\n");
}

function formatClaimAudit(claims: FeynmanClaimAudit[]) {
  if (claims.length === 0) {
    return "- No discrete factual claims were returned. The artifact remains unverifiable.";
  }
  return claims
    .map(
      (claim) =>
        `- **${claim.id} · ${claim.verdict.toUpperCase()}** — ${claim.claim}\n  Sources: ${claim.sourceIds.join(", ") || "none"} · ${claim.rationale}`,
    )
    .join("\n");
}

function formatReview(findings: FeynmanReviewFinding[]) {
  if (findings.length === 0) return "- No reviewer findings were returned.";
  return findings
    .map(
      (finding) =>
        `- **${finding.severity.toUpperCase()}** — ${finding.issue}\n  Revision: ${finding.recommendation}`,
    )
    .join("\n");
}

function buildExecutionGate(workflow: FeynmanWorkflowId) {
  if (workflow === "watch") {
    return "Explicit operator approval required before creating or enabling a recurring scheduler job.";
  }
  if (EXECUTION_GATED_WORKFLOWS.has(workflow)) {
    return "Explicit operator approval required before package installation, code execution, experiment runs, training, paid compute, or external writes.";
  }
  return "Read-only research workflow. Any later write, execution, paid-compute, or external-action step requires explicit operator approval.";
}

export function formatFeynmanReport(input: {
  research: FeynmanResearchInput;
  writer: FeynmanWriterResult;
  sources: FeynmanSource[];
  claims: FeynmanClaimAudit[];
  findings: FeynmanReviewFinding[];
  stageStatus: FeynmanResearchResult["stageStatus"];
}) {
  const acceptedCount = input.sources.filter(
    (source) => source.accepted,
  ).length;
  const rejectedCount = input.sources.length - acceptedCount;
  return [
    `# ${input.writer.title || `${WORKFLOW_LABELS[input.research.workflow]} · ${input.research.topic}`}`,
    "",
    "## Research Plan",
    `- Workflow: ${WORKFLOW_LABELS[input.research.workflow]}`,
    `- Question: ${input.research.topic}`,
    `- Purpose: ${workflowPurpose(input.research.workflow)}`,
    `- Stages: Researcher ${input.stageStatus.researcher}; Writer ${input.stageStatus.writer}; Verifier ${input.stageStatus.verifier}; Reviewer ${input.stageStatus.reviewer}.`,
    "",
    "## Evidence Ledger",
    formatEvidenceLedger(input.sources),
    "",
    "## Synthesis",
    input.writer.summary,
    "",
    input.writer.synthesis,
    "",
    "## Methodology And Disagreements",
    input.writer.methodology || "Methodology was not supplied.",
    "",
    input.writer.disagreements || "No disagreement analysis was supplied.",
    "",
    "## Claim Audit",
    formatClaimAudit(input.claims),
    "",
    "## Reviewer Findings",
    formatReview(input.findings),
    "",
    "## Open Questions",
    input.writer.openQuestions || "No open questions were supplied.",
    "",
    "## Coverage Status",
    `- Coverage sufficient: ${input.research.coverage.sufficient ? "yes" : "no"}`,
    `- Query waves: ${input.research.coverage.queryWaves} (${input.research.coverage.initialQueries} initial; ${input.research.coverage.refinementQueries} refinement)`,
    `- Refinement required: ${input.research.coverage.refinementRequired ? "yes" : "no"}`,
    `- Sources discovered: ${input.research.coverage.discoveredSources}`,
    `- Sources read directly: ${acceptedCount}`,
    `- High-confidence sources read directly: ${input.research.coverage.highConfidenceDirectSources}`,
    `- Minimum evidence: ${input.research.coverage.thresholds.discoveredSources} discovered; ${input.research.coverage.thresholds.directlyReadSources} directly read; ${input.research.coverage.thresholds.highConfidenceDirectSources} high-confidence directly read`,
    `- Coverage gaps: ${input.research.coverage.gaps.length > 0 ? input.research.coverage.gaps.join(" | ") : "none"}`,
    `- Sources not read/rejected: ${rejectedCount}`,
    `- Collection failures: ${input.research.failures.length > 0 ? input.research.failures.join(" | ") : "none"}`,
    "",
    "## Provenance",
    `- Generated by Nexus Feynman-native ${WORKFLOW_LABELS[input.research.workflow]} workflow.`,
    "- Evidence descriptions come only from the bounded source pass shown above.",
    "- Discovered-but-unread URLs are preserved as not-read and cannot support a confirmed claim.",
    "",
    "## Execution Gate",
    buildExecutionGate(input.research.workflow),
    "",
    "## Next Action",
    input.writer.nextAction ||
      "Review the strongest evidence gap before continuing.",
  ].join("\n");
}

export async function runFeynmanResearch(
  workflow: FeynmanWorkflowId,
  topic: string,
  deps: FeynmanResearchDeps,
): Promise<FeynmanResearchResult> {
  const normalizedTopic = topic.trim();
  const failures: string[] = [];
  const stageStatus: FeynmanResearchResult["stageStatus"] = {
    researcher: "complete",
    writer: "complete",
    verifier: "complete",
    reviewer: "complete",
  };
  await emitProgress(deps, {
    stage: "workflow",
    status: "started",
    note: `${WORKFLOW_LABELS[workflow]} started for "${normalizedTopic || "Unspecified research topic"}".`,
  });
  await emitProgress(deps, {
    stage: "researcher",
    status: "started",
    note: "Researcher started the bounded paper, web, and direct-source pass.",
  });

  if (!normalizedTopic) {
    failures.push("No research topic or artifact was provided.");
  }

  const collection = await runFeynmanProgressiveResearch({
    workflow,
    topic: normalizedTopic,
    deps: {
      searchPapers: deps.searchPapers,
      webSearch: deps.webSearch,
      fetchUrl: deps.fetchUrl,
      inspectHuggingFace: deps.inspectHuggingFace,
      progress: (note) =>
        emitProgress(deps, {
          stage: "researcher",
          status: "started",
          note,
        }),
    },
  });
  failures.push(...collection.failures);
  const { paperSignal, webResults, fetchedSources, coverage } = collection;

  if (!coverage.sufficient) {
    stageStatus.researcher = "degraded";
  }
  await emitProgress(deps, {
    stage: "researcher",
    status: stageStatus.researcher,
    note: `Researcher finished after ${coverage.queryWaves} query wave${coverage.queryWaves === 1 ? "" : "s"} with ${coverage.discoveredSources} discovered sources, ${coverage.directlyReadSources} directly read sources, and ${coverage.highConfidenceDirectSources} high-confidence directly read sources.`,
  });

  const research: FeynmanResearchInput = {
    workflow,
    topic: normalizedTopic || "Unspecified research topic",
    paperSignal,
    webResults,
    fetchedSources,
    coverage,
    failures,
  };
  const sources = buildSourceLedger(research);

  await emitProgress(deps, {
    stage: "writer",
    status: "started",
    note: `Writer started synthesis from ${sources.length} ledger entries.`,
  });
  let writer = fallbackWriter(research, sources);
  try {
    const result = parseWriterResult(
      await deps.write(buildFeynmanSynthesisPrompt(research, sources)),
    );
    if (result) {
      writer = {
        ...writer,
        ...result,
        claims: result.claims.length > 0 ? result.claims : writer.claims,
      };
    } else {
      failures.push("Writer returned an invalid payload.");
      stageStatus.writer = "degraded";
    }
  } catch {
    failures.push("Writer stage failed.");
    stageStatus.writer = "degraded";
  }
  await emitProgress(deps, {
    stage: "writer",
    status: stageStatus.writer,
    note: `Writer finished the structured synthesis with ${writer.claims.length} candidate claims.`,
  });

  await emitProgress(deps, {
    stage: "verifier",
    status: "started",
    note: "Verifier started claim-to-source auditing.",
  });
  let claims: FeynmanClaimAudit[] = fallbackClaims(writer, sources);
  try {
    const result = parseClaimAudits(
      await deps.verify(buildFeynmanVerificationPrompt(writer, sources)),
    );
    if (result && result.length > 0) {
      claims = result;
    } else {
      failures.push("Verifier returned an invalid payload.");
      stageStatus.verifier = "degraded";
    }
  } catch {
    failures.push("Verifier stage failed.");
    stageStatus.verifier = "degraded";
  }
  await emitProgress(deps, {
    stage: "verifier",
    status: stageStatus.verifier,
    note: `Verifier finished with ${claims.length} audited claims.`,
  });

  await emitProgress(deps, {
    stage: "reviewer",
    status: "started",
    note: "Reviewer started adversarial review.",
  });
  let reviewFindings = fallbackReview(workflow, sources, claims, failures);
  try {
    const result = parseReviewFindings(
      await deps.review(buildFeynmanReviewPrompt(workflow, writer, claims)),
    );
    if (result) {
      reviewFindings = result;
    } else {
      failures.push("Reviewer returned an invalid payload.");
      stageStatus.reviewer = "degraded";
    }
  } catch {
    failures.push("Reviewer stage failed.");
    stageStatus.reviewer = "degraded";
  }
  await emitProgress(deps, {
    stage: "reviewer",
    status: stageStatus.reviewer,
    note: `Reviewer finished with ${reviewFindings.length} findings.`,
  });

  research.failures = failures;
  const report = formatFeynmanReport({
    research,
    writer,
    sources,
    claims,
    findings: reviewFindings,
    stageStatus,
  });
  await emitProgress(deps, {
    stage: "workflow",
    status: Object.values(stageStatus).some((status) => status === "degraded")
      ? "degraded"
      : "complete",
    note: `Research workflow produced the final report with ${sources.length} sources and ${claims.length} audited claims.`,
  });

  return {
    workflow,
    topic: research.topic,
    report,
    sources,
    claims,
    reviewFindings,
    coverage,
    failures,
    stageStatus,
    approvalRequired:
      EXECUTION_GATED_WORKFLOWS.has(workflow) || workflow === "watch",
  };
}
