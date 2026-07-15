import { hasDeepResearchIntent } from "@/lib/deepResearch";
import { detectTeamOrchestrationNeed } from "@/lib/teamOrchestration";

export type AgentPipelineFamily =
  | "deer-flow"
  | "generic-squad"
  | "feynman"
  | "forecast-lab"
  | null;

export interface AgentWorkflowDescriptor {
  id: string;
  label: string;
  sourceRepo: string;
  sourceUrl: string;
  disposition:
    | "shipped"
    | "adapted"
    | "external_reference"
    | "byok_optional"
    | "defer"
    | "boundary";
  nexusSurface: string;
  operatorNote: string;
}

export function resolveAgentPipelineFamily(input: string): AgentPipelineFamily {
  const clean = input.trim();
  if (!clean) return null;
  if (hasDeepResearchIntent(clean)) return "deer-flow";
  if (
    /\b(?:\/lit\b|\/review\b|feynman_research|literature review|peer review)\b/i.test(
      clean,
    )
  ) {
    return "feynman";
  }
  if (/\b(?:forecast lab|timesfm|backtest forecast)\b/i.test(clean)) {
    return "forecast-lab";
  }
  if (detectTeamOrchestrationNeed(clean)) return "generic-squad";
  return null;
}

export function listAgentWorkflowDescriptors(): AgentWorkflowDescriptor[] {
  return [
    {
      id: "deer-flow-deep-research",
      label: "DeerFlow-style deep research",
      sourceRepo: "bytedance/deer-flow",
      sourceUrl: "https://github.com/bytedance/deer-flow",
      disposition: "adapted",
      nexusSurface:
        "lib/deepResearch.ts · COMMAND/CYBER briefs · `/deepresearch` trigger · evidence ledger sections",
      operatorNote:
        "Native pipeline only — planner/researcher/writer stages map to existing deepResearch + Feynman lanes. No DeerFlow runtime vendored.",
    },
    {
      id: "central-orchestrator-squad",
      label: "Squad-style central orchestrator",
      sourceRepo: "mco-org/squad",
      sourceUrl: "https://github.com/mco-org/squad",
      disposition: "adapted",
      nexusSurface:
        "MAX dispatch · delegate_specialist · typed worker handoffs · TeamOrchestrationStrip",
      operatorNote:
        "MAX owns decomposition and synthesis; at most three temporary advisory workers return typed handoffs. No Squad binary, SQLite bus, or terminal launcher is installed.",
    },
    {
      id: "generic-agent-squad",
      label: "GenericAgent / phased squad",
      sourceRepo: "lsdefine/GenericAgent",
      sourceUrl: "https://github.com/lsdefine/GenericAgent",
      disposition: "adapted",
      nexusSurface:
        "lib/teamOrchestration.ts · TeamOrchestrationStrip · assistantDispatch context",
      operatorNote:
        "Single-lead phased handoffs with verify/fix exit criteria. No parallel write agents.",
    },
    {
      id: "deep-tutor-study",
      label: "DeepTutor guided learning",
      sourceRepo: "HKUDS/DeepTutor",
      sourceUrl: "https://github.com/HKUDS/DeepTutor",
      disposition: "external_reference",
      nexusSurface:
        "HQ learning intent · VAULT compiled pages · RESOURCES study chamber",
      operatorNote:
        "Run DeepTutor beside Nexus for structured tutoring; file summaries back to VAULT with tags.",
    },
    {
      id: "llm-wiki-corpus",
      label: "LLM Wiki corpus",
      sourceRepo: "nashsu/llm_wiki",
      sourceUrl: "https://github.com/nashsu/llm_wiki",
      disposition: "external_reference",
      nexusSurface: "NOVA research · RAG retrieval planner hints",
      operatorNote:
        "Use as external reading list for agent/RAG concepts; do not mirror corpus into prompts wholesale.",
    },
    {
      id: "markdown-viewer-skills",
      label: "Markdown viewer skills pack",
      sourceRepo: "markdown-viewer/skills",
      sourceUrl: "https://github.com/markdown-viewer/skills",
      disposition: "external_reference",
      nexusSurface:
        "`.claude/skills/*` discipline · lib/promptRecipes.ts · document_to_markdown",
      operatorNote:
        "Borrow checklist structure for skill docs; never copy skill bodies without license review.",
    },
    {
      id: "project-nomad-field",
      label: "Project Nomad field ops",
      sourceRepo: "Crosstalk-Solutions/project-nomad",
      sourceUrl: "https://github.com/Crosstalk-Solutions/project-nomad",
      disposition: "defer",
      nexusSurface:
        "COMMAND/OPS mobile posture · offline-first Docker reference",
      operatorNote:
        "Different architecture (offline Docker stack). Compare to homelable + phone acceptance only.",
    },
    {
      id: "ai-engineering-from-scratch",
      label: "AI Engineering from Scratch",
      sourceRepo: "rohitg00/ai-engineering-from-scratch",
      sourceUrl: "https://github.com/rohitg00/ai-engineering-from-scratch",
      disposition: "external_reference",
      nexusSurface:
        "MR1 market review · VR1 vehicle readiness · developerResources study lane",
      operatorNote:
        "Cross-ref rohitg00/pro-workflow for handoff discipline; use repo as curriculum map only.",
    },
    {
      id: "timesfm-forecast",
      label: "TimesFM forecasting",
      sourceRepo: "google-research/timesfm",
      sourceUrl: "https://github.com/google-research/timesfm",
      disposition: "adapted",
      nexusSurface:
        "Forecast Lab · `/api/metrics/runtime-eval/forecast*` · native_baseline backtest",
      operatorNote:
        "Companion provider optional after A7 eval proof. NEXUS_EXPERIMENT_TIMESFM_SPIKE for spike only.",
    },
  ];
}

export function formatAgentPipelineFamilyBlock(
  family: AgentPipelineFamily,
): string {
  if (!family) return "";
  const labels: Record<Exclude<AgentPipelineFamily, null>, string> = {
    "deer-flow": "Deep research (DeerFlow-aligned sections)",
    "generic-squad": "Phased squad orchestration",
    feynman: "Feynman workflow family",
    "forecast-lab": "Forecast Lab eval lane",
  };
  return `\n[AGENT PIPELINE FAMILY: ${labels[family]}]\n`;
}
