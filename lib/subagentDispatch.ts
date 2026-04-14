// lib/subagentDispatch.ts
// ORBIT subagent spawning — Goose subagent_handler.rs pattern (TypeScript port)
// ORBIT dispatches child agents (CIPHER, NOVA, FLUX) with focused missions,
// filtered context, and a turn limit. Parent receives structured results.

import type { AgentId } from "@/components/home/office/types";
import { callAI } from "@/lib/ai";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SubagentTask {
  agent: AgentId;       // which child agent to run
  mission: string;      // specific task statement
  context?: string;     // filtered parent context to inject
  maxTokens?: number;   // default 1024
  task?: string;        // model routing hint: "reasoning" | "research" | "fast"
  turnLimit?: number;   // retry turns on empty response (default 1)
}

export interface SubagentResult {
  agent: AgentId;
  mission: string;
  answer: string;
  durationMs: number;
  success: boolean;
  error?: string;
}

export interface SubagentPlan {
  tasks: SubagentTask[];
  parallel?: boolean;   // run tasks concurrently (default true)
  synthesize?: boolean; // ask ORBIT to synthesize results after (default false)
}

export interface SubagentDispatchResult {
  results: SubagentResult[];
  synthesis?: string;
  totalDurationMs: number;
}

// ─── Agent domain focus prompts ───────────────────────────────────────────────
// Each child agent gets a stripped-down system prompt focused on its domain.
// These are intentionally short — the parent ORBIT context is NOT forwarded
// unless explicitly included in task.context.

const DOMAIN_PROMPTS: Record<AgentId, string> = {
  jansky:
    "You are JANSKY (MAX) — meta-strategist and orchestrator. Answer with structured reasoning. Be concise and cite confidence level.",
  orbit:
    "You are ORBIT (EL) — codebase and project architect. Analyze code, architecture, and implementation plans. Be precise.",
  nova:
    "You are NOVA (DUSTIN) — research specialist. Search, synthesize, and cite sources. Flag any unverified claims. Be factual.",
  cipher:
    "You are CIPHER (HOPPER) — security analyst. Assess threats, CVEs, and compliance. Reference real standards. Be direct.",
  flux:
    "You are FLUX (LUCAS) — market and financial analyst. Lead with live data context, then interpret. Be probability-aware.",
};

// ─── Run a single child agent ─────────────────────────────────────────────────

async function runChildAgent(task: SubagentTask): Promise<SubagentResult> {
  const start = Date.now();
  const maxTokens = task.maxTokens ?? 1024;
  const turnLimit = task.turnLimit ?? 1;
  const systemFocus = DOMAIN_PROMPTS[task.agent] ?? DOMAIN_PROMPTS.jansky;

  const contextBlock = task.context
    ? `\n\n== CONTEXT FROM ORBIT ==\n${task.context}\n== END CONTEXT ==`
    : "";

  const prompt = `${systemFocus}${contextBlock}\n\nMISSION: ${task.mission}`;

  let answer = "";
  let lastError: string | undefined;

  for (let turn = 0; turn < turnLimit; turn++) {
    try {
      const raw = await callAI(prompt, maxTokens, task.task);
      if (raw && raw.trim().length > 0) {
        answer = raw.trim();
        break;
      }
      lastError = "Empty response from model";
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  return {
    agent: task.agent,
    mission: task.mission,
    answer,
    durationMs: Date.now() - start,
    success: answer.length > 0,
    error: answer.length === 0 ? lastError : undefined,
  };
}

// ─── Main dispatch function ───────────────────────────────────────────────────
// Called by ORBIT when it detects a multi-step plan in the user message.
// Returns all child results and optionally an ORBIT synthesis.

export async function dispatchSubagents(
  plan: SubagentPlan,
): Promise<SubagentDispatchResult> {
  const start = Date.now();
  const parallel = plan.parallel ?? true;

  // Run tasks parallel or serial
  let results: SubagentResult[];
  if (parallel) {
    results = await Promise.all(plan.tasks.map(runChildAgent));
  } else {
    results = [];
    for (const task of plan.tasks) {
      results.push(await runChildAgent(task));
    }
  }

  // Optional ORBIT synthesis pass
  let synthesis: string | undefined;
  if (plan.synthesize) {
    const summaries = results
      .map((r) => `[${r.agent.toUpperCase()}]: ${r.answer || "(no answer)"}`)
      .join("\n\n");
    const synthPrompt = `${DOMAIN_PROMPTS.orbit}\n\nYou dispatched the following child agents. Synthesize their findings into a single actionable summary. Flag any conflicts.\n\n${summaries}`;
    try {
      synthesis = (await callAI(synthPrompt, 1200, "reasoning")).trim();
    } catch {
      synthesis = "Synthesis failed — see individual agent results above.";
    }
  }

  return {
    results,
    synthesis,
    totalDurationMs: Date.now() - start,
  };
}

// ─── Helper: parse ORBIT plan from message text ───────────────────────────────
// ORBIT can embed a JSON plan in its response inside a ```plan block.
// This parser extracts it. Returns null if no valid plan found.

export function parseSubagentPlan(text: string): SubagentPlan | null {
  const match = text.match(/```plan\s*([\s\S]*?)```/i);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1].trim()) as SubagentPlan;
    if (!Array.isArray(parsed.tasks) || parsed.tasks.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}
