import type { MemoryCompartment } from "@/lib/memoryMining";
import type { WorkflowPackId } from "@/lib/researchSources";

export type LearningMissionMode =
  | "teach"
  | "explain"
  | "review"
  | "quiz"
  | "practice"
  | "study-plan"
  | "ideate"
  | "source-review"
  | "evidence-analysis"
  | "synthesis"
  | "writing"
  | "review-response";

export type TutorProfileId =
  | "concept-tutor"
  | "code-tutor"
  | "research-tutor"
  | "reverse-engineering-tutor"
  | "research-analyst"
  | "literature-reviewer"
  | "evidence-synthesizer"
  | "study-coach";

export interface TutorProfile {
  id: TutorProfileId;
  title: string;
  summary: string;
  exactHref: string;
  keywords: string[];
}

export interface LearningMission {
  workflowPackId: WorkflowPackId;
  mode: LearningMissionMode;
  profile: TutorProfileId;
  subject: string;
  objective: string;
  checkpoint: string;
  preparedWorkspaceHref: string;
  memoryCompartment: MemoryCompartment;
  sourceAware: boolean;
}

const LEARNING_MODE_PATTERNS: Array<{
  mode: LearningMissionMode;
  pattern: RegExp;
}> = [
  {
    mode: "review-response",
    pattern:
      /\b(?:review response|respond to review|reply to reviewer|rebuttal|address reviewer feedback)\b/i,
  },
  {
    mode: "source-review",
    pattern:
      /\b(?:source review|review sources|survey sources|literature review|survey the literature|what sources do we have|review the sources)\b/i,
  },
  {
    mode: "evidence-analysis",
    pattern:
      /\b(?:evidence analysis|analyze the evidence|compare the evidence|compare sources|weigh the evidence|evidence review)\b/i,
  },
  {
    mode: "synthesis",
    pattern:
      /\b(?:synthesize|synthesis brief|build a synthesis|pull this together|turn this into a synthesis|synthesize what we know)\b/i,
  },
  {
    mode: "writing",
    pattern:
      /\b(?:write this up|draft the brief|write the memo|draft a response|turn this into a brief|compose the write-up)\b/i,
  },
  {
    mode: "ideate",
    pattern:
      /\b(?:ideate|brainstorm|frame the question|scope the question|research question|frame the problem)\b/i,
  },
  {
    mode: "quiz",
    pattern:
      /\b(?:quiz me on|quiz me about|test me on|test me about|give me a quiz|flash cards?|flashcards?)\b/i,
  },
  {
    mode: "practice",
    pattern:
      /\b(?:help me practice|let me practice|practice with me|drill me on|walk me through practice)\b/i,
  },
  {
    mode: "review",
    pattern:
      /\b(?:review what we know|review this with me|review this topic|summarize what we know|what do we already know)\b/i,
  },
  {
    mode: "study-plan",
    pattern:
      /\b(?:study plan|learning plan|plan my study|help me study|study roadmap)\b/i,
  },
  {
    mode: "teach",
    pattern: /\b(?:teach me|coach me through|show me how to understand)\b/i,
  },
  {
    mode: "explain",
    pattern:
      /\b(?:explain\b|break down\b|help me understand\b|what is\b|how does\b|why does\b|why is\b)\b/i,
  },
];

const CODE_RE =
  /\b(?:repo|repository|codebase|typescript|next\.?js|react|component|hook|api route|refactor|debug|code)\b/i;
const RESEARCH_RE =
  /\b(?:research|sources|evidence|compare|brief|review|literature|sweep|sweeps|citation|citations|write-up|synthesis)\b/i;
const REVERSE_ENGINEERING_RE =
  /\b(?:reverse engineering|reverse-engineering|binary|ghidra|strings|entropy|ioc|malware|sample)\b/i;
const LEARNING_HINT_RE =
  /\b(?:teach|explain|review|quiz|practice|study|brainstorm|ideate|sources|evidence|synthesis|write this up|rebuttal)\b/i;
const SUBJECT_PREFIX_RE =
  /^(?:teach me|explain|quiz me on|quiz me about|test me on|test me about|help me practice|let me practice|practice with me|review what we know about|review what we know on|review|help me study|study plan for|study roadmap for|what do we already know about|source review for|review the sources for|survey the literature on|analyze the evidence for|synthesize|write this up as|write the memo on|brainstorm|ideate on|frame the question for|respond to review for)\s+/i;

export const TUTOR_PROFILES: Record<TutorProfileId, TutorProfile> = {
  "concept-tutor": {
    id: "concept-tutor",
    title: "Concept tutor",
    summary:
      "Break concepts into simple mental models, checkpoints, and short explanations.",
    exactHref: "/skills?view=brain&focus=skills-brain",
    keywords: ["concept", "teach", "explain", "understand", "study"],
  },
  "code-tutor": {
    id: "code-tutor",
    title: "Code tutor",
    summary:
      "Teach implementation details, safe coding steps, and repo-grounded practice.",
    exactHref: "/resources?view=study",
    keywords: ["code", "repo", "typescript", "react", "next.js", "debug"],
  },
  "research-tutor": {
    id: "research-tutor",
    title: "Research tutor",
    summary:
      "Teach by comparing evidence, source-backed summaries, and review-oriented prompts.",
    exactHref: "/vault?focus=vault-memory-general",
    keywords: ["research", "sources", "review", "compare", "brief"],
  },
  "reverse-engineering-tutor": {
    id: "reverse-engineering-tutor",
    title: "Reverse-engineering tutor",
    summary:
      "Teach local triage, evidence capture, and follow-through for binary analysis.",
    exactHref: "/vault?focus=vault-memory-project",
    keywords: ["reverse engineering", "binary", "ghidra", "malware", "sample"],
  },
  "research-analyst": {
    id: "research-analyst",
    title: "Research analyst",
    summary:
      "Frame the question, bound the scope, and stage the strongest first evidence lane.",
    exactHref: "/resources?view=study",
    keywords: ["research", "ideate", "question", "scope", "investigate"],
  },
  "literature-reviewer": {
    id: "literature-reviewer",
    title: "Literature reviewer",
    summary:
      "Review local sources and literature-style evidence before widening into synthesis.",
    exactHref: "/vault?focus=vault-memory-research",
    keywords: ["sources", "literature", "citations", "survey", "review"],
  },
  "evidence-synthesizer": {
    id: "evidence-synthesizer",
    title: "Evidence synthesizer",
    summary:
      "Compare evidence, produce synthesis, and reopen the right durable brief without duplication.",
    exactHref: "/vault?focus=vault-memory-study",
    keywords: ["evidence", "synthesis", "brief", "write-up", "analysis"],
  },
  "study-coach": {
    id: "study-coach",
    title: "Study coach",
    summary:
      "Turn knowledge into compact checkpoints, practice loops, and one clear next session.",
    exactHref: "/vault?focus=vault-memory-study",
    keywords: ["study", "quiz", "practice", "checkpoint", "plan"],
  },
};

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function detectLearningMode(input: string): LearningMissionMode | null {
  for (const entry of LEARNING_MODE_PATTERNS) {
    if (entry.pattern.test(input)) return entry.mode;
  }
  return null;
}

function detectTutorProfile(
  input: string,
  mode: LearningMissionMode,
): TutorProfileId {
  if (REVERSE_ENGINEERING_RE.test(input)) return "reverse-engineering-tutor";
  if (mode === "source-review") return "literature-reviewer";
  if (
    mode === "evidence-analysis" ||
    mode === "synthesis" ||
    mode === "writing" ||
    mode === "review-response"
  ) {
    return "evidence-synthesizer";
  }
  if (mode === "ideate" && RESEARCH_RE.test(input)) return "research-analyst";
  if (mode === "quiz" || mode === "practice" || mode === "study-plan") {
    return "study-coach";
  }
  if (CODE_RE.test(input)) return "code-tutor";
  if (RESEARCH_RE.test(input)) return "research-tutor";
  return "concept-tutor";
}

function deriveSubject(input: string, mode: LearningMissionMode) {
  const normalized = normalizeWhitespace(
    input.replace(SUBJECT_PREFIX_RE, "").replace(/[?.!]+$/g, ""),
  );
  if (normalized.length > 0 && normalized.length !== input.trim().length) {
    return normalized;
  }

  switch (mode) {
    case "quiz":
      return "the active topic";
    case "practice":
      return "the current skill";
    case "review":
      return "the current thread";
    case "study-plan":
      return "the requested subject";
    case "teach":
    case "explain":
    default:
      return "the requested topic";
  }
}

function buildObjective(mode: LearningMissionMode, subject: string) {
  switch (mode) {
    case "ideate":
      return `Frame ${subject} as a compact research question, the likely evidence lane, and the strongest first exact workspace.`;
    case "source-review":
      return `Review the best local sources for ${subject} before widening into synthesis or new claims.`;
    case "evidence-analysis":
      return `Compare the current evidence for ${subject} and call out where the support is weak, inferred, or strong.`;
    case "synthesis":
      return `Synthesize what we know about ${subject} into one compact evidence-backed throughline.`;
    case "writing":
      return `Turn ${subject} into a concise source-aware brief without losing continuity with the lower-order notes.`;
    case "review-response":
      return `Address the current review feedback on ${subject} with one direct answer and one strongest correction path.`;
    case "teach":
      return `Teach ${subject} with a short explanation first, then one small checkpoint.`;
    case "explain":
      return `Explain ${subject} clearly, then offer one follow-up checkpoint if it would help.`;
    case "review":
      return `Review what we already know about ${subject} before widening into new material.`;
    case "quiz":
      return `Quiz the user on ${subject} with one short check at a time.`;
    case "practice":
      return `Help the user practice ${subject} with one concrete exercise or worked step.`;
    case "study-plan":
      return `Turn ${subject} into a compact study plan with ordered next steps.`;
    default:
      return `Help the user learn ${subject}.`;
  }
}

function buildCheckpoint(mode: LearningMissionMode, subject: string) {
  switch (mode) {
    case "ideate":
      return `End with the strongest first source-review or study workspace for ${subject}.`;
    case "source-review":
      return `Call out one source gap or missing citation lane for ${subject}.`;
    case "evidence-analysis":
      return `Name one claim about ${subject} that still needs stronger support.`;
    case "synthesis":
      return `End with one synthesis-ready next step for ${subject}, not a dashboard of options.`;
    case "writing":
      return `Keep the write-up grounded in the current sources for ${subject}.`;
    case "review-response":
      return `End with one concrete correction or reopen path for ${subject}.`;
    case "teach":
    case "explain":
      return `End with one quick check that confirms the user can restate ${subject}.`;
    case "review":
      return `Call out one open gap or unresolved question about ${subject}.`;
    case "quiz":
      return `Ask one short question about ${subject} instead of dumping a full test.`;
    case "practice":
      return `Offer one concrete exercise or next move for ${subject}.`;
    case "study-plan":
      return `End with the strongest first study session for ${subject}.`;
    default:
      return `Keep the next step compact and actionable.`;
  }
}

export function isLearningPrompt(input: string) {
  return LEARNING_HINT_RE.test(input) && detectLearningMode(input) !== null;
}

function detectWorkflowPackId(mode: LearningMissionMode): WorkflowPackId {
  switch (mode) {
    case "ideate":
    case "source-review":
    case "evidence-analysis":
    case "synthesis":
    case "writing":
    case "review-response":
      return "research-workflow";
    default:
      return "guided-learning";
  }
}

function detectMemoryCompartmentForMission(
  input: string,
  mode: LearningMissionMode,
  profile: TutorProfileId,
): MemoryCompartment {
  if (profile === "reverse-engineering-tutor" || profile === "code-tutor") {
    return "project";
  }
  if (
    mode === "source-review" ||
    mode === "evidence-analysis" ||
    mode === "synthesis" ||
    mode === "writing" ||
    mode === "review-response" ||
    (mode === "review" && RESEARCH_RE.test(input))
  ) {
    return "research";
  }
  if (
    mode === "quiz" ||
    mode === "practice" ||
    mode === "study-plan" ||
    profile === "study-coach"
  ) {
    return "study";
  }
  if (mode === "review") return "conversation";
  if (mode === "ideate" && RESEARCH_RE.test(input)) return "research";
  return "study";
}

export function detectLearningMission(input: string): LearningMission | null {
  const mode = detectLearningMode(input);
  if (!mode) return null;
  const profile = detectTutorProfile(input, mode);
  const subject = deriveSubject(input, mode);
  const workflowPackId = detectWorkflowPackId(mode);
  return {
    workflowPackId,
    mode,
    profile,
    subject,
    objective: buildObjective(mode, subject),
    checkpoint: buildCheckpoint(mode, subject),
    preparedWorkspaceHref: TUTOR_PROFILES[profile].exactHref,
    memoryCompartment: detectMemoryCompartmentForMission(input, mode, profile),
    sourceAware:
      workflowPackId === "research-workflow" || RESEARCH_RE.test(input),
  };
}

export function buildLearningMissionPromptBlock(
  mission: LearningMission | null | undefined,
) {
  if (!mission) return "";
  const profile = TUTOR_PROFILES[mission.profile];
  return [
    "",
    "[GUIDED LEARNING MISSION]",
    `- Workflow pack: ${mission.workflowPackId}.`,
    `- Mode: ${mission.mode}.`,
    `- Tutor profile: ${profile.title}.`,
    `- Subject: ${mission.subject}.`,
    `- Preferred memory compartment: ${mission.memoryCompartment}.`,
    `- Objective: ${mission.objective}`,
    `- Checkpoint rule: ${mission.checkpoint}`,
    mission.sourceAware
      ? "- Prefer source-backed synthesis when local evidence exists, and label inferred carry-forward as inferred."
      : "- Keep the teaching loop compact and use local memory only when it improves the answer.",
    "- Answer directly first, then add one compact checkpoint, quiz, or next study step only if it helps.",
    "- Keep the tutoring behavior assistant-first and avoid turning the reply into a dashboard.",
    "[END GUIDED LEARNING MISSION]",
    "",
  ].join("\n");
}
