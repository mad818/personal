// ── lib/personaEngine.ts ──────────────────────────────────────────────────────
// Multi-Persona Engine + Agent Council Mode (Block N)
// Source inspiration: NVIDIA PersonaPlex
//
// Personas decouple "who this agent is" from "how it reasons right now."
// Council mode dispatches one query to multiple agents in parallel.
// All calls route through the existing /api/ai endpoint — no new providers.

import type { AgentId, AgentPersona, PersonaMode, CouncilResult } from "@/components/home/office/types";

// ── Persona templates ─────────────────────────────────────────────────────────

export const PERSONA_TEMPLATES: Record<PersonaMode, AgentPersona> = {
  formal: {
    mode:        "formal",
    label:       "Formal",
    tone:        "institutional, cited, thorough",
    maxTokens:   2048,
    outputStyle: "structured prose with headers",
    promptSuffix: [
      "PERSONA OVERRIDE — FORMAL MODE:",
      "Respond with institutional rigor. Use clear section headers.",
      "Cite sources, data points, and reasoning steps explicitly.",
      "Every claim must be grounded. Avoid casual language.",
      "Structure: Background → Analysis → Conclusion → Recommendations.",
    ].join("\n"),
  },
  direct: {
    mode:        "direct",
    label:       "Direct",
    tone:        "blunt, signal-first, no filler",
    maxTokens:   1024,
    outputStyle: "bullets and short statements",
    promptSuffix: [
      "PERSONA OVERRIDE — DIRECT MODE:",
      "Be blunt. Lead with the answer, not the context.",
      "Use short sentences and bullet points.",
      "Cut all filler. Every word must earn its place.",
      "If you have a recommendation, state it first.",
    ].join("\n"),
  },
  deep: {
    mode:          "deep",
    label:         "Deep",
    tone:          "exhaustive, multi-angle, shows all reasoning",
    maxTokens:     4096,
    thinkingBudget: 8000,
    outputStyle:   "analysis blocks with trade-offs",
    promptSuffix: [
      "PERSONA OVERRIDE — DEEP MODE:",
      "Be exhaustive. Show your full reasoning chain.",
      "Explore multiple angles: bull/bear, risk/opportunity, consensus/contrarian.",
      "Identify what you are uncertain about and flag it explicitly.",
      "Use analysis blocks: [CONTEXT] → [ANALYSIS] → [RISKS] → [VERDICT].",
    ].join("\n"),
  },
};

// ── buildPersonaSuffix ────────────────────────────────────────────────────────
// Returns the system prompt suffix for a given persona mode.
// This is appended to buildAgentPrompt() output — never replaces it.
export function buildPersonaSuffix(persona: PersonaMode): string {
  const template = PERSONA_TEMPLATES[persona];
  if (!template) return "";
  return `\n\n${template.promptSuffix}`;
}

// ── runCouncil ────────────────────────────────────────────────────────────────
// Dispatches the same message to multiple agents × personas in parallel.
// Uses Promise.allSettled — never throws. Returns all results that resolved.
// Each call goes through /api/ai with no custom endpoint.
export async function runCouncil(opts: {
  message:         string;
  systemPrompt:    string;
  agents?:         AgentId[];
  personas?:       PersonaMode[];
  maxTokens?:      number;
  onPartialResult?: (r: CouncilResult) => void;
}): Promise<CouncilResult[]> {
  const agents  = opts.agents  ?? (["jansky", "flux", "cipher"] as AgentId[]);
  const personas = opts.personas ?? (["formal", "direct", "deep"] as PersonaMode[]);

  // Build all (agent × persona) pairs — but cap at 9 to avoid runaway cost
  const pairs: Array<{ agent: AgentId; persona: PersonaMode }> = [];
  for (const agent of agents.slice(0, 3)) {
    for (const persona of personas.slice(0, 3)) {
      pairs.push({ agent, persona });
    }
  }

  const settled = await Promise.allSettled(
    pairs.map(async ({ agent, persona }) => {
      const template = PERSONA_TEMPLATES[persona];
      const maxTok   = opts.maxTokens ?? template.maxTokens;
      const suffix   = buildPersonaSuffix(persona);
      const fullSystem = opts.systemPrompt + suffix;
      const start   = Date.now();

      const resp = await fetch("/api/ai", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages:     [{ role: "user", content: opts.message }],
          system:       fullSystem,
          max_tokens:   maxTok,
          provider:     agent,   // hint — auto-chain if not matched
        }),
        signal: AbortSignal.timeout(60_000),
      });

      if (!resp.ok) throw new Error(`/api/ai responded ${resp.status}`);
      const data = await resp.json() as { content?: string; error?: string };
      const answer = data.content ?? "";
      const duration = Date.now() - start;

      const result: CouncilResult = { agent, persona, answer, duration };
      opts.onPartialResult?.(result);
      return result;
    }),
  );

  const results: CouncilResult[] = [];
  for (const s of settled) {
    if (s.status === "fulfilled") results.push(s.value);
  }
  return results;
}
