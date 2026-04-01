"use client";

// ── AI call wrappers — all Anthropic calls go through /api/ai (server-side key)

import { DEFAULT_SETTINGS, type Settings } from "@/store/useStore";
import { apiFetch } from "@/lib/apiFetch";
import { MINIMAX_DEFAULT_CHAT_MODEL, TASK_MODELS } from "@/lib/aiModelRouting";
import { NEXUS_AGENT_NO_BILLING_RULE } from "@/lib/productGuarantees";
import { getNavProductSurfaces, summarizeSurfaceTiers } from "@/lib/releaseMatrix";

function getSettings(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem("nexus-settings");
    return raw
      ? (JSON.parse(raw).state?.settings ?? DEFAULT_SETTINGS)
      : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function aiReady(s: Settings): boolean {
  // Cloud providers route via /api/ai with server-side keys
  if (
    s.aiProvider === "anthropic" ||
    s.aiProvider === "openai" ||
    s.aiProvider === "minimax"
  )
    return true;
  // Local Ollama — needs endpoint + model
  if (s.localEndpoint && s.localModel) return true;
  return false;
}

const NON_INTERACTIVE_SINGLE_FLIGHT = new Map<string, Promise<string>>();
const SYSTEM_PROMPT_CACHE = new Map<string, string>();

function stableHash(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function buildPromptProfileSignature(s: Settings, liveContext: string) {
  return JSON.stringify({
    userName: s.userName,
    userGoals: s.userGoals,
    userSkills: s.userSkills,
    userLearning: s.userLearning,
    userContext: s.userContext,
    deploymentLanePreference: s.deploymentLanePreference,
    surfaceVisibilityPreference: s.surfaceVisibilityPreference,
    liveContextHash: stableHash(liveContext),
  });
}

export function buildCachedSystemPrompt(s: Settings, liveContext = ""): string {
  const key = buildPromptProfileSignature(s, liveContext);
  const cached = SYSTEM_PROMPT_CACHE.get(key);
  if (cached) return cached;
  const prompt = buildSystemPrompt(s, liveContext);
  SYSTEM_PROMPT_CACHE.set(key, prompt);
  return prompt;
}

// ── Streaming helper ──────────────────────────────────────────────────────────
async function streamRequest(
  url: string,
  headers: Record<string, string>,
  body: object,
  onChunk: (text: string) => void,
  useApiFetch = false,
): Promise<string> {
  const res = useApiFetch
    ? await apiFetch(url, { method: "POST", body: JSON.stringify(body) })
    : await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(body),
      });
  if (!res.ok) throw new Error(`API ${res.status}`);
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let full = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    for (const line of chunk.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (data === "[DONE]") continue;
      try {
        const json = JSON.parse(data);
        const text =
          json.choices?.[0]?.delta?.content ?? json.delta?.text ?? "";
        if (text) {
          full += text;
          onChunk(text);
        }
      } catch {
        /* skip malformed */
      }
    }
  }
  return full;
}

async function callLocalModel(
  s: Settings,
  body: {
    max_tokens: number;
    messages: { role: string; content: string }[];
    task?: string;
  },
) {
  const model = body.task
    ? (TASK_MODELS[body.task as keyof typeof TASK_MODELS] ?? s.localModel)
    : s.localModel;
  const res = await fetch(s.localEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(s.localApiKey ? { Authorization: `Bearer ${s.localApiKey}` } : {}),
    },
    body: JSON.stringify({
      model,
      max_tokens: body.max_tokens,
      messages: body.messages,
    }),
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

// ── Main AI call (non-streaming) ──────────────────────────────────────────────
export async function callAI(
  prompt: string,
  maxTokens = 1024,
  task?: string,
): Promise<string> {
  const s = getSettings();
  if (!aiReady(s)) throw new Error("No AI configured");

  // Route cloud providers through /api/ai — key never leaves the server
  if (
    s.aiProvider === "anthropic" ||
    s.aiProvider === "openai" ||
    s.aiProvider === "minimax"
  ) {
    const cloudProvider = s.aiProvider;
    const cloudModel =
      cloudProvider === "anthropic"
        ? "claude-opus-4-5"
        : cloudProvider === "minimax"
          ? MINIMAX_DEFAULT_CHAT_MODEL
          : "gpt-4o-mini";
    const res = await apiFetch("/api/ai", {
      method: "POST",
      body: JSON.stringify({
        provider: cloudProvider,
        model: cloudModel,
        max_tokens: maxTokens,
        messages: [{ role: "user", content: prompt }],
        ...(task ? { task } : {}),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      if (s.localEndpoint && s.localModel) {
        return callLocalModel(s, {
          max_tokens: maxTokens,
          messages: [{ role: "user", content: prompt }],
          task,
        });
      }
      throw new Error(data?.error?.message ?? `API error ${res.status}`);
    }
    // Anthropic returns content array; OpenAI-compat returns choices
    return data.content?.[0]?.text ?? data.choices?.[0]?.message?.content ?? "";
  }

  // Local Ollama — pick model by task hint
  return callLocalModel(s, {
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
    task,
  });
}

export async function callNonInteractiveAI(opts: {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  task?: string;
  singleFlightKey?: string;
}): Promise<string> {
  const { systemPrompt, userPrompt, maxTokens = 300, task = "fast", singleFlightKey } = opts;
  const existing = singleFlightKey
    ? NON_INTERACTIVE_SINGLE_FLIGHT.get(singleFlightKey)
    : null;
  if (existing) return existing;

  const run = async () => {
    const s = getSettings();
    if (!aiReady(s)) throw new Error("No AI configured");

    if (
      s.aiProvider === "anthropic" ||
      s.aiProvider === "openai" ||
      s.aiProvider === "minimax"
    ) {
      const cloudProvider = s.aiProvider;
      const cloudModel =
        cloudProvider === "anthropic"
          ? "claude-opus-4-5"
          : cloudProvider === "minimax"
            ? MINIMAX_DEFAULT_CHAT_MODEL
            : "gpt-4o-mini";
      const res = await apiFetch("/api/ai", {
        method: "POST",
        body: JSON.stringify({
          provider: cloudProvider,
          model: cloudModel,
          max_tokens: maxTokens,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
          task,
          non_interactive: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (s.localEndpoint && s.localModel) {
          return callLocalModel(s, {
            max_tokens: maxTokens,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            task,
          });
        }
        throw new Error(data?.error?.message ?? `API error ${res.status}`);
      }
      return (
        data.content?.[0]?.text ?? data.choices?.[0]?.message?.content ?? ""
      );
    }

    return callLocalModel(s, {
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      task,
    });
  };

  const promise = run().finally(() => {
    if (singleFlightKey) NON_INTERACTIVE_SINGLE_FLIGHT.delete(singleFlightKey);
  });
  if (singleFlightKey) NON_INTERACTIVE_SINGLE_FLIGHT.set(singleFlightKey, promise);
  return promise;
}

// ── Streaming AI call ─────────────────────────────────────────────────────────
export async function streamAI(
  messages: { role: string; content: string }[],
  systemPrompt: string,
  onChunk: (text: string) => void,
  maxTokens = 1024,
  task?: string,
): Promise<string> {
  const s = getSettings();
  if (!aiReady(s)) throw new Error("No AI configured");

  if (
    s.aiProvider === "anthropic" ||
    s.aiProvider === "openai" ||
    s.aiProvider === "minimax"
  ) {
    const cloudProvider = s.aiProvider;
    const cloudModel =
      cloudProvider === "anthropic"
        ? "claude-opus-4-5"
        : cloudProvider === "minimax"
          ? MINIMAX_DEFAULT_CHAT_MODEL
          : "gpt-4o-mini";
    return streamRequest(
      "/api/ai",
      {},
      {
        provider: cloudProvider,
        model: cloudModel,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages,
        stream: true,
        ...(task ? { task } : {}),
      },
      onChunk,
      true, // use apiFetch
    );
  }

  // Local Ollama — pick model by task hint
  const model = task
    ? (TASK_MODELS[task as keyof typeof TASK_MODELS] ?? s.localModel)
    : s.localModel;
  return streamRequest(
    s.localEndpoint,
    s.localApiKey ? { Authorization: `Bearer ${s.localApiKey}` } : {},
    {
      model,
      max_tokens: maxTokens,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      stream: true,
    },
    onChunk,
    false,
  );
}

// ── Streaming AI with reasoning trace (DeepSeek R1 / any <think> model) ───────
// Splits the stream at <think>…</think> boundaries:
//   onThink(text) — called for every thinking token (show as grey trace)
//   onChunk(text) — called for every answer token (show as normal response)
// Falls back gracefully: if localEndpoint is not set, routes to /api/ai.
export async function streamAIWithThinking(
  messages: { role: string; content: string }[],
  systemPrompt: string,
  onThink: (text: string) => void,
  onChunk: (text: string) => void,
  maxTokens = 3000,
): Promise<{ thinking: string; answer: string }> {
  const s = getSettings();

  let thinking = "";
  let answer = "";
  let inThink = false;
  let buf = "";

  // Incrementally parse <think>…</think> tags as chunks arrive
  const handleToken = (token: string) => {
    buf += token;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (!inThink) {
        const start = buf.indexOf("<think>");
        if (start === -1) {
          // No open tag visible — flush all but last 6 chars (partial tag guard)
          const safe = buf.length > 6 ? buf.slice(0, buf.length - 6) : "";
          if (safe) {
            answer += safe;
            onChunk(safe);
            buf = buf.slice(safe.length);
          }
          break;
        }
        // Flush any content before <think> as answer
        if (start > 0) {
          const pre = buf.slice(0, start);
          answer += pre;
          onChunk(pre);
        }
        buf = buf.slice(start + 7); // consume '<think>'
        inThink = true;
      } else {
        const end = buf.indexOf("</think>");
        if (end === -1) {
          // Still inside think block — flush all but last 8 chars
          const safe = buf.length > 8 ? buf.slice(0, buf.length - 8) : "";
          if (safe) {
            thinking += safe;
            onThink(safe);
            buf = buf.slice(safe.length);
          }
          break;
        }
        const chunk = buf.slice(0, end);
        if (chunk) {
          thinking += chunk;
          onThink(chunk);
        }
        buf = buf.slice(end + 8); // consume '</think>'
        inThink = false;
      }
    }
  };

  if (s.localEndpoint) {
    // Direct Ollama call — deepseek-r1:14b
    await streamRequest(
      s.localEndpoint,
      s.localApiKey ? { Authorization: `Bearer ${s.localApiKey}` } : {},
      {
        model: TASK_MODELS.reasoning,
        max_tokens: maxTokens,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      },
      handleToken,
      false,
    );
  } else {
    // Cloud fallback — Claude via /api/ai (no <think> blocks, onThink unused)
    await streamRequest(
      "/api/ai",
      {},
      {
        provider: "anthropic",
        model: "claude-opus-4-5",
        max_tokens: maxTokens,
        system: systemPrompt,
        messages,
        stream: true,
        task: "reasoning",
      },
      handleToken,
      true,
    );
  }

  // Flush leftover buffer
  if (buf) {
    if (inThink) {
      thinking += buf;
      onThink(buf);
    } else {
      answer += buf;
      onChunk(buf);
    }
  }

  return { thinking, answer };
}

// ── System prompt builder ─────────────────────────────────────────────────────
// liveContext is an optional pre-built block from lib/liveContext.ts.
// When provided, agents reason from live dashboard data instead of stale memory.
export function buildSystemPrompt(s: Settings, liveContext = ""): string {
  const name = s.userName || "Mario";
  const supportedTabs = getNavProductSurfaces()
    .map((surface) => surface.href.replace("/", ""))
    .join(", ");
  const surfaceSummary = summarizeSurfaceTiers().counts;
  const parts: string[] = [];
  if (s.userGoals) parts.push(`Goals: ${s.userGoals}`);
  if (s.userSkills) parts.push(`Building: ${s.userSkills}`);
  if (s.userLearning) parts.push(`Learning: ${s.userLearning}`);
  if (s.userContext) parts.push(`Context: ${s.userContext}`);
  const profile = parts.length
    ? `\n\n== ${name.toUpperCase()}'S PROFILE ==\n${parts.join("\n")}\n== END PROFILE ==`
    : "";
  return `You are Nexus AI — ${name}'s personal intelligence system, advisor, and developer agent. You are direct, sharp, and technical. You adapt to whatever ${name} needs: market analysis, research, trading signals, or coding and editing the Nexus Prime website itself.

${NEXUS_AGENT_NO_BILLING_RULE}

You have full access to the Nexus Prime project source code through these tools:
- list_project_files(directory) — explore the project structure
- read_project_file(path) — read any source file before editing
- patch_project_file(path, old_string, new_string) — make targeted edits to components, pages, or library files
- fetch_url('/api/project') — read CLAUDE.md, active tasks, and lessons learned

Project structure:
- app/ — Next.js routes. Supported GA tabs this cycle: ${supportedTabs}
- components/ — UI components grouped by tab
- lib/ — utilities (agent.ts, ai.ts, liveContext.ts, helpers.ts, etc.)
- store/useStore.ts — all global state (Zustand)
- public/ — static assets

Surface policy:
- Supported nav surface: 7 GA tabs only (HQ, COMMAND, INTEL, ALPHA, CYBER, RECON, VAULT)
- Additional routes exist in the repo as beta/internal surfaces and must not be treated as launch-critical by default
- Current counts: ${surfaceSummary.ga} ga / ${surfaceSummary.beta} beta / ${surfaceSummary.internal} internal

Rules for editing:
1. Always read_project_file before patching — never guess at the current content
2. Use list_project_files to find the right file first
3. Make small targeted patches — one logical change at a time
4. After patching, confirm what changed and what the user should see in the browser

Reasoning standard — operate like a senior analyst:
- When answering about markets, lead with the live numbers you can see right now
- When researching, search → read sources → synthesize with citations (Perplexity style)
- When coding, read the file first, understand context, then patch surgically
- Never give generic answers when live data is available — use it${profile}${liveContext}`;
}
