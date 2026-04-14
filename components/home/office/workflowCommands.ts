import type { NexusRoute } from "@/lib/chatCapabilityRouting";
import type { AgentId } from "./types";

export type HQWorkflowCommandId =
  | "deepresearch"
  | "lit-review"
  | "compare"
  | "brief"
  | "threat-hunt"
  | "evidence-pack";

export type HQWorkflowRisk = "low" | "medium";
export type HQWorkflowPosture = "research" | "briefing" | "defensive";
export type HQWorkflowOutputTarget = "compiled_memory_page";
export type HQWorkflowAutomationPosture =
  | "candidate_with_human_gate"
  | "review_only";

export interface HQWorkflowSchedulerDefaults {
  cronSuggestion: string;
  outputTarget: "review" | "vault";
  approvalPolicy: "human_gate";
  topicPlaceholder: string;
}

export interface HQWorkflowPrompt {
  label: string;
  prompt: string;
}

export interface HQWorkflowResolution {
  id: HQWorkflowCommandId;
  label: string;
  source: "feynman" | "pentagi" | "rtk";
  agent: AgentId;
  route: NexusRoute;
  topic: string;
  userPrompt: string;
  systemDirective: string;
}

export interface HQWorkflowCatalogItem {
  id: HQWorkflowCommandId;
  command: `/${string}`;
  label: string;
  source: HQWorkflowResolution["source"];
  agent: AgentId;
  route: NexusRoute;
  aliases: string[];
  risk: HQWorkflowRisk;
  posture: HQWorkflowPosture;
  outputTarget: HQWorkflowOutputTarget;
  outputLayer: "knowledge" | "output";
  defensiveOnly: boolean;
  automationReady: boolean;
  automationPosture: HQWorkflowAutomationPosture;
  automationGuidance: string;
  schedulerDefaults?: HQWorkflowSchedulerDefaults;
  hookNotes: string[];
}

export interface HQWorkflowScheduledDraft {
  workflowId: HQWorkflowCommandId;
  name: string;
  prompt: string;
  cronSuggestion: string;
  outputTarget: "review" | "vault";
  approvalPolicy: "human_gate";
  missionAgent: AgentId;
  templateId: HQWorkflowCommandId;
  topicPlaceholder: string;
}

interface HQWorkflowDefinition {
  id: HQWorkflowCommandId;
  label: string;
  source: HQWorkflowResolution["source"];
  agent: AgentId;
  route: NexusRoute;
  aliases: string[];
  fallbackTopic: string;
  promptExample: string;
  risk: HQWorkflowRisk;
  posture: HQWorkflowPosture;
  outputTarget: HQWorkflowOutputTarget;
  outputLayer: "knowledge" | "output";
  defensiveOnly: boolean;
  automationReady: boolean;
  automationPosture: HQWorkflowAutomationPosture;
  automationGuidance: string;
  schedulerDefaults?: HQWorkflowSchedulerDefaults;
  hookNotes: string[];
  buildUserPrompt: (topic: string) => string;
  systemDirective: string;
}

const HQ_WORKFLOW_DEFINITIONS: HQWorkflowDefinition[] = [
  {
    id: "deepresearch",
    label: "Deep research",
    source: "feynman",
    agent: "nova",
    route: "/intel",
    aliases: ["deepresearch", "deep-research"],
    fallbackTopic: "the highest-priority current operating topic",
    promptExample: "/deepresearch AI chip export controls and NVIDIA supplier exposure",
    risk: "low",
    posture: "research",
    outputTarget: "compiled_memory_page",
    outputLayer: "knowledge",
    defensiveOnly: false,
    automationReady: true,
    automationPosture: "candidate_with_human_gate",
    automationGuidance:
      "Good future scheduler candidate, but only with human-gated review and durable artifact output.",
    schedulerDefaults: {
      cronSuggestion: "0 9 * * 1-5",
      outputTarget: "review",
      approvalPolicy: "human_gate",
      topicPlaceholder: "the highest-priority current operating topic",
    },
    hookNotes: [
      "Writes a compiled memory page on successful HQ workflow completion.",
      "Supports local-only filing into the memory spine without paid dependencies.",
    ],
    buildUserPrompt: (topic) =>
      `Run a deep research workflow for: ${topic}\n\nPrioritize current authoritative sources, reconcile disagreements, and deliver an operator-grade brief.`,
    systemDirective: `
[WORKFLOW DIRECTIVE — DEEP RESEARCH]
Treat this request as a structured research mission, not a casual answer.
Use current-source verification before you conclude.
Return a compact response with EXACTLY these sections:
1. Scope
2. Core claim
3. Evidence ledger
4. Counter-signals
5. Operator takeaway
6. Confidence & Gaps
Keep the writing compact, cite sources or tools inline, and avoid ornamental prose.
[END WORKFLOW DIRECTIVE]
`,
  },
  {
    id: "lit-review",
    label: "Lit review",
    source: "feynman",
    agent: "nova",
    route: "/intel",
    aliases: ["lit-review", "litreview", "literature-review"],
    fallbackTopic: "the most relevant papers or technical sources for the current issue",
    promptExample: "/lit-review browser tool-use prompt caching and agent reliability",
    risk: "low",
    posture: "research",
    outputTarget: "compiled_memory_page",
    outputLayer: "knowledge",
    defensiveOnly: false,
    automationReady: true,
    automationPosture: "candidate_with_human_gate",
    automationGuidance:
      "Can be scheduled later for literature sweeps, but should stay review-gated until mission templates land.",
    schedulerDefaults: {
      cronSuggestion: "30 9 * * 1-5",
      outputTarget: "review",
      approvalPolicy: "human_gate",
      topicPlaceholder: "the most relevant papers or technical sources for the current issue",
    },
    hookNotes: [
      "Biases toward papers, standards, and technical documentation.",
      "Writes durable knowledge pages into the local memory spine.",
    ],
    buildUserPrompt: (topic) =>
      `Run a literature review for: ${topic}\n\nPrioritize papers, standards, official docs, benchmarks, and technical writeups before commentary.`,
    systemDirective: `
[WORKFLOW DIRECTIVE — LITERATURE REVIEW]
Prioritize papers, technical docs, official standards, and primary materials ahead of commentary.
Return a compact response with EXACTLY these sections:
1. Research question
2. Source map
3. Findings
4. Disagreements
5. Open questions
6. Verdict
Keep it operator-grade and concise.
[END WORKFLOW DIRECTIVE]
`,
  },
  {
    id: "compare",
    label: "Compare matrix",
    source: "rtk",
    agent: "nova",
    route: "/intel",
    aliases: ["compare"],
    fallbackTopic: "the top competing options relevant to the current decision",
    promptExample: "/compare Anthropic prompt caching vs OpenAI batch processing for scheduled missions",
    risk: "low",
    posture: "research",
    outputTarget: "compiled_memory_page",
    outputLayer: "knowledge",
    defensiveOnly: false,
    automationReady: true,
    automationPosture: "candidate_with_human_gate",
    automationGuidance:
      "Strong automation candidate for recurring compare jobs, provided the output stays reviewable before downstream action.",
    schedulerDefaults: {
      cronSuggestion: "0 13 * * 1-5",
      outputTarget: "review",
      approvalPolicy: "human_gate",
      topicPlaceholder: "the top competing options relevant to the current decision",
    },
    hookNotes: [
      "Produces operator-grade comparison output with explicit recommendation sections.",
      "Successful runs auto-write compiled memory pages for later retrieval.",
    ],
    buildUserPrompt: (topic) =>
      `Build a comparison matrix for: ${topic}\n\nUse evidence, not vibes, and finish with a clear recommendation.`,
    systemDirective: `
[WORKFLOW DIRECTIVE — COMPARISON MATRIX]
This is a structured comparison request.
Return a compact response with EXACTLY these sections:
1. Options
2. Criteria matrix
3. Evidence notes
4. Recommendation
5. Risks
Use short rows, explicit tradeoffs, and compact operator language.
[END WORKFLOW DIRECTIVE]
`,
  },
  {
    id: "brief",
    label: "Operator brief",
    source: "rtk",
    agent: "jansky",
    route: "/hq",
    aliases: ["brief"],
    fallbackTopic: "the current operating picture",
    promptExample: "/brief current operating picture across markets, cyber, and geopolitics",
    risk: "low",
    posture: "briefing",
    outputTarget: "compiled_memory_page",
    outputLayer: "output",
    defensiveOnly: false,
    automationReady: true,
    automationPosture: "candidate_with_human_gate",
    automationGuidance:
      "Useful as a recurring brief, but still best treated as an operator-reviewed mission instead of silent automation.",
    schedulerDefaults: {
      cronSuggestion: "0 8 * * *",
      outputTarget: "review",
      approvalPolicy: "human_gate",
      topicPlaceholder: "the current operating picture",
    },
    hookNotes: [
      "Stays in the HQ lane and keeps the response compact for command use.",
      "Can be filed or promoted into local memory without leaving the protected boundary.",
    ],
    buildUserPrompt: (topic) =>
      `Build a compact operator brief for: ${topic}\n\nSynthesize live signals into a short command-quality briefing.`,
    systemDirective: `
[WORKFLOW DIRECTIVE — OPERATOR BRIEF]
Return a compact briefing with EXACTLY these sections:
1. Situation
2. Signals
3. Change since prior state
4. Recommended action
5. Watch items
Keep the writing brief, direct, and free of filler.
[END WORKFLOW DIRECTIVE]
`,
  },
  {
    id: "threat-hunt",
    label: "Threat hunt",
    source: "pentagi",
    agent: "cipher",
    route: "/cyber",
    aliases: ["threat-hunt", "threathunt"],
    fallbackTopic: "the current highest-priority cyber posture",
    promptExample: "/threat-hunt suspicious outbound traffic and recent credential-theft indicators",
    risk: "medium",
    posture: "defensive",
    outputTarget: "compiled_memory_page",
    outputLayer: "output",
    defensiveOnly: true,
    automationReady: false,
    automationPosture: "review_only",
    automationGuidance:
      "Defensive hunts should remain operator-review-only and should not auto-escalate into unsupervised actions.",
    hookNotes: [
      "Defensive-only posture is enforced in the workflow directive.",
      "Evidence-focused output can be written to local memory pages for incident follow-up.",
    ],
    buildUserPrompt: (topic) =>
      `Run a defensive threat-hunt workflow for: ${topic}\n\nFocus on evidence, validation, containment, and operator next steps.`,
    systemDirective: `
[WORKFLOW DIRECTIVE — DEFENSIVE THREAT HUNT]
This is a defensive investigation only. Do not provide exploit instructions or offensive steps.
Return a compact response with EXACTLY these sections:
1. Initial verdict
2. Hypotheses
3. Evidence ledger
4. Validation plan
5. Containment
6. Residual risk
7. Next owner
Ground every recommendation in evidence or clearly stated uncertainty.
[END WORKFLOW DIRECTIVE]
`,
  },
  {
    id: "evidence-pack",
    label: "Evidence pack",
    source: "pentagi",
    agent: "cipher",
    route: "/cyber",
    aliases: ["evidence-pack", "evidencepack"],
    fallbackTopic: "the active security incident that needs triage packaging",
    promptExample: "/evidence-pack exposed admin panel and suspicious login sequence",
    risk: "medium",
    posture: "defensive",
    outputTarget: "compiled_memory_page",
    outputLayer: "output",
    defensiveOnly: true,
    automationReady: false,
    automationPosture: "review_only",
    automationGuidance:
      "Incident evidence packaging can recur, but it should remain explicitly reviewed before any outward notification or handoff.",
    hookNotes: [
      "Packages evidence and escalation thresholds without exploit guidance.",
      "Designed for local-first incident memory and operator review.",
    ],
    buildUserPrompt: (topic) =>
      `Build a defensive incident evidence pack for: ${topic}\n\nPackage the known facts, unknowns, and escalation threshold for an operator review.`,
    systemDirective: `
[WORKFLOW DIRECTIVE — INCIDENT EVIDENCE PACK]
This is a defensive packaging task. No exploit guidance.
Return a compact response with EXACTLY these sections:
1. Incident
2. Affected scope
3. Evidence ledger
4. Timeline
5. Unknowns
6. Immediate actions
7. Escalation threshold
Prefer concrete artifacts, timestamps, indicators, and confidence tags over generic advice.
[END WORKFLOW DIRECTIVE]
`,
  },
];

const HQ_WORKFLOW_ALIAS_TO_ID: Record<string, HQWorkflowCommandId> =
  HQ_WORKFLOW_DEFINITIONS.reduce<Record<string, HQWorkflowCommandId>>(
    (map, workflow) => {
      for (const alias of workflow.aliases) {
        map[alias] = workflow.id;
      }
      return map;
    },
    {},
  );

function normalizeTopic(rawTopic: string, fallbackTopic: string) {
  const topic = rawTopic.trim();
  return topic.length > 0 ? topic : fallbackTopic;
}

export const HQ_WORKFLOW_PROMPTS: HQWorkflowPrompt[] =
  HQ_WORKFLOW_DEFINITIONS.map((workflow) => ({
    label: workflow.label,
    prompt: workflow.promptExample,
  }));

export const HQ_WORKFLOW_HELP = HQ_WORKFLOW_DEFINITIONS.map(
  (workflow) => `/${workflow.aliases[0]}`,
).join(" · ");

export const HQ_WORKFLOW_CATALOG: HQWorkflowCatalogItem[] =
  HQ_WORKFLOW_DEFINITIONS.map((workflow) => ({
    id: workflow.id,
    command: `/${workflow.aliases[0]}`,
    label: workflow.label,
    source: workflow.source,
    agent: workflow.agent,
    route: workflow.route,
    aliases: workflow.aliases,
    risk: workflow.risk,
    posture: workflow.posture,
    outputTarget: workflow.outputTarget,
    outputLayer: workflow.outputLayer,
    defensiveOnly: workflow.defensiveOnly,
    automationReady: workflow.automationReady,
    automationPosture: workflow.automationPosture,
    automationGuidance: workflow.automationGuidance,
    schedulerDefaults: workflow.schedulerDefaults,
    hookNotes: workflow.hookNotes,
  }));

export function getHQWorkflowCatalogItem(
  workflowId?: string | null,
): HQWorkflowCatalogItem | null {
  if (!workflowId) return null;
  return HQ_WORKFLOW_CATALOG.find((item) => item.id === workflowId) ?? null;
}

export function buildHQWorkflowScheduledDraft(
  workflowId: HQWorkflowCommandId,
  topic?: string,
): HQWorkflowScheduledDraft | null {
  const workflow = HQ_WORKFLOW_DEFINITIONS.find((item) => item.id === workflowId);
  if (!workflow || !workflow.schedulerDefaults) return null;

  const resolvedTopic = normalizeTopic(
    topic ?? "",
    workflow.schedulerDefaults.topicPlaceholder || workflow.fallbackTopic,
  );

  return {
    workflowId: workflow.id,
    name: `${workflow.label} — ${resolvedTopic.slice(0, 48)}`,
    prompt: workflow.buildUserPrompt(resolvedTopic),
    cronSuggestion: workflow.schedulerDefaults.cronSuggestion,
    outputTarget: workflow.schedulerDefaults.outputTarget,
    approvalPolicy: workflow.schedulerDefaults.approvalPolicy,
    missionAgent: workflow.agent,
    templateId: workflow.id,
    topicPlaceholder: workflow.schedulerDefaults.topicPlaceholder,
  };
}

export function resolveHQWorkflowCommand(
  input: string,
): HQWorkflowResolution | null {
  const trimmed = input.trim();
  const match = trimmed.match(/^\/([a-z-]+)\b([\s\S]*)$/i);
  if (!match) return null;

  const rawCommand = match[1].toLowerCase();
  const workflowId = HQ_WORKFLOW_ALIAS_TO_ID[rawCommand];
  if (!workflowId) return null;

  const workflow = HQ_WORKFLOW_DEFINITIONS.find((item) => item.id === workflowId);
  if (!workflow) return null;

  const topic = normalizeTopic(match[2] ?? "", workflow.fallbackTopic);
  return {
    id: workflow.id,
    label: workflow.label,
    source: workflow.source,
    agent: workflow.agent,
    route: workflow.route,
    topic,
    userPrompt: workflow.buildUserPrompt(topic),
    systemDirective: workflow.systemDirective,
  };
}
