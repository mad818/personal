import { parseInlineEvidencePosture } from "@/lib/aiStructuredEvidence";
import type { AgentStep } from "@/lib/agent";
import { isLearningPrompt } from "@/lib/learningMissions";
import type { AgentId, HQAnswerStyle, HQResponseKind } from "./types";

const GREETING_RE =
  /^(?:hi|hello|hey|yo|sup|what'?s up|good (?:morning|afternoon|evening))(?:[!. ]|$)/i;
const PRODUCT_HELP_RE =
  /\b(?:tab|tabs|page|pages|route|screen|view|settings|drawer|where is|where do i|how do i use|how can i use|what does this app|what can nexus|website|site|navigate)\b/i;
const REPO_WORK_RE =
  /\b(?:repo|repository|codebase|file|files|component|hook|api route|patch|refactor|implement|debug|fix|build|typescript|next\.?js|read the code|search the repo)\b/i;
const LIVE_CURRENT_RE =
  /\b(?:latest|newest|current|today|tonight|recent|recently|news|headline|headlines|update|updates|status|price|prices|market|markets|weather|breaking)\b/i;

const NARRATION_HEADING_RE =
  /^(?:#{1,6}\s*)?(?:\*\*)?(background|analysis|recommendation)(?:\*\*)?\s*:?\s*$/i;
const GENERIC_FOLLOW_UP_RE =
  /(?:^|\n)(?:How would you like to proceed\?|Would you like me to proceed.*?|What would you like to do next\?)\s*$/i;
const RETRIEVAL_TOOLS = new Set([
  "web_search",
  "fetch_url",
  "navigate_to",
  "read_current_tab",
]);

export interface HQAnswerStylePlan {
  style: HQAnswerStyle;
  responseKind: HQResponseKind;
  defaultAgent: AgentId;
  includeLiveContext: boolean;
  includeMemoryDiff: boolean;
  includeRag: boolean;
  includeLessons: boolean;
  verifiedRetrievalRequired: boolean;
  showEvidencePosture: boolean;
  casualGreeting: boolean;
  promptDirective: string;
}

function buildHQAnswerStyleDirective(style: HQAnswerStyle): string {
  switch (style) {
    case "conversational":
      return `

[HQ ANSWER STYLE — CONVERSATIONAL]
This is a normal chat turn.
- Answer like a real assistant first.
- Do not use "Background", "Analysis", or "Recommendation" headings.
- Do not summarize runtime posture, task trackers, or global live intel unless the user asked for them.
- Give one direct answer in natural prose.
- Ask at most one short follow-up only if it is truly needed.
- If you start drafting an operator memo, rewrite it into a plain conversational reply before final output.
[END HQ ANSWER STYLE]
`;
    case "learning":
      return `

[HQ ANSWER STYLE — GUIDED LEARNING]
This is a guided-learning turn.
- Teach or explain directly first in natural prose.
- Use a supportive tutor posture, not a dashboard or memo posture.
- Keep the answer structured around one concept, one checkpoint, or one practice step at a time.
- If prior local memory is attached, use it quietly and label inferred carry-forward clearly.
- End with at most one compact study continuation, checkpoint, or quiz prompt when it truly helps.
[END HQ ANSWER STYLE]
`;
    case "live_current":
      return `

[HQ ANSWER STYLE — VERIFIED LIVE]
This request is time-sensitive or current-world sensitive.
- If a verified retrieval block is already present, use it as the current-state ground truth for this turn.
- You must verify through web_search, fetch_url, or browser tools before making current claims.
- Do not answer from memory or only from internal Nexus context.
- Cite recency or source context inline when it matters.
- If live verification is unavailable, say that clearly and give only a bounded fallback.
- Keep the final answer compact and operator-useful, not memo-shaped.
[END HQ ANSWER STYLE]
`;
    case "product_help":
      return `

[HQ ANSWER STYLE — PRODUCT HELP]
The user wants help using Nexus.
- Explain the relevant feature, tab, or next step directly.
- Mention only the routes or controls that actually matter to this question.
- Do not add market, cyber, or project-status narration unless it is directly relevant.
- Prefer a short answer with concrete steps over a broad system summary.
[END HQ ANSWER STYLE]
`;
    case "repo_work":
      return `

[HQ ANSWER STYLE — REPO WORK]
This is an engineering/repo-help turn.
- Focus on the codebase, file ownership, likely blast radius, or concrete implementation guidance.
- Do not pad the answer with global ops posture or unrelated live intel.
- Keep the answer collaborative and precise.
[END HQ ANSWER STYLE]
`;
    case "workflow":
      return `

[HQ ANSWER STYLE — STRUCTURED WORKFLOW]
The user intentionally invoked a workflow-style run.
- Structured output is appropriate.
- Keep evidence and steps compact and relevant to the requested workflow.
[END HQ ANSWER STYLE]
`;
    default:
      return "";
  }
}

function collapseNarrationReply(raw: string): string | null {
  const lines = raw.replace(/\r\n?/g, "\n").split("\n");
  const sections: Record<"background" | "analysis" | "recommendation", string[]> = {
    background: [],
    analysis: [],
    recommendation: [],
  };
  const body: string[] = [];
  let active: keyof typeof sections | null = null;
  let headingCount = 0;

  for (const line of lines) {
    const match = line.trim().match(NARRATION_HEADING_RE);
    if (match) {
      active = match[1].toLowerCase() as keyof typeof sections;
      headingCount += 1;
      continue;
    }
    if (active) {
      sections[active].push(line);
    } else {
      body.push(line);
    }
  }

  if (headingCount < 2) return null;
  const recommendation = sections.recommendation.join("\n").trim();
  if (recommendation) return recommendation;
  const bodyText = body.join("\n").trim();
  return bodyText || null;
}

export function resolveHQAnswerStylePlan(input: string, opts?: {
  hasWorkflow?: boolean;
}): HQAnswerStylePlan {
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();
  const casualGreeting = GREETING_RE.test(trimmed);
  let style: HQAnswerStyle = "conversational";

  if (opts?.hasWorkflow) {
    style = "workflow";
  } else if (isLearningPrompt(lower)) {
    style = "learning";
  } else if (REPO_WORK_RE.test(lower)) {
    style = "repo_work";
  } else if (LIVE_CURRENT_RE.test(lower)) {
    style = "live_current";
  } else if (PRODUCT_HELP_RE.test(lower)) {
    style = "product_help";
  }

  switch (style) {
    case "workflow":
      return {
        style,
        responseKind: "workflow",
        defaultAgent: "jansky",
        includeLiveContext: true,
        includeMemoryDiff: true,
        includeRag: true,
        includeLessons: true,
        verifiedRetrievalRequired: false,
        showEvidencePosture: true,
        casualGreeting: false,
        promptDirective: buildHQAnswerStyleDirective(style),
      };
    case "live_current":
      return {
        style,
        responseKind: "evidence",
        defaultAgent: "nova",
        includeLiveContext: false,
        includeMemoryDiff: false,
        includeRag: false,
        includeLessons: false,
        verifiedRetrievalRequired: true,
        showEvidencePosture: true,
        casualGreeting: false,
        promptDirective: buildHQAnswerStyleDirective(style),
      };
    case "learning":
      return {
        style,
        responseKind: "assistant",
        defaultAgent: "jansky",
        includeLiveContext: false,
        includeMemoryDiff: false,
        includeRag: true,
        includeLessons: true,
        verifiedRetrievalRequired: false,
        showEvidencePosture: false,
        casualGreeting: false,
        promptDirective: buildHQAnswerStyleDirective(style),
      };
    case "product_help":
      return {
        style,
        responseKind: "assistant",
        defaultAgent: "jansky",
        includeLiveContext: false,
        includeMemoryDiff: false,
        includeRag: false,
        includeLessons: false,
        verifiedRetrievalRequired: false,
        showEvidencePosture: false,
        casualGreeting: false,
        promptDirective: buildHQAnswerStyleDirective(style),
      };
    case "repo_work":
      return {
        style,
        responseKind: "evidence",
        defaultAgent: "orbit",
        includeLiveContext: false,
        includeMemoryDiff: false,
        includeRag: true,
        includeLessons: true,
        verifiedRetrievalRequired: false,
        showEvidencePosture: false,
        casualGreeting: false,
        promptDirective: buildHQAnswerStyleDirective(style),
      };
    case "conversational":
    default:
      return {
        style: "conversational",
        responseKind: "assistant",
        defaultAgent: "jansky",
        includeLiveContext: false,
        includeMemoryDiff: false,
        includeRag: false,
        includeLessons: false,
        verifiedRetrievalRequired: false,
        showEvidencePosture: false,
        casualGreeting,
        promptDirective: buildHQAnswerStyleDirective("conversational"),
      };
  }
}

export function resolveHQTargetAgent(
  plan: HQAnswerStylePlan,
  detectedAgent: AgentId,
): AgentId {
  if (plan.style === "live_current") {
    return detectedAgent === "jansky" ? plan.defaultAgent : detectedAgent;
  }
  if (plan.style === "workflow") {
    return detectedAgent;
  }
  return plan.defaultAgent;
}

export function buildHQRetrievalRetryDirective(): string {
  return `

[HQ LIVE RETRIEVAL SAFEGUARD]
The first pass did not perform verified retrieval.
- You must use web_search, fetch_url, or browser tools before the final answer.
- Do not answer this as a local-context summary.
- If verification still fails, say that explicitly and give only a bounded fallback.
[END HQ LIVE RETRIEVAL SAFEGUARD]
`;
}

export function hasVerifiedRetrievalStep(steps: AgentStep[]): boolean {
  return steps.some(
    (step) =>
      step.type === "tool_call" &&
      Boolean(step.tool) &&
      RETRIEVAL_TOOLS.has(step.tool ?? ""),
  );
}

export function healHQAnswerForChronicle(
  raw: string,
  plan: HQAnswerStylePlan,
): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;

  const evidence = parseInlineEvidencePosture(trimmed);
  let next = plan.showEvidencePosture
    ? trimmed
    : (evidence?.mainText?.trim() || trimmed);
  const collapsedNarration = collapseNarrationReply(next);

  if (plan.casualGreeting && collapsedNarration) {
    return "Hello. How can I help today?";
  }

  if (plan.style === "conversational" || plan.style === "product_help") {
    if (collapsedNarration) next = collapsedNarration;
    next = next.replace(GENERIC_FOLLOW_UP_RE, "").trim();
  }

  return next.trim();
}
