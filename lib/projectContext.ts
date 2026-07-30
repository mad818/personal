// ── lib/projectContext.ts ─────────────────────────────────────────────────────
// Builds a compact project-doctrine block injected into agent system prompts.
//
// Purpose: ORBIT stops generating raw fetch() when callAI() exists.
// ORBIT stops inlining price formatting when fmtPrice() exists.
// ~150 tokens overhead. Eliminates a whole class of repeated corrections.
//
// Client-safe: zero Node.js imports. Stack is hardcoded for this project —
// it never changes between runs, so file-reading adds no value.

export interface ProjectContext {
  stack: string[];
  patterns: { name: string; description: string }[];
  constraints: string[];
  generatedAt: number;
}

// ── Static Homefront doctrine ─────────────────────────────────────────────────
// This is intentionally hardcoded for now. When runtime detection is added,
// the UI copy and function naming can be tightened again.
const NEXUS_CONTEXT: ProjectContext = {
  stack: [
    "Next.js 14 (App Router)",
    "TypeScript strict",
    "React 18",
    "Zustand 4",
    "Tailwind CSS",
    "Three.js / R3F",
  ],
  patterns: [
    {
      name: "AI calls",
      description:
        "Always use callAI(prompt) or streamAI(...) from lib/ai.ts. NEVER call provider APIs directly.",
    },
    {
      name: "Formatting helpers",
      description:
        "fmtPrice(n) / fmtVol(n) / timeAgo(ts) from lib/helpers.ts. NEVER inline number formatting.",
    },
    {
      name: "Store access",
      description:
        "useStore(s => s.field) selector form. NEVER useStore().field (breaks reactivity).",
    },
    {
      name: "Async fetches",
      description:
        "All external fetches wrapped in try/catch with silent failure. Never let unhandled rejections crash the page.",
    },
    {
      name: "Fear & Greed",
      description:
        "Always signals.fg.value and signals.fg.label. NEVER read fg as a plain number.",
    },
  ],
  constraints: [
    "tsc --noEmit must pass before any task is marked done.",
    "No `any` casts without an explanatory comment.",
    "Named exports only — no default exports except page-level components.",
    "All shared types live in components/home/office/types.ts or store/useStore.ts.",
    "API keys stay server-side only — never import process.env in client components.",
  ],
  generatedAt: 0,
};

// ── detectProjectContextSync ──────────────────────────────────────────────────
// Synchronous, client-safe. Returns the current hardcoded Homefront doctrine.
export function detectProjectContextSync(): ProjectContext {
  return NEXUS_CONTEXT;
}

// ── detectProjectContext ──────────────────────────────────────────────────────
// Kept for API compatibility with any server-side callers. Returns same value.
export async function detectProjectContext(): Promise<ProjectContext> {
  return NEXUS_CONTEXT;
}

// ── buildStackContextBlock ────────────────────────────────────────────────────
// Synchronous, client-safe. Returns the formatted doctrine block for prompt injection.
export function buildStackContextBlock(): string {
  try {
    const ctx = NEXUS_CONTEXT;
    const stackLine = ctx.stack.join(" | ");
    const patternLines = ctx.patterns
      .map((p) => `    ${p.name}: ${p.description}`)
      .join("\n");
    const constraintLines = ctx.constraints.map((c) => `    • ${c}`).join("\n");

    return [
      "[NEXUS STACK CONTEXT]",
      `Stack: ${stackLine}`,
      "Critical patterns — always follow these in this codebase:",
      patternLines,
      "Constraints:",
      constraintLines,
      "[END STACK CONTEXT]",
    ].join("\n");
  } catch {
    return "";
  }
}
