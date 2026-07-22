// ── lib/personaEngine.ts ──────────────────────────────────────────────────────
// Multi-persona prompt shaping + HQ Council mode runtime.
// Keeps persona routing on the shared AI boundary instead of ad hoc fetch logic.

import { callAIWithSystemPrompt } from "@/lib/ai";
import {
  applyCappedCouncilIdeationFrames,
  buildPinnedCouncilAdoptDraft,
  buildPinnedCouncilMergeDraft,
  COUNCIL_IDEATION_FRAMES,
  getCouncilIdeationFrameLabel,
} from "@/lib/councilDivergence";
import type {
  AgentId,
  AgentPersona,
  CouncilIdeationFrameId,
  CouncilResult,
  HQAssistantIntent,
  PersonaMode,
} from "@/components/home/office/types";

export interface CouncilMember {
  agent: AgentId;
  persona: PersonaMode;
  frame?: CouncilIdeationFrameId;
}

interface RunCouncilOptions {
  message: string;
  buildSystemPrompt: (member: CouncilMember) => string;
  members?: CouncilMember[];
  onPartialResult?: (result: CouncilResult) => void;
  invoke?: (input: {
    member: CouncilMember;
    systemPrompt: string;
    message: string;
    maxTokens: number;
    task: "chat" | "fast" | "reasoning";
  }) => Promise<string>;
}

// ── Persona templates ─────────────────────────────────────────────────────────

export const PERSONA_TEMPLATES: Record<PersonaMode, AgentPersona> = {
  formal: {
    mode: "formal",
    label: "Formal",
    tone: "institutional, cited, thorough",
    maxTokens: 2048,
    outputStyle: "structured prose with headers",
    promptSuffix: [
      "PERSONA OVERRIDE — FORMAL MODE:",
      "Respond with institutional rigor. Use clear section headers.",
      "Cite sources, data points, and reasoning steps explicitly when evidence is present.",
      "Every claim must be grounded. Avoid casual language.",
      "Structure: Background → Analysis → Conclusion → Recommendations.",
    ].join("\n"),
  },
  direct: {
    mode: "direct",
    label: "Direct",
    tone: "action-first, concrete, no filler",
    maxTokens: 1024,
    outputStyle: "bullets and short statements",
    promptSuffix: [
      "PERSONA OVERRIDE — DIRECT MODE:",
      "Lead with the action or answer, not background or a preamble.",
      "Use numbered steps when sequence matters and keep any list to five items or fewer.",
      "End with one concrete next action. Suppress tangents unless they block the task.",
      "Restate the current state after an interruption or error, and describe errors matter-of-factly.",
      "Make completed work and the current win visible when that helps the operator resume.",
      "Give estimates only when grounded in available evidence; never invent precision.",
      "Do not infer or mention a diagnosis or personal condition from this response style.",
    ].join("\n"),
  },
  deep: {
    mode: "deep",
    label: "Deep",
    tone: "exhaustive, multi-angle, shows all reasoning",
    maxTokens: 4096,
    thinkingBudget: 8000,
    outputStyle: "analysis blocks with trade-offs",
    promptSuffix: [
      "PERSONA OVERRIDE — DEEP MODE:",
      "Be exhaustive. Explore multiple angles and trade-offs.",
      "Identify uncertainty and missing evidence explicitly.",
      "Use analysis blocks: [CONTEXT] → [ANALYSIS] → [RISKS] → [VERDICT].",
      "Prefer a complete answer over a fast one.",
    ].join("\n"),
  },
};

export const DEFAULT_COUNCIL_MEMBERS: CouncilMember[] = [
  { agent: "jansky", persona: "formal" },
  { agent: "flux", persona: "direct" },
  { agent: "cipher", persona: "deep" },
];

// ── Persona suffix helper ─────────────────────────────────────────────────────

export function buildPersonaSuffix(persona: PersonaMode): string {
  const template = PERSONA_TEMPLATES[persona];
  if (!template) return "";
  return `\n\n${template.promptSuffix}`;
}

export function resolveCouncilMembers(input: {
  target: AgentId;
  intent: HQAssistantIntent;
  routeHint?: string | null;
  input?: string;
}): CouncilMember[] {
  let members: CouncilMember[];

  if (input.intent === "repo_work" || input.target === "orbit") {
    members = [
      { agent: "orbit", persona: "formal" },
      { agent: "jansky", persona: "direct" },
      { agent: "cipher", persona: "deep" },
    ];
  } else if (
    input.routeHint?.startsWith("/cyber") ||
    input.target === "cipher"
  ) {
    members = [
      { agent: "cipher", persona: "formal" },
      { agent: "jansky", persona: "direct" },
      { agent: "nova", persona: "deep" },
    ];
  } else if (input.routeHint?.startsWith("/alpha") || input.target === "flux") {
    members = [
      { agent: "flux", persona: "formal" },
      { agent: "jansky", persona: "direct" },
      { agent: "nova", persona: "deep" },
    ];
  } else if (
    input.routeHint?.startsWith("/recon") ||
    input.routeHint?.startsWith("/intel") ||
    input.target === "nova"
  ) {
    members = [
      { agent: "nova", persona: "formal" },
      { agent: "jansky", persona: "direct" },
      { agent: "cipher", persona: "deep" },
    ];
  } else {
    members = DEFAULT_COUNCIL_MEMBERS;
  }

  return applyCappedCouncilIdeationFrames(members, input.input ?? "");
}

function resolveCouncilTask(
  persona: PersonaMode,
): "chat" | "fast" | "reasoning" {
  if (persona === "deep") return "reasoning";
  if (persona === "direct") return "fast";
  return "chat";
}

function compareCouncilMembers(a: CouncilMember, b: CouncilMember): number {
  const agentDiff = a.agent.localeCompare(b.agent);
  if (agentDiff !== 0) return agentDiff;
  return a.persona.localeCompare(b.persona);
}

export function sortCouncilResults(
  results: CouncilResult[],
  members: CouncilMember[],
): CouncilResult[] {
  const order = new Map(
    members.map((member, index) => [
      `${member.agent}:${member.persona}`,
      index,
    ]),
  );
  return [...results].sort((a, b) => {
    const aIndex =
      order.get(`${a.agent}:${a.persona}`) ?? Number.MAX_SAFE_INTEGER;
    const bIndex =
      order.get(`${b.agent}:${b.persona}`) ?? Number.MAX_SAFE_INTEGER;
    if (aIndex !== bIndex) return aIndex - bIndex;
    return compareCouncilMembers(a, b);
  });
}

export function buildCouncilMergeDraft(results: CouncilResult[]): string {
  return buildPinnedCouncilMergeDraft(results);
}

export function buildCouncilAdoptDraft(result: CouncilResult): string {
  return buildPinnedCouncilAdoptDraft(result);
}

async function callCouncilMember(input: {
  member: CouncilMember;
  systemPrompt: string;
  message: string;
  maxTokens: number;
  task: "chat" | "fast" | "reasoning";
}): Promise<string> {
  return callAIWithSystemPrompt({
    systemPrompt: input.systemPrompt,
    messages: [{ role: "user", content: input.message }],
    maxTokens: input.maxTokens,
    task: input.task,
  });
}

export async function runCouncil(
  opts: RunCouncilOptions,
): Promise<CouncilResult[]> {
  const members =
    opts.members && opts.members.length > 0
      ? opts.members.slice(0, 3)
      : DEFAULT_COUNCIL_MEMBERS;
  const invoke = opts.invoke ?? callCouncilMember;
  const settled = await Promise.allSettled(
    members.map(async (member) => {
      const template = PERSONA_TEMPLATES[member.persona];
      const start = Date.now();
      const framePrompt = member.frame
        ? `\n\nCOUNCIL IDEATION FRAME — ${getCouncilIdeationFrameLabel(member.frame).toUpperCase()}:\n${COUNCIL_IDEATION_FRAMES.find((entry) => entry.id === member.frame)?.prompt ?? ""}\nWork independently inside this frame. Do not simulate the other Council members.`
        : "";
      const answer = await invoke({
        member,
        systemPrompt: `${opts.buildSystemPrompt(member)}${framePrompt}`,
        message: opts.message,
        maxTokens: template.maxTokens,
        task: resolveCouncilTask(member.persona),
      });
      const result: CouncilResult = {
        agent: member.agent,
        persona: member.persona,
        frame: member.frame,
        answer,
        duration: Date.now() - start,
      };
      opts.onPartialResult?.(result);
      return result;
    }),
  );

  const results: CouncilResult[] = [];
  for (const entry of settled) {
    if (entry.status === "fulfilled" && entry.value.answer.trim()) {
      results.push(entry.value);
    }
  }

  return sortCouncilResults(results, members);
}
