import type { NexusRoute } from "@/lib/chatCapabilityRouting";
import type { AgentId } from "./types";

export type HQWorkflowCommandId =
  | "deepresearch"
  | "rank"
  | "vault-weekly"
  | "operator"
  | "repo-assimilation"
  | "repo-compare"
  | "lit-review"
  | "review"
  | "audit"
  | "replicate"
  | "recipe"
  | "compare"
  | "draft"
  | "autoresearch"
  | "watch"
  | "outputs"
  | "brief"
  | "threat-hunt"
  | "evidence-pack";

export type HQWorkflowRisk = "low" | "medium";
export type HQWorkflowPosture = "research" | "briefing" | "defensive";
export type HQWorkflowOutputTarget = "compiled_memory_page" | "session_only";
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
  outputTarget: HQWorkflowOutputTarget;
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

function buildFeynmanWorkflowDefinition(input: {
  id:
    | "review"
    | "audit"
    | "replicate"
    | "recipe"
    | "draft"
    | "autoresearch"
    | "watch"
    | "outputs";
  label: string;
  aliases: string[];
  fallbackTopic: string;
  promptExample: string;
  purpose: string;
  route?: NexusRoute;
  outputTarget?: HQWorkflowOutputTarget;
  automationReady?: boolean;
  schedulerDefaults?: HQWorkflowSchedulerDefaults;
}): HQWorkflowDefinition {
  const outputsOnly = input.id === "outputs";
  return {
    id: input.id,
    label: input.label,
    source: "feynman",
    agent: "nova",
    route: input.route ?? "/intel",
    aliases: input.aliases,
    fallbackTopic: input.fallbackTopic,
    promptExample: input.promptExample,
    risk: "low",
    posture: "research",
    outputTarget: input.outputTarget ?? "compiled_memory_page",
    outputLayer: "knowledge",
    defensiveOnly: false,
    automationReady: input.automationReady ?? false,
    automationPosture: input.automationReady
      ? "candidate_with_human_gate"
      : "review_only",
    automationGuidance: input.automationReady
      ? "This Feynman workflow can become a reviewed scheduler mission, but enabling recurring work always requires a human gate."
      : "This Feynman workflow stays explicit and review-only.",
    schedulerDefaults: input.schedulerDefaults,
    hookNotes: [
      outputsOnly
        ? "Searches and resumes local Feynman continuity sessions and reads real compiled pages from the local VAULT."
        : "Files the cited, claim-audited, provenance-backed result into the local VAULT.",
      "Uses the shared Researcher, Writer, Verifier, and Reviewer engine.",
    ],
    buildUserPrompt: (topic) =>
      outputsOnly
        ? "Use feynman_outputs to list, search, resume, preview, or export real local Feynman sessions and VAULT artifacts."
        : `Use feynman_research with workflow "${input.id}" for: ${topic}\n\n${input.purpose}`,
    systemDirective: outputsOnly
      ? `
[WORKFLOW DIRECTIVE — FEYNMAN OUTPUTS]
Use feynman_outputs. Return only real local continuity sessions and VAULT artifacts. Use action search, resume, or export when requested; do not invent sessions or paths.
[END WORKFLOW DIRECTIVE]
`
      : `
[WORKFLOW DIRECTIVE — FEYNMAN ${input.label.toUpperCase()}]
Use feynman_research with workflow "${input.id}".
The shared engine must run Researcher, Writer, Verifier, and Reviewer stages.
Preserve direct source URLs, claim-level verdicts, severity-graded review findings, provenance, coverage gaps, and execution gates.
${input.id === "replicate" || input.id === "autoresearch" || input.id === "watch" ? "Do not execute, install, train, spend, write externally, or enable recurring work without explicit operator approval." : ""}
[END WORKFLOW DIRECTIVE]
`,
  };
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
    promptExample:
      "/deepresearch AI chip export controls and NVIDIA supplier exposure",
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
Prefer feynman_research with workflow "deepresearch" for the full Researcher, Writer, Verifier, and Reviewer pipeline.
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
    id: "vault-weekly",
    label: "Vault weekly",
    source: "rtk",
    agent: "jansky",
    route: "/command",
    aliases: ["weekly", "vault-weekly"],
    fallbackTopic: "the last 7 days of the local archive",
    promptExample: "/weekly",
    risk: "low",
    posture: "briefing",
    outputTarget: "compiled_memory_page",
    outputLayer: "knowledge",
    defensiveOnly: false,
    automationReady: false,
    automationPosture: "review_only",
    automationGuidance:
      "Weekly archive synthesis stays explicit-only in this tranche, so the archive compounds without turning into a scheduler lane.",
    hookNotes: [
      "Reads the local archive only and files one durable weekly brief into VAULT.",
      "Keeps weekly synthesis inside the current HQ/COMMAND/VAULT seams with no scheduler dependency.",
    ],
    buildUserPrompt: (topic) =>
      `Run a weekly archive synthesis for: ${topic}\n\nGroup the last seven days of local archive material into one compact weekly brief with a clear strongest next session.`,
    systemDirective: `
[WORKFLOW DIRECTIVE — VAULT WEEKLY]
Treat this request as an explicit weekly archive synthesis, not a generic brief.
Use the local archive slice only.
Return exactly 5 markdown bullets with these labels in order:
- Vault posture:
- Top themes:
- Notable signals:
- Repair lane:
- Strongest next session:
Keep the output compact, deterministic, and operator-grade.
[END WORKFLOW DIRECTIVE]
`,
  },
  {
    id: "operator",
    label: "Switch operator",
    source: "rtk",
    agent: "jansky",
    route: "/hq",
    aliases: ["operator"],
    fallbackTopic: "the next local tranche",
    promptExample: "/operator run the next local tranche",
    risk: "low",
    posture: "briefing",
    outputTarget: "session_only",
    outputLayer: "output",
    defensiveOnly: false,
    automationReady: false,
    automationPosture: "review_only",
    automationGuidance:
      "Switch Operator stays explicit-only and one-shot, so it never widens into scheduler automation or a background backlog loop.",
    hookNotes: [
      "Stages the existing provider-health and HQ routing seams for one bounded run.",
      "Reports readiness posture and actual provider used without creating a new durable workflow artifact.",
    ],
    buildUserPrompt: (topic) =>
      `Run Switch Operator mode for: ${topic}\n\nEvaluate provider posture, canonical queue truth, and dispatch one bounded next action only.`,
    systemDirective: `
[WORKFLOW DIRECTIVE — SWITCH OPERATOR]
Treat this request as one explicit operator run, not an ongoing automation loop.
Prefer the existing provider-health and runtime posture over any client-side provider scoring.
Return a compact response with EXACTLY these sections:
1. Operator posture
2. Chosen task
3. Dispatch plan
4. Strongest next step
Do not widen into scheduler jobs, background backlog loops, or staged-host work.
[END WORKFLOW DIRECTIVE]
`,
  },
  {
    id: "repo-assimilation",
    label: "Repo assimilation",
    source: "feynman",
    agent: "nova",
    route: "/recon",
    aliases: ["assimilate-repo", "repo-assimilation"],
    fallbackTopic: "the public GitHub repo that needs a Nexus fit review",
    promptExample: "/assimilate-repo https://github.com/vercel/next.js",
    risk: "low",
    posture: "research",
    outputTarget: "compiled_memory_page",
    outputLayer: "knowledge",
    defensiveOnly: false,
    automationReady: false,
    automationPosture: "review_only",
    automationGuidance:
      "Repo assimilation stays explicit-action-only so public-safe GitHub assessment does not drift into silent background operator loops.",
    hookNotes: [
      "Keeps the run inside the existing RECON repo-intel lane and files a durable assimilation brief to VAULT.",
      "Uses public GitHub metadata only and keeps ORBIT handoff bounded to local implementation planning.",
    ],
    buildUserPrompt: (topic) =>
      `Run a repo assimilation workflow for: ${topic}\n\nBuild a public-safe Nexus fit brief using metadata-only GitHub repo intel, then finish with a bounded ORBIT handoff instead of direct code import.`,
    systemDirective: `
[WORKFLOW DIRECTIVE — REPO ASSIMILATION]
Treat this request as a public-safe repo assimilation mission.
Prefer the assimilate_repo tool when it is available.
Do not fetch arbitrary source files, do not assume private GitHub access, and do not recommend direct code import or vendoring.
Return a compact response with EXACTLY these sections:
1. Repo snapshot
2. Essence prompt
3. Nexus fit map
4. Safe adoption points
5. Boundaries and risks
6. ORBIT handoff
Keep the brief metadata-grounded, operator-grade, and explicitly local-first.
[END WORKFLOW DIRECTIVE]
`,
  },
  {
    id: "repo-compare",
    label: "Repo compare",
    source: "feynman",
    agent: "nova",
    route: "/recon",
    aliases: ["compare-repos", "repo-compare"],
    fallbackTopic:
      "the 2 or 3 public GitHub repos that need a Nexus fit comparison",
    promptExample:
      "/compare-repos https://github.com/vercel/next.js vs https://github.com/remix-run/remix",
    risk: "low",
    posture: "research",
    outputTarget: "compiled_memory_page",
    outputLayer: "knowledge",
    defensiveOnly: false,
    automationReady: false,
    automationPosture: "review_only",
    automationGuidance:
      "Repo compare stays explicit-action-only so public-safe GitHub comparison does not drift into background scanning or broad compare automation.",
    hookNotes: [
      "Keeps the run inside the existing RECON repo-intel lane and files a durable repo-compare brief to VAULT.",
      "Uses public GitHub metadata only and keeps ORBIT handoff bounded to local implementation planning.",
    ],
    buildUserPrompt: (topic) =>
      `Run a repo compare workflow for: ${topic}\n\nCompare 2 or 3 public GitHub repos using metadata-only repo intel, then finish with one bounded recommendation and an ORBIT handoff.`,
    systemDirective: `
[WORKFLOW DIRECTIVE — REPO COMPARE]
Treat this request as a public-safe repo compare mission.
Prefer the compare_repos tool when it is available.
Do not fetch arbitrary source files, do not assume private GitHub access, and do not recommend direct code import or vendoring.
Return a compact response with EXACTLY these sections:
1. Candidates
2. Shared fit
3. Key differences
4. Recommended pick
5. Boundaries and risks
6. ORBIT handoff
Keep the brief metadata-grounded, operator-grade, and explicitly local-first.
[END WORKFLOW DIRECTIVE]
`,
  },
  {
    id: "rank",
    label: "Paper rank",
    source: "feynman",
    agent: "nova",
    route: "/intel",
    aliases: ["rank", "paper-rank", "read-first"],
    fallbackTopic:
      "the paper candidates that need a transparent read-first order",
    promptExample:
      "/rank which local-first agent memory papers should I read first?",
    risk: "low",
    posture: "research",
    outputTarget: "compiled_memory_page",
    outputLayer: "knowledge",
    defensiveOnly: false,
    automationReady: false,
    automationPosture: "review_only",
    automationGuidance:
      "Paper ranking stays explicit and review-only because its metadata and research question require operator judgment.",
    hookNotes: [
      "Ranks already gathered paper metadata locally without another provider or credential.",
      "Keeps every available score component and missing signal visible to the operator.",
    ],
    buildUserPrompt: (topic) =>
      `Decide what to read first for: ${topic}\n\nGather direct paper metadata, then use feynman_paper_rank with a JSON string containing 2-25 candidates. Do not invent missing metadata.`,
    systemDirective: `
[WORKFLOW DIRECTIVE — FEYNMAN PAPER RANK]
Treat this as transparent read-order triage, not peer review or completed replication.
Gather direct metadata when needed, then use feynman_paper_rank with the topic and a candidates_json string containing 2-25 papers.
Do not invent a paper's year, citation count, graph prestige, code link, data link, or evidence text. Leave unavailable fields out.
Return the read-order question, ranked list, complete score audit, missing evidence, limitations, and the strongest next paper to read.
[END WORKFLOW DIRECTIVE]
`,
  },
  {
    id: "lit-review",
    label: "Lit review",
    source: "feynman",
    agent: "nova",
    route: "/intel",
    aliases: ["lit", "lit-review", "litreview", "literature-review"],
    fallbackTopic:
      "the most relevant papers or technical sources for the current issue",
    promptExample:
      "/lit-review browser tool-use prompt caching and agent reliability",
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
      topicPlaceholder:
        "the most relevant papers or technical sources for the current issue",
    },
    hookNotes: [
      "Biases toward papers, standards, and technical documentation.",
      "Writes durable knowledge pages into the local memory spine.",
    ],
    buildUserPrompt: (topic) =>
      `Run a literature review for: ${topic}\n\nPrioritize papers, standards, official docs, benchmarks, and technical writeups before commentary.`,
    systemDirective: `
[WORKFLOW DIRECTIVE — LITERATURE REVIEW]
Prefer feynman_research with workflow "lit-review".
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
  buildFeynmanWorkflowDefinition({
    id: "review",
    label: "Peer review",
    aliases: ["review", "peer-review"],
    fallbackTopic: "the artifact or argument that needs rigorous review",
    promptExample: "/review the latest research brief",
    purpose:
      "Produce severity-graded peer review findings, identify unsupported claims and logical gaps, and provide a revision plan.",
  }),
  buildFeynmanWorkflowDefinition({
    id: "audit",
    label: "Claim audit",
    aliases: ["audit", "claim-audit", "paper-audit"],
    fallbackTopic:
      "the claim, paper, or public artifact that needs source verification",
    promptExample:
      "/audit does this paper's public code support its headline claim?",
    purpose:
      "Compare claims against direct sources, public documentation, repositories, counter-evidence, and coverage gaps.",
  }),
  buildFeynmanWorkflowDefinition({
    id: "replicate",
    label: "Replication plan",
    aliases: ["replicate", "replication"],
    fallbackTopic: "the experiment or benchmark that needs a reproducible plan",
    promptExample: "/replicate chain-of-thought improves math reasoning",
    purpose:
      "Produce a reproducible plan, environment choices, metrics, stop conditions, and verification criteria without executing anything.",
  }),
  buildFeynmanWorkflowDefinition({
    id: "recipe",
    label: "Research recipe",
    aliases: ["recipe", "ml-recipe"],
    fallbackTopic:
      "the implementation or training objective that needs ranked methods",
    promptExample:
      "/recipe fine-tune a small local model for structured extraction",
    purpose:
      "Rank implementable methods with datasets, code anchors, tradeoffs, resource posture, and verification status.",
  }),
  buildFeynmanWorkflowDefinition({
    id: "draft",
    label: "Research draft",
    aliases: ["draft", "paper-draft"],
    fallbackTopic: "the source-grounded topic that needs a structured draft",
    promptExample: "/draft a source-grounded paper on local-first agent memory",
    purpose:
      "Turn gathered evidence into a paper-style draft while preserving citations, uncertainty, and open questions.",
  }),
  buildFeynmanWorkflowDefinition({
    id: "autoresearch",
    label: "Autoresearch plan",
    aliases: ["autoresearch", "auto-research"],
    fallbackTopic:
      "the bounded experiment idea that needs one measurable objective",
    promptExample:
      "/autoresearch reduce local agent response latency without lowering citation quality",
    purpose:
      "Define a bounded experiment loop, one measurable objective, variants, acceptance criteria, and stop conditions without executing it.",
  }),
  buildFeynmanWorkflowDefinition({
    id: "watch",
    label: "Research watch",
    aliases: ["watch", "research-watch"],
    fallbackTopic: "the topic that needs a recurring material-change watch",
    promptExample: "/watch local AI agent security releases",
    purpose:
      "Define sources, cadence, material-change criteria, output expectations, and a human-gated scheduler handoff.",
    automationReady: true,
    schedulerDefaults: {
      cronSuggestion: "0 9 * * 1-5",
      outputTarget: "review",
      approvalPolicy: "human_gate",
      topicPlaceholder:
        "the topic that needs a recurring material-change watch",
    },
  }),
  buildFeynmanWorkflowDefinition({
    id: "outputs",
    label: "Feynman outputs",
    aliases: ["outputs", "research-outputs"],
    fallbackTopic: "recent Feynman-native VAULT outputs",
    promptExample: "/outputs",
    purpose: "List real recent Feynman-native research artifacts.",
    route: "/vault",
    outputTarget: "session_only",
  }),
  {
    id: "compare",
    label: "Compare matrix",
    source: "feynman",
    agent: "nova",
    route: "/intel",
    aliases: ["compare"],
    fallbackTopic: "the top competing options relevant to the current decision",
    promptExample:
      "/compare Anthropic prompt caching vs OpenAI batch processing for scheduled missions",
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
      topicPlaceholder:
        "the top competing options relevant to the current decision",
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
Prefer feynman_research with workflow "compare".
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
    promptExample:
      "/brief current operating picture across markets, cyber, and geopolitics",
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
    promptExample:
      "/threat-hunt suspicious outbound traffic and recent credential-theft indicators",
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
    promptExample:
      "/evidence-pack exposed admin panel and suspicious login sequence",
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
  const workflow = HQ_WORKFLOW_DEFINITIONS.find(
    (item) => item.id === workflowId,
  );
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

  const workflow = HQ_WORKFLOW_DEFINITIONS.find(
    (item) => item.id === workflowId,
  );
  if (!workflow) return null;

  const topic = normalizeTopic(match[2] ?? "", workflow.fallbackTopic);
  return {
    id: workflow.id,
    label: workflow.label,
    source: workflow.source,
    agent: workflow.agent,
    route: workflow.route,
    outputTarget: workflow.outputTarget,
    topic,
    userPrompt: workflow.buildUserPrompt(topic),
    systemDirective: workflow.systemDirective,
  };
}
