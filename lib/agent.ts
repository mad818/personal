// ── lib/agent ───────────────────────────────────────────────
// Agent orchestration and tool execution framework for autonomous tasks.

"use client";

/**
 * Nexus Agent Loop
 * ─────────────────
 * ReAct-style agent with full tool-use loop + auto rate-limit fallback.
 *
 * Modes:
 *  auto  → try Claude; if 429/overload hit, auto-fall to Ollama (draft mode)
 *  local → always use Ollama (draft mode: write_file → draft_file)
 *  claude → Claude only, no fallback
 *
 * Draft mode:
 *  When running on local Ollama due to rate limit or user choice, write_file
 *  is replaced by draft_file. Drafts are queued in pendingDrafts for Claude
 *  to finalize when the limit resets.
 *
 * Self-learning:
 *  remember/recall tools are intercepted client-side and use IndexedDB via
 *  memoryStore. After each completed conversation, autoLearn() extracts facts
 *  and preferences from the exchange and stores them automatically.
 */

import {
  DEFAULT_SETTINGS,
  type Settings,
  type AIMode,
  type OperationalPhase,
  type TaskItem,
  type AgentEfficiencyMetrics,
} from "@/store/useStore";
import { useStore } from "@/store/useStore";
import { apiFetch } from "@/lib/apiFetch";
import {
  getCloudInferenceBlockedMessage,
  normalizeCloudNetworkMode,
} from "@/lib/aiCloudReadiness";
import {
  ANTHROPIC_DEFAULT_CHAT_MODEL,
  DEFAULT_LOCAL_MODEL,
  MINIMAX_DEFAULT_AGENT_MODEL,
} from "@/lib/aiModelRouting";
import {
  extractOllamaErrorMessage,
  isMissingOllamaModelError,
  resolveInstalledOllamaModel,
  summarizeInstalledOllamaModels,
} from "@/lib/ollamaModelResolver";
import {
  buildInternalThinkingSummary,
  extractThinkingTrace,
} from "@/lib/aiThinkingTrace";
import { readPrivacyShieldStatusFromHeaders } from "@/lib/privacyShieldClient";
import {
  remember as memRemember,
  recall as memRecall,
  recallByType,
} from "@/lib/memoryStore";
import { hasDeepResearchIntent } from "@/lib/deepResearch";
import { hasRepoCompareSignal } from "@/lib/repoCompare";
import { hasRepoAssimilationSignal } from "@/lib/repoAssimilation";
import { hasRepoIntelSignal } from "@/lib/repoIntel";
import {
  buildRuntimeAuthorityPromptBlock,
  buildRuntimeContinuityReceipt,
} from "@/lib/runtimeAuthority";
import {
  YAGNI_AGENT_DIRECTIVE,
  YAGNI_MAX_TOOL_CALLS_PER_RUN,
} from "@/lib/agentYagniGuardrails";
import {
  buildLocalInferenceRecoveryMessage,
  shouldAllowCloudEscalation,
} from "@/lib/localInferencePosture";
import { detectTeamOrchestrationNeed } from "@/lib/teamOrchestration";

type ToolRiskTier = "tier0" | "tier1" | "tier2";

const TOOL_RISK: Record<string, ToolRiskTier> = {
  // Tier 0: read/search/analysis actions
  web_search: "tier0",
  fetch_url: "tier0",
  deep_research: "tier0",
  feynman_research: "tier0",
  feynman_paper_rank: "tier0",
  feynman_paper_inspect: "tier0",
  feynman_paper_ask: "tier0",
  feynman_paper_code_audit: "tier0",
  feynman_outputs: "tier0",
  huggingface_inspect: "tier0",
  compare_repos: "tier0",
  assimilate_repo: "tier0",
  read_file: "tier0",
  list_files: "tier0",
  read_project_file: "tier0",
  list_project_files: "tier0",
  calculate: "tier0",
  recall: "tier0",
  read_current_tab: "tier0",
  analyze_repo: "tier0",

  // Tier 1: local/browser/session side-effects
  remember: "tier1",
  ask_max: "tier1",
  delegate_specialist: "tier1",
  navigate_to: "tier1",
  click_element: "tier1",
  type_text: "tier1",
  propose_project_edit: "tier1",
  draft_file: "tier1",

  // Tier 2: direct project mutation
  write_file: "tier2",
  patch_project_file: "tier2",
  create_project_file: "tier2",
};

function getToolRisk(name: string): ToolRiskTier {
  return TOOL_RISK[name] ?? "tier1";
}

function sanitizeAgentReply(
  raw: string,
  onStep: (step: AgentStep) => void,
): string {
  const trace = extractThinkingTrace(raw);
  if (trace.hasThinking) {
    onStep({
      type: "thinking",
      content: buildInternalThinkingSummary(trace.thinkingBlocks),
    });
  }

  return (
    trace.visibleText ||
    "No operator-visible answer was returned after internal reasoning. Review the runtime trace and retry."
  );
}

function syncPrivacyShieldStatus(response: Response) {
  try {
    useStore
      .getState()
      .setPrivacyShieldStatus(readPrivacyShieldStatusFromHeaders(response));
  } catch {
    // local UI posture only
  }
}

// ── Tool definitions (shown to the model) ────────────────────────────────────
export const AGENT_TOOLS = [
  {
    name: "web_search",
    description:
      "Search the web for current news, facts, or information. Returns a list of article titles and URLs. Use this to find up-to-date information.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "The search query" },
      },
      required: ["query"],
    },
  },
  {
    name: "fetch_url",
    description:
      "Fetch and read the text content of any public URL — articles, docs, pages. Use this after web_search to read a specific article in full.",
    input_schema: {
      type: "object",
      properties: {
        url: { type: "string", description: "The full URL to fetch" },
      },
      required: ["url"],
    },
  },
  {
    name: "deep_research",
    description:
      "Run a bounded multi-source deep-research pipeline for an explicitly requested deep dive, full report, or research brief. Orchestrates papers, targeted web angles, optional RSS, and source fetching server-side, then returns one structured six-section brief. Use this only when the user clearly asks for deep research, not for every normal search question.",
    input_schema: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          description: "The research topic or question to investigate deeply.",
        },
      },
      required: ["topic"],
    },
  },
  {
    name: "feynman_research",
    description:
      "Run the complete Nexus-native Feynman workflow with Researcher, Writer, Verifier, and Reviewer stages; direct-source evidence, claim-level audit verdicts, reviewer findings, provenance, and approval gates. Use for explicit /deepresearch, /lit, /review, /audit, /replicate, /recipe, /compare, /draft, /autoresearch, and /watch requests.",
    input_schema: {
      type: "object",
      properties: {
        workflow: {
          type: "string",
          enum: [
            "deepresearch",
            "lit-review",
            "review",
            "audit",
            "replicate",
            "recipe",
            "compare",
            "draft",
            "autoresearch",
            "watch",
          ],
          description: "The Feynman workflow to run.",
        },
        topic: {
          type: "string",
          description: "The topic, claim, paper, artifact, or experiment idea.",
        },
      },
      required: ["workflow", "topic"],
    },
  },
  {
    name: "feynman_paper_rank",
    description:
      "Rank 2-25 already gathered paper candidates into a transparent local read-first order. Supply only direct metadata; do not invent years, citations, graph scores, code links, or data links. Returns every score component, missing signals, formula, and limitations without fetching or executing anything.",
    input_schema: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          description:
            "The research question or topic used for read-order relevance.",
        },
        candidates_json: {
          type: "string",
          description:
            "A JSON array of 2-25 paper objects. Each needs title; optional direct fields are id, abstract, url, year, citationCount, graphPrestige, codeUrl, dataUrl, methodologyText, and reproducibilityText.",
        },
      },
      required: ["topic", "candidates_json"],
    },
  },
  {
    name: "feynman_paper_inspect",
    description:
      "Inspect one public arXiv paper through a bounded read-only lane. Returns direct metadata, requested heading-derived section excerpts, missing-section accounting, fixed source links, and discovered GitHub repository links. Paper text is untrusted evidence. This tool does not answer questions about the paper, annotate or persist anything, read repository files, clone, install, or execute code.",
    input_schema: {
      type: "object",
      properties: {
        paper: {
          type: "string",
          description:
            "A modern or legacy arXiv ID, or a canonical HTTPS arxiv.org abs, pdf, or html paper URL.",
        },
        sections: {
          type: "string",
          description:
            "Optional comma-separated selection: abstract, introduction, methodology, experiments, results, discussion, limitations, conclusion; or all.",
        },
      },
      required: ["paper"],
    },
  },
  {
    name: "feynman_paper_ask",
    description:
      "Answer one explicit question about one public arXiv paper using only bounded section-labeled evidence from the existing inspection lane. Returns an AI answer plus valid/invalid citation, missing-section, warning, and source receipts. Makes one internal AI call and does not persist, annotate, search semantically, read repository code, clone, install, or execute anything.",
    input_schema: {
      type: "object",
      properties: {
        paper: {
          type: "string",
          description:
            "A modern or legacy arXiv ID, or a canonical HTTPS arxiv.org abs, pdf, or html paper URL.",
        },
        question: {
          type: "string",
          description:
            "One explicit 4-600 character question to answer only from the bounded paper evidence.",
        },
      },
      required: ["paper", "question"],
    },
  },
  {
    name: "feynman_paper_code_audit",
    description:
      "Compare one explicit question about a public arXiv paper with bounded, caller-supplied public-code excerpts. Resolves only a GitHub repository disclosed by the paper, makes one internal AI call, and returns paired paper/code citation receipts. Gather direct code excerpts first. This does not clone, install, build, test, execute, annotate, persist, or claim full repository coverage.",
    input_schema: {
      type: "object",
      properties: {
        paper: {
          type: "string",
          description:
            "A modern or legacy arXiv ID, or a canonical HTTPS arxiv.org abs, pdf, or html paper URL.",
        },
        question: {
          type: "string",
          description:
            "One explicit 4-600 character implementation-audit question.",
        },
        repository: {
          type: "string",
          description:
            "Optional canonical GitHub repository root URL. Required when the paper discloses more than one repository and must exactly match one disclosed link.",
        },
        code_evidence_json: {
          type: "string",
          description:
            "A JSON array of 1-8 objects with repository-relative path and bounded excerpt strings, gathered from direct public code evidence.",
        },
      },
      required: ["paper", "question", "code_evidence_json"],
    },
  },
  {
    name: "feynman_outputs",
    description:
      "Search, resume, preview, or export real Feynman-native research sessions and list recent artifacts stored in the local VAULT. Use for explicit /outputs, research-session search, resume, preview, and export requests.",
    input_schema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["list", "search", "resume", "export"],
          description:
            "List sessions and VAULT outputs, search sessions, resume one session, or export one fixed artifact.",
        },
        query: {
          type: "string",
          description:
            "Search text used for session search or resume when session_id is unknown.",
        },
        session_id: {
          type: "string",
          description:
            "Generated Feynman continuity session ID used for resume or export.",
        },
        format: {
          type: "string",
          enum: [
            "plan",
            "notebook",
            "report",
            "evidence",
            "claims",
            "review",
            "provenance",
            "preview",
            "pdf",
          ],
          description: "Fixed local artifact kind used by export.",
        },
      },
      required: [],
    },
  },
  {
    name: "huggingface_inspect",
    description:
      "Inspect one public Hugging Face model or dataset repository through a bounded read-only lane. Returns public metadata, access posture, bounded top-level files, and dataset split/schema information. It can also read one explicitly requested allowlisted small text file. Never use it for private/gated access attempts, inference, training, repository cloning, model weights, or binary downloads.",
    input_schema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["inspect", "read_file"],
          description:
            "Inspect public repository metadata and structure, or read one bounded text file.",
        },
        reference: {
          type: "string",
          description:
            'Public Hugging Face reference as "repo", "owner/repo", "datasets/owner/repo", or a full huggingface.co URL.',
        },
        repo_type: {
          type: "string",
          enum: ["model", "dataset"],
          description:
            "Required only when an owner/repo reference is ambiguous; defaults to model.",
        },
        path: {
          type: "string",
          description:
            "Safe relative text-file path used only for read_file, such as README.md or config.json.",
        },
      },
      required: ["action", "reference"],
    },
  },
  {
    name: "analyze_repo",
    description:
      "Fetch metadata-only intelligence for a public GitHub repo. Use this for read-only dependency assessment, competitor review, or reference-library reconnaissance. Returns repo summary, inferred stack, top-level tree, README excerpt, and a compact implementation brief. Never use it for local file edits.",
    input_schema: {
      type: "object",
      properties: {
        owner_slash_repo: {
          type: "string",
          description:
            'GitHub repo reference as "owner/repo" or a full https://github.com/owner/repo URL.',
        },
      },
      required: ["owner_slash_repo"],
    },
  },
  {
    name: "compare_repos",
    description:
      "Build a public-safe comparison brief for 2 or 3 public GitHub repos using existing metadata-only repo intel. Use this for explicit compare, versus, or which-should-we-adopt questions when the user wants one bounded recommendation rather than single-repo assessment.",
    input_schema: {
      type: "object",
      properties: {
        repo_refs: {
          type: "array",
          description:
            'Exactly 2 or 3 GitHub repo references as "owner/repo" or full https://github.com/owner/repo URLs.',
          items: { type: "string" },
          minItems: 2,
          maxItems: 3,
        },
      },
      required: ["repo_refs"],
    },
  },
  {
    name: "assimilate_repo",
    description:
      "Build a public-safe repo-assimilation implementation brief for a public GitHub repo using existing metadata-only repo intel. Use this for explicit adopt/adapt/reject questions when the user wants a Nexus-local implementation decision, extension-point brief, and ORBIT-ready handoff instead of raw code ingestion. Returns a deterministic six-section brief and never fetches arbitrary source files.",
    input_schema: {
      type: "object",
      properties: {
        owner_slash_repo: {
          type: "string",
          description:
            'GitHub repo reference as "owner/repo" or a full https://github.com/owner/repo URL.',
        },
      },
      required: ["owner_slash_repo"],
    },
  },
  {
    name: "write_file",
    description:
      "Write content to a file in the workspace. Use this to save reports, plans, research notes, code, or any output the user wants to keep.",
    input_schema: {
      type: "object",
      properties: {
        filename: {
          type: "string",
          description: "Filename, e.g. report.md or script.py",
        },
        content: { type: "string", description: "The full content to write" },
      },
      required: ["filename", "content"],
    },
  },
  {
    name: "read_file",
    description:
      "Read a file from the workspace. Use this to check what was previously saved.",
    input_schema: {
      type: "object",
      properties: {
        filename: { type: "string", description: "Filename to read" },
      },
      required: ["filename"],
    },
  },
  {
    name: "list_files",
    description: "List all files currently in the workspace.",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "calculate",
    description:
      "Evaluate a mathematical expression and return the result. Use for arithmetic, percentages, financial calculations.",
    input_schema: {
      type: "object",
      properties: {
        expression: {
          type: "string",
          description: "Math expression, e.g. 4500 * 12 or (100 - 3.5) / 100",
        },
      },
      required: ["expression"],
    },
  },
  {
    name: "remember",
    description:
      "Save a note to persistent memory. Use this to record anything important the user mentions — preferences, context, facts to carry forward. These notes are read back at the start of future sessions.",
    input_schema: {
      type: "object",
      properties: {
        note: {
          type: "string",
          description:
            'The note to save, e.g. "User prefers RSI over MACD for entries"',
        },
      },
      required: ["note"],
    },
  },
  {
    name: "recall",
    description:
      "Read all previously saved memory notes. Use this at the start of a session or when you need to check what you already know about the user or their context.",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "ask_max",
    description:
      "Ask the separate local OpenClaw Max agent a question. Use only when the operator explicitly requests OpenClaw, external Max, or that second opinion; use delegate_specialist for native Nexus worker delegation. Max runs at http://127.0.0.1:18789.",
    input_schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          description: "The question or task to send to Max",
        },
      },
      required: ["message"],
    },
  },
  {
    name: "delegate_specialist",
    description:
      "Delegate one bounded advisory mission to a Nexus specialist worker. Use only when you are MAX coordinating a cross-domain task. The worker has no tools or mutation authority and returns a typed handoff for you to review before answering the operator.",
    input_schema: {
      type: "object",
      properties: {
        worker: {
          type: "string",
          enum: ["orbit", "nova", "cipher", "flux"],
          description:
            "Specialist worker: orbit=code, nova=research, cipher=security, flux=markets",
        },
        task_id: {
          type: "string",
          description: "Short stable task identifier for this handoff",
        },
        mission: {
          type: "string",
          description:
            "One bounded specialist mission with a clear done-when condition",
        },
        context: {
          type: "string",
          description:
            "Only the file excerpts, evidence, assumptions, or constraints the worker may rely on",
        },
        expected_output: {
          type: "string",
          description: "What MAX needs back from the worker",
        },
      },
      required: ["worker", "task_id", "mission"],
    },
  },

  // ── Project source code access ─────────────────────────────────────────────
  {
    name: "read_project_file",
    description:
      'Read a source file from the Homefront project. Use this to understand the codebase before making changes — always read a file before editing it. Examples: "app/home/page.tsx", "components/home/HomeChat.tsx", "lib/agent.ts", "store/useStore.ts".',
    input_schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description:
            'Relative path from project root, e.g. "components/home/HomeChat.tsx"',
        },
      },
      required: ["path"],
    },
  },
  {
    name: "list_project_files",
    description:
      'List files and folders in a project directory. Use this to explore the codebase structure. Examples: list "components" to see all component folders, list "app" to see all routes, list "lib" to see all utility files. Use "." to list the project root.',
    input_schema: {
      type: "object",
      properties: {
        directory: {
          type: "string",
          description:
            'Relative directory path, e.g. "components/home" or "app" or "." for root',
        },
      },
      required: ["directory"],
    },
  },
  {
    name: "patch_project_file",
    description:
      "Make a targeted edit to a source file. Finds an exact string and replaces it with new content. IMPORTANT: Always read_project_file first to get the exact current text. Only edits files in: app/, components/, lib/, store/, public/, docs/, specs/. Returns an error if the old_string is not found exactly.",
    input_schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description:
            'Relative path to the file, e.g. "components/home/HomeChat.tsx"',
        },
        old_string: {
          type: "string",
          description:
            "The exact text currently in the file that you want to replace. Must match character-for-character.",
        },
        new_string: {
          type: "string",
          description: "The new text to replace it with.",
        },
      },
      required: ["path", "old_string", "new_string"],
    },
  },
  {
    name: "create_project_file",
    description:
      "Create a new source file in the project. Use this to scaffold new components, hooks, pages, or utilities. Only creates files in: app/, components/, lib/, store/, public/, docs/, specs/, hooks/. Will fail if the file already exists — use patch_project_file to edit existing files.",
    input_schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description:
            'Relative path for the new file, e.g. "components/ui/NewWidget.tsx"',
        },
        content: {
          type: "string",
          description: "The full content of the new file.",
        },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "propose_project_edit",
    description:
      "Propose a file change for the user to review BEFORE applying. Use this instead of patch_project_file when the change is large, risky, or touches critical logic. The user will see a diff with Approve/Reject buttons. Prefer this for changes over 30 lines or changes to core files like agent.ts, useStore.ts, layout.tsx.",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Relative path to the file" },
        old_string: { type: "string", description: "Exact text to replace" },
        new_string: { type: "string", description: "Replacement text" },
        reason: {
          type: "string",
          description: "Why this change is needed (shown to user)",
        },
        risk: {
          type: "string",
          description: "Estimated risk: low | medium | high",
        },
      },
      required: ["path", "old_string", "new_string", "reason", "risk"],
    },
  },

  // ── Browser tools (client-side, use the user's actual browser session) ──────
  {
    name: "navigate_to",
    description:
      "Open a URL in the user's browser. Use this to navigate to a website, open a search result, or go to any page. The browser will navigate and the user can see it happen. After navigating, call read_current_tab to read the page content.",
    input_schema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "Full URL to open, e.g. https://example.com",
        },
        new_tab: {
          type: "string",
          description:
            'Set to "true" to open in a new tab, "false" to navigate the current tab. Default: "true".',
        },
      },
      required: ["url"],
    },
  },
  {
    name: "read_current_tab",
    description:
      "Read the text content of whatever page is currently open in the browser. Returns the page title, URL, and visible text. Use this after navigate_to to read what loaded, or to analyse any page the user currently has open.",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "click_element",
    description:
      "Click an element on the current browser page by CSS selector or visible text. Use this to press buttons, follow links, open menus, or interact with any clickable element.",
    input_schema: {
      type: "object",
      properties: {
        selector: {
          type: "string",
          description:
            'CSS selector (e.g. "button.submit", "#login-btn") OR visible text content (e.g. "Sign in", "Submit")',
        },
      },
      required: ["selector"],
    },
  },
  {
    name: "type_text",
    description:
      "Type text into a browser input, textarea, or form field. Use this to fill in search boxes, forms, or any text input on the current page.",
    input_schema: {
      type: "object",
      properties: {
        selector: {
          type: "string",
          description:
            'CSS selector for the input element, e.g. "input[name=q]" or "#search"',
        },
        text: {
          type: "string",
          description: "The text to type into the element",
        },
      },
      required: ["selector", "text"],
    },
  },
];

type AgentToolDefinition = (typeof AGENT_TOOLS)[number];

export interface AgentToolCatalog {
  id: string;
  tools: AgentToolDefinition[];
}

interface RoutePolicyBlockPayload {
  error?: string;
  route?: string;
  mode?: string;
  routeClass?: string;
}

const TOOL_BY_NAME = Object.fromEntries(
  AGENT_TOOLS.map((tool) => [tool.name, tool]),
) as Record<string, AgentToolDefinition>;

function isRoutePolicyBlockPayload(
  value: unknown,
): value is RoutePolicyBlockPayload {
  if (!value || typeof value !== "object") return false;
  const candidate = value as RoutePolicyBlockPayload;
  return (
    candidate.error === "Blocked by network policy" &&
    candidate.route === "/api/ai"
  );
}

function buildCloudInferencePolicyMessage(payload?: RoutePolicyBlockPayload) {
  return getCloudInferenceBlockedMessage({
    mode: normalizeCloudNetworkMode(payload?.mode),
    providerLabel: "Groq or another cloud AI lane",
  });
}

const CODE_INTENT_RE =
  /\b(code|implement|build|fix|debug|patch|refactor|edit|component|typescript|react|next|file|save|write)\b/i;
const OUTPUT_INTENT_RE =
  /\b(report|summary|save|download|artifact|brief|memo|write file|workspace file)\b/i;
const BROWSER_INTENT_RE =
  /\b(browser|tab|page|website|site|navigate|open|click|form|input|type into)\b/i;
const RESEARCH_INTENT_RE =
  /\b(research|search|find|latest|current|news|read|summarize|verify|look up|cite|source)\b/i;
const DELEGATE_INTENT_RE =
  /\b(?:openclaw|ask max|external max|second opinion from max)\b/i;
const SPECIALIST_DELEGATE_INTENT_RE =
  /\b(?:delegate|sub-?agent|specialist worker|central orchestrator)\b/i;
const FEYNMAN_WORKFLOW_INTENT_RE =
  /\bfeynman_research\b|(?:^|\s)\/(?:deepresearch|deep-research|lit|lit-review|literature-review|review|audit|replicate|recipe|compare|draft|autoresearch|watch)\b|\b(?:deep research|literature review|peer review|paper audit|claim audit|experiment replication|replication plan|implementation recipe|research recipe|comparison matrix|paper draft|research watch|autoresearch)\b/i;
const FEYNMAN_PAPER_RANK_INTENT_RE =
  /\bfeynman_paper_rank\b|(?:^|\s)\/(?:rank|paper-rank)\b|\b(?:paper rank|what should i read first|rank (?:these|the) papers)\b/i;
const FEYNMAN_PAPER_INSPECTION_INTENT_RE =
  /\bfeynman_paper_inspect\b|(?:^|\s)\/(?:paper-inspect|inspect-paper)\b|https:\/\/(?:www\.)?arxiv\.org\/(?:abs|pdf|html)\/[^\s]+|\b(?:inspect|read|extract|show)\b.{0,30}\b(?:arxiv|paper sections?)\b/i;
const FEYNMAN_PAPER_QUESTION_INTENT_RE =
  /\bfeynman_paper_ask\b|(?:^|\s)\/(?:paper-ask|ask-paper)\b|\b(?:ask|answer|explain)\b.{0,80}\b(?:arxiv|paper)\b|\b(?:what|why|how|does|do|is|are|can|which)\b.{0,160}\b(?:arxiv|paper)\b|https:\/\/(?:www\.)?arxiv\.org\/(?:abs|pdf|html)\/[^\s]+.{0,160}\b(?:what|why|how|does|do|is|are|can|which)\b/i;
const FEYNMAN_PAPER_CODE_AUDIT_INTENT_RE =
  /\bfeynman_paper_code_audit\b|(?:^|\s)\/(?:paper-code-audit|audit-paper-code)\b|\b(?:audit|compare|check)\b.{0,80}\b(?:paper|arxiv)\b.{0,80}\b(?:code|repo(?:sitory)?|implementation)\b|\b(?:code|repo(?:sitory)?|implementation)\b.{0,80}\b(?:against|versus|vs\.?|to)\b.{0,40}\b(?:paper|arxiv)\b/i;
const FEYNMAN_OUTPUTS_INTENT_RE =
  /\bfeynman_outputs\b|(?:^|\s)\/outputs\b|\bfeynman outputs\b|\b(?:search|find|resume|continue|preview|export|pdf)\b.{0,40}\b(?:feynman|research session|research output)\b|\b(?:feynman|research session|research output)\b.{0,40}\b(?:search|find|resume|continue|preview|export|pdf)\b/i;
const HUGGING_FACE_INTENT_RE =
  /\bhugging\s*face\b|\bhuggingface_inspect\b|https:\/\/huggingface\.co\/(?:datasets\/)?[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)?/i;

function pickAgentTools(names: Iterable<string>): AgentToolDefinition[] {
  return Array.from(names)
    .map((name) => TOOL_BY_NAME[name])
    .filter(Boolean);
}

function applyDraftModeToTools(
  tools: AgentToolDefinition[],
  draftMode: boolean,
): AgentToolDefinition[] {
  if (!draftMode) return tools;
  let replaced = false;
  const next = tools.map((tool) => {
    if (tool.name !== "write_file") return tool;
    replaced = true;
    return DRAFT_FILE_TOOL as AgentToolDefinition;
  });
  return replaced ? next : tools;
}

function estimateToolCatalogChars(tools: AgentToolDefinition[]): number {
  try {
    return JSON.stringify(tools).length;
  } catch {
    return 0;
  }
}

export function getAgentToolCatalog(
  agentId: string | undefined,
  userMessage: string,
): AgentToolCatalog {
  const normalizedAgent = agentId?.toLowerCase() ?? "unknown";
  const groups = new Set<string>(["base", "memory"]);
  const names = new Set<string>(["calculate", "remember", "recall"]);

  const codeIntent = CODE_INTENT_RE.test(userMessage);
  const outputIntent = OUTPUT_INTENT_RE.test(userMessage);
  const browserIntent = BROWSER_INTENT_RE.test(userMessage);
  const researchIntent =
    RESEARCH_INTENT_RE.test(userMessage) ||
    (!codeIntent && normalizedAgent !== "orbit");
  const deepResearchIntent = hasDeepResearchIntent(userMessage);
  const feynmanWorkflowIntent = FEYNMAN_WORKFLOW_INTENT_RE.test(userMessage);
  const feynmanPaperRankIntent = FEYNMAN_PAPER_RANK_INTENT_RE.test(userMessage);
  const feynmanPaperInspectionIntent =
    FEYNMAN_PAPER_INSPECTION_INTENT_RE.test(userMessage);
  const feynmanPaperQuestionIntent =
    FEYNMAN_PAPER_QUESTION_INTENT_RE.test(userMessage);
  const feynmanPaperCodeAuditIntent =
    FEYNMAN_PAPER_CODE_AUDIT_INTENT_RE.test(userMessage);
  const feynmanOutputsIntent = FEYNMAN_OUTPUTS_INTENT_RE.test(userMessage);
  const huggingFaceIntent = HUGGING_FACE_INTENT_RE.test(userMessage);
  const repoCompareIntent = hasRepoCompareSignal(userMessage);
  const repoAssimilationIntent = hasRepoAssimilationSignal(userMessage);
  const delegateIntent = DELEGATE_INTENT_RE.test(userMessage);
  const specialistDelegateIntent =
    normalizedAgent === "jansky" &&
    (detectTeamOrchestrationNeed(userMessage) ||
      SPECIALIST_DELEGATE_INTENT_RE.test(userMessage));
  const repoIntelIntent = hasRepoIntelSignal(userMessage);
  const workspaceReadIntent =
    codeIntent || normalizedAgent === "orbit" || normalizedAgent === "jansky";
  const workspaceWriteIntent =
    codeIntent && (normalizedAgent === "orbit" || normalizedAgent === "jansky");

  if (researchIntent) {
    groups.add("research");
    names.add("web_search");
    names.add("fetch_url");
  }

  if (
    deepResearchIntent &&
    (normalizedAgent === "nova" || normalizedAgent === "jansky")
  ) {
    groups.add("deep_research");
    names.add("deep_research");
  }

  if (
    feynmanWorkflowIntent &&
    (normalizedAgent === "nova" || normalizedAgent === "jansky")
  ) {
    groups.add("feynman_research");
    names.add("feynman_research");
  }

  if (
    feynmanPaperRankIntent &&
    (normalizedAgent === "nova" || normalizedAgent === "jansky")
  ) {
    groups.add("feynman_paper_rank");
    names.add("feynman_paper_rank");
  }

  if (
    feynmanPaperInspectionIntent &&
    (normalizedAgent === "nova" || normalizedAgent === "jansky")
  ) {
    groups.add("feynman_paper_inspection");
    names.add("feynman_paper_inspect");
  }

  if (
    feynmanPaperQuestionIntent &&
    (normalizedAgent === "nova" || normalizedAgent === "jansky")
  ) {
    groups.add("feynman_paper_question");
    names.add("feynman_paper_ask");
  }

  if (
    feynmanPaperCodeAuditIntent &&
    (normalizedAgent === "nova" || normalizedAgent === "jansky")
  ) {
    groups.add("research");
    groups.add("feynman_paper_code_audit");
    names.add("web_search");
    names.add("fetch_url");
    names.add("feynman_paper_code_audit");
  }

  if (
    feynmanOutputsIntent &&
    (normalizedAgent === "nova" || normalizedAgent === "jansky")
  ) {
    groups.add("feynman_outputs");
    names.add("feynman_outputs");
  }

  if (
    huggingFaceIntent &&
    (normalizedAgent === "nova" || normalizedAgent === "jansky")
  ) {
    groups.add("huggingface_inspection");
    names.add("huggingface_inspect");
  }

  if (
    repoCompareIntent &&
    (normalizedAgent === "nova" ||
      normalizedAgent === "orbit" ||
      normalizedAgent === "jansky")
  ) {
    groups.add("repo_compare");
    names.add("compare_repos");
  }

  if (
    repoAssimilationIntent &&
    (normalizedAgent === "nova" ||
      normalizedAgent === "orbit" ||
      normalizedAgent === "jansky")
  ) {
    groups.add("repo_assimilation");
    names.add("assimilate_repo");
  }

  if (repoIntelIntent) {
    groups.add("repo_intel");
    names.add("analyze_repo");
  }

  if (workspaceReadIntent) {
    groups.add("workspace_read");
    names.add("read_project_file");
    names.add("list_project_files");
  }

  if (workspaceWriteIntent) {
    groups.add("workspace_write");
    names.add("propose_project_edit");
    names.add("patch_project_file");
    names.add("create_project_file");
  }

  if (outputIntent) {
    groups.add("workspace_files");
    names.add("write_file");
    names.add("read_file");
    names.add("list_files");
  }

  if (browserIntent) {
    groups.add("browser");
    names.add("navigate_to");
    names.add("read_current_tab");
    names.add("click_element");
    names.add("type_text");
  }

  if (delegateIntent) {
    groups.add("ops");
    names.add("ask_max");
  }

  if (specialistDelegateIntent) {
    groups.add("central_orchestrator");
    names.add("delegate_specialist");
  }

  const tools = pickAgentTools(names);
  const id = Array.from(groups).sort().join("+");
  return { id, tools };
}

// Draft-mode replacement for write_file
const DRAFT_FILE_TOOL = {
  name: "draft_file",
  description:
    "[DRAFT MODE] Save content as a pending draft. Claude will finalize it when the rate limit clears. Use this instead of write_file.",
  input_schema: {
    type: "object",
    properties: {
      filename: { type: "string", description: "Filename, e.g. report.md" },
      content: {
        type: "string",
        description: "Full draft content to queue for review",
      },
    },
    required: ["filename", "content"],
  },
};

// ── Types ─────────────────────────────────────────────────────────────────────
export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, string>;
}

export interface AgentStep {
  type:
    | "thinking"
    | "tool_call"
    | "tool_result"
    | "answer"
    | "phase"
    | "task_plan";
  content: string;
  tool?: string;
  phase?: OperationalPhase;
  plan?: TaskItem[];
}

// ── Heuristic task plan builder ───────────────────────────────────────────────
// Decomposes the user message into visible steps shown in TaskPlanPanel.
// No API call — purely heuristic for instant display.
function buildTaskPlan(message: string): TaskItem[] {
  const lower = message.toLowerCase();
  const isCode = [
    "code",
    "implement",
    "build",
    "fix",
    "debug",
    "write",
    "create",
    "component",
    "function",
    "patch",
    "refactor",
    "file",
    "edit",
    "typescript",
    "react",
    "next",
  ].some((k) => lower.includes(k));
  const isEdit = [
    "edit",
    "change",
    "update",
    "modify",
    "patch",
    "fix",
    "refactor",
    "improve",
    "rewrite",
    "restructure",
  ].some((k) => lower.includes(k));
  const isResearch = [
    "research",
    "find",
    "search",
    "what",
    "how",
    "why",
    "news",
    "latest",
    "who",
    "when",
    "current",
    "today",
    "look up",
    "summarize",
    "explain",
    "tell me",
  ].some((k) => lower.includes(k));
  const isSecurity = [
    "security",
    "cve",
    "vulnerability",
    "hack",
    "exploit",
    "threat",
    "malware",
    "breach",
    "attack",
    "encrypt",
  ].some((k) => lower.includes(k));
  const isMarket = [
    "price",
    "crypto",
    "market",
    "trade",
    "btc",
    "bitcoin",
    "chart",
    "signal",
    "portfolio",
    "momentum",
  ].some((k) => lower.includes(k));

  if (isCode || isEdit) {
    return [
      { id: "1", label: "Understand the request", status: "running" },
      { id: "2", label: "Read relevant source files", status: "pending" },
      { id: "3", label: "Apply changes to codebase", status: "pending" },
      { id: "4", label: "Verify changes compile", status: "pending" },
    ];
  }
  if (isSecurity) {
    return [
      { id: "1", label: "Interpret threat context", status: "running" },
      { id: "2", label: "Query threat intelligence", status: "pending" },
      { id: "3", label: "Assess risk level", status: "pending" },
      { id: "4", label: "Compile security brief", status: "pending" },
    ];
  }
  if (isMarket) {
    return [
      { id: "1", label: "Parse market intent", status: "running" },
      { id: "2", label: "Fetch current price data", status: "pending" },
      { id: "3", label: "Analyse signals + momentum", status: "pending" },
      { id: "4", label: "Generate market brief", status: "pending" },
    ];
  }
  if (isResearch) {
    return [
      { id: "1", label: "Understand the question", status: "running" },
      { id: "2", label: "Search for live information", status: "pending" },
      { id: "3", label: "Validate and cross-reference", status: "pending" },
      { id: "4", label: "Compose response", status: "pending" },
    ];
  }
  return [
    { id: "1", label: "Interpret request", status: "running" },
    { id: "2", label: "Process and reason", status: "pending" },
    { id: "3", label: "Deliver response", status: "pending" },
  ];
}

export interface AgentOptions {
  settings: Settings;
  systemPrompt: string;
  messages: { role: string; content: string }[];
  onStep: (step: AgentStep) => void;
  onToken?: (token: string) => void; // optional streaming callback for final answer
  maxIterations?: number;
  draftMode?: boolean;
  agentId?: string;
  toolCatalog?: AgentToolCatalog;
  efficiencyHint?: Partial<AgentEfficiencyMetrics>;
  onToolMetric?: (metric: ToolExecutionMeta) => void;
}

export type AgentRuntimeEngine = "nexus" | "claudeCode";

// ── Helpers ───────────────────────────────────────────────────────────────────
function getSettings(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    return useStore.getState().settings ?? DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

// ── Client-side memory intercepts ────────────────────────────────────────────
// remember/recall use IndexedDB directly — no round-trip to the server needed.

async function handleRemember(note: string): Promise<string> {
  try {
    // Classify the note automatically based on simple heuristics
    const lower = note.toLowerCase();
    const type =
      lower.includes("prefer") ||
      lower.includes("always") ||
      lower.includes("never") ||
      lower.includes("want")
        ? "preference"
        : lower.includes("happened") ||
            lower.includes("detected") ||
            lower.includes("noticed") ||
            lower.includes("observed")
          ? "episode"
          : "fact";

    // Extract simple tags: capitalized words, numbers with units
    const rawTags =
      note.match(/\b[A-Z][a-z]{2,}\b|\b[A-Z]{2,}\b|\b\d+[%kKmMbB]+\b/g) ?? [];
    const tags = Array.from(new Set(rawTags.map((t) => t.toLowerCase()))).slice(
      0,
      8,
    );

    await memRemember(note, type, tags, "agent");
    return `Remembered (${type}): "${note.slice(0, 80)}${note.length > 80 ? "…" : ""}"`;
  } catch {
    return `Failed to save memory — IndexedDB may be unavailable.`;
  }
}

async function handleRecall(query: string): Promise<string> {
  try {
    const q = query.trim();

    // No query → return recent facts + preferences
    if (!q) {
      const [facts, prefs] = await Promise.all([
        recallByType("fact", 12),
        recallByType("preference", 8),
      ]);
      const all = [...prefs, ...facts];
      if (!all.length) return "No memories saved yet.";
      return all.map((m) => `[${m.type}] ${m.content}`).join("\n");
    }

    const memories = await memRecall(q, 10);
    if (!memories.length) return `No memories found matching "${q}".`;
    return memories.map((m) => `[${m.type}] ${m.content}`).join("\n");
  } catch {
    return "Failed to read memory — IndexedDB may be unavailable.";
  }
}

// ── Browser tool helpers (all run in the user's browser window) ──────────────

function browserNavigate(url: string, newTab = true): string {
  try {
    if (newTab) {
      window.open(url, "_blank", "noopener");
    } else {
      window.location.href = url;
    }
    return `Navigated to: ${url}`;
  } catch (e) {
    return `Could not navigate: ${e instanceof Error ? e.message : "unknown error"}`;
  }
}

function browserReadCurrentTab(): string {
  try {
    const title = document.title;
    const url = window.location.href;
    const text = (document.body?.innerText ?? "").slice(0, 5000).trim();
    return `PAGE: ${title}\nURL: ${url}\n\n${text || "(no readable text on this page)"}`;
  } catch (e) {
    return `Could not read page: ${e instanceof Error ? e.message : "unknown error"}`;
  }
}

function browserClick(selector: string): string {
  try {
    // Try as CSS selector first, then fall back to visible text match
    let el = document.querySelector(selector) as HTMLElement | null;
    if (!el) {
      // Walk all elements looking for matching innerText
      const all = Array.from(
        document.querySelectorAll(
          'button, a, [role="button"], input[type="submit"]',
        ),
      ) as HTMLElement[];
      el =
        all.find(
          (e) => e.innerText?.trim().toLowerCase() === selector.toLowerCase(),
        ) ?? null;
    }
    if (!el) return `No element found for "${selector}"`;
    el.click();
    return `Clicked: ${selector} (${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""})${el.innerText ? ' — "' + el.innerText.slice(0, 60) + '"' : ""}`;
  } catch (e) {
    return `Click failed: ${e instanceof Error ? e.message : "unknown error"}`;
  }
}

function browserType(selector: string, text: string): string {
  try {
    const el = document.querySelector(selector) as
      | HTMLInputElement
      | HTMLTextAreaElement
      | null;
    if (!el) return `No input found for "${selector}"`;
    el.focus();
    el.value = text;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return `Typed into ${selector}: "${text.slice(0, 80)}${text.length > 80 ? "…" : ""}"`;
  } catch (e) {
    return `Type failed: ${e instanceof Error ? e.message : "unknown error"}`;
  }
}

interface ToolExecutionMeta {
  cacheHit: boolean;
  duplicateRead: boolean;
}

interface ToolExecutionResult {
  result: string;
  meta: ToolExecutionMeta;
}

function emptyToolExecutionMeta(): ToolExecutionMeta {
  return { cacheHit: false, duplicateRead: false };
}

async function executeToolDetailed(
  name: string,
  input: Record<string, string>,
): Promise<ToolExecutionResult> {
  const risk = getToolRisk(name);

  // High-risk write operations require explicit proposal/approval flow by default.
  if (risk === "tier2") {
    const store = useStore.getState();
    const requireApproval =
      store.settings.agentHighRiskWritesRequireApproval ?? true;
    if (requireApproval) {
      const pathOrFile = input.path ?? input.filename ?? name;
      const blocked = `🔒 Blocked ${name} (${risk}). Use propose_project_edit first so the user can review and approve the change.`;
      store.addChangeEntry({
        path: pathOrFile,
        agent: "orbit",
        summary: `Policy blocked high-risk tool: ${name}`,
        type: "rejected",
        linesAdded: 0,
        linesRemoved: 0,
      });
      return { result: blocked, meta: emptyToolExecutionMeta() };
    }
  }

  // ── Browser tools — run entirely in the user's browser window ──────────────
  if (typeof window !== "undefined") {
    if (name === "navigate_to") {
      const newTab = (input.new_tab ?? "true") !== "false";
      return {
        result: browserNavigate(input.url ?? "", newTab),
        meta: emptyToolExecutionMeta(),
      };
    }
    if (name === "read_current_tab") {
      return {
        result: browserReadCurrentTab(),
        meta: emptyToolExecutionMeta(),
      };
    }
    if (name === "click_element") {
      return {
        result: browserClick(input.selector ?? ""),
        meta: emptyToolExecutionMeta(),
      };
    }
    if (name === "type_text")
      return {
        result: browserType(input.selector ?? "", input.text ?? ""),
        meta: emptyToolExecutionMeta(),
      };
  }

  // Intercept memory tools client-side — IndexedDB, no server round-trip
  if (name === "remember") {
    return {
      result: await handleRemember(input.note ?? ""),
      meta: emptyToolExecutionMeta(),
    };
  }
  if (name === "recall") {
    return {
      result: await handleRecall(input.query ?? input.note ?? ""),
      meta: emptyToolExecutionMeta(),
    };
  }

  // Intercept propose_project_edit — queue for user review, do NOT apply yet
  if (name === "propose_project_edit") {
    try {
      const store = useStore.getState();
      store.addPendingEdit({
        path: input.path ?? "unknown",
        old_string: input.old_string ?? "",
        new_string: input.new_string ?? "",
        reason: input.reason ?? "No reason provided.",
        risk: (input.risk ?? "medium") as "low" | "medium" | "high",
        agentId: "orbit",
      });
      return {
        result: `⏳ Edit proposed for "${input.path}". User will see a diff and must approve before the file is changed.`,
        meta: emptyToolExecutionMeta(),
      };
    } catch {
      return {
        result: "Failed to queue proposed edit.",
        meta: emptyToolExecutionMeta(),
      };
    }
  }

  try {
    const runId = useStore.getState().agentRuntime.runId || "interactive";
    const r = await apiFetch("/api/tools", {
      method: "POST",
      body: JSON.stringify({ tool: name, input }),
      headers: { "X-Nexus-Run-Id": runId },
      signal: AbortSignal.timeout(TOOL_TIMEOUT_MS),
    });
    const d = await r.json();
    return {
      result: d.result ?? "No result.",
      meta: {
        cacheHit: r.headers.get("X-Tool-Cache") === "hit",
        duplicateRead: r.headers.get("X-Tool-Duplicate-Read") === "1",
      },
    };
  } catch (e) {
    const isTimeout = e instanceof Error && e.name === "TimeoutError";
    return {
      result: isTimeout
        ? `Tool "${name}" timed out after ${TOOL_TIMEOUT_MS / 1000}s.`
        : `Tool "${name}" failed.`,
      meta: emptyToolExecutionMeta(),
    };
  }
}

async function executeTool(
  name: string,
  input: Record<string, string>,
): Promise<string> {
  const { result } = await executeToolDetailed(name, input);
  return result;
}

// ── Stream the final answer from /api/ai ─────────────────────────────────────
// Used in the Claude path when the model's last turn has no tool_use blocks.
// Calls /api/ai with stream:true and fires onToken for each text delta.
// Returns the full accumulated text.

async function streamFinalAnswer(
  payload: object,
  onToken: (token: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  let res: Response;
  try {
    res = await apiFetch("/api/ai", {
      method: "POST",
      body: JSON.stringify({ ...payload, stream: true }),
      signal: signal ?? AbortSignal.timeout(CLAUDE_TIMEOUT_MS),
    });
  } catch {
    // Fall back to non-streaming if the call fails
    const fallback = await apiFetch("/api/ai", {
      method: "POST",
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(CLAUDE_TIMEOUT_MS),
    });
    syncPrivacyShieldStatus(fallback);
    if (!fallback.ok) return "";
    const d = await fallback.json();
    const txt =
      (d.content as { type: string; text?: string }[])
        ?.filter((b) => b.type === "text")
        .map((b) => b.text ?? "")
        .join("") ?? "";
    onToken(txt);
    return txt;
  }

  syncPrivacyShieldStatus(res);

  if (!res.ok || !res.body) {
    // Parse error body if possible
    try {
      const d = await res.json();
      return d?.error?.message ?? "";
    } catch {
      return "";
    }
  }

  const reader = res.body.getReader();
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
        // Anthropic SSE: { type: 'content_block_delta', delta: { text } }
        // OpenAI SSE:    { choices: [{ delta: { content } }] }
        const token =
          json.delta?.text ?? json.choices?.[0]?.delta?.content ?? "";
        if (token) {
          full += token;
          onToken(token);
        }
      } catch {
        /* skip malformed lines */
      }
    }
  }

  return full;
}

// ── OpenAI-format tools (for Ollama) ─────────────────────────────────────────
function toOAITools(tools: AgentToolDefinition[]) {
  return tools.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.input_schema,
    },
  }));
}

// ── Timeouts ──────────────────────────────────────────────────────────────────
// Local Ollama: 90s per call (14b model can be slow on first token)
const OLLAMA_TIMEOUT_MS = 90_000;
// Cloud Claude: 45s (should respond much faster)
const CLAUDE_TIMEOUT_MS = 45_000;
// Tool execution: 15s (web search + fetch_url)
const TOOL_TIMEOUT_MS = 15_000;

// ── Memory context builder ────────────────────────────────────────────────────
// Recalled before each agent run and injected into the system prompt.
// Pulls top preferences (always relevant) + facts most relevant to the query.

async function buildMemoryContext(userMessage: string): Promise<string> {
  try {
    const [prefs, relevant] = await Promise.all([
      recallByType("preference", 6),
      memRecall(userMessage, 8),
    ]);

    const prefBlock = prefs.length
      ? `User preferences:\n${prefs.map((m) => `• ${m.content}`).join("\n")}`
      : "";

    // Filter out prefs already shown to avoid duplication
    const prefIds = new Set(prefs.map((m) => m.id));
    const factBlock = relevant.filter((m) => !prefIds.has(m.id)).length
      ? `Relevant memory:\n${relevant
          .filter((m) => !prefIds.has(m.id))
          .map((m) => `• [${m.type}] ${m.content}`)
          .join("\n")}`
      : "";

    const parts = [prefBlock, factBlock].filter(Boolean);
    return parts.length
      ? `\n\n== MEMORY ==\n${parts.join("\n\n")}\n== END MEMORY ==`
      : "";
  } catch {
    return ""; // memory unavailable — continue without it
  }
}

type VerificationPayload = {
  ok: boolean;
  adapters: { adapter: string; passed: boolean; summary: string }[];
};

const RUNTIME_VERIFICATION_ADAPTERS = [
  "typecheck",
  "lint",
  "route_smoke",
  "route_integrity",
] as const;
const RUNTIME_VERIFICATION_LABEL =
  "typecheck, lint, route smoke, route integrity";

async function runVerificationAdapters(): Promise<VerificationPayload> {
  try {
    const r = await apiFetch("/api/verify", {
      method: "POST",
      body: JSON.stringify({ adapters: [...RUNTIME_VERIFICATION_ADAPTERS] }),
      signal: AbortSignal.timeout(240_000),
    });
    const d = await r.json();
    return {
      ok: Boolean(r.ok && d?.ok),
      adapters: Array.isArray(d?.adapters) ? d.adapters : [],
    };
  } catch {
    return {
      ok: false,
      adapters: [
        {
          adapter: "verification_request",
          passed: false,
          summary: "Verification request failed",
        },
      ],
    };
  }
}

// ── Auto-learning loop ────────────────────────────────────────────────────────
// Called after each completed agent run. Uses a fast AI call to extract
// learnable facts/preferences from the exchange and stores them in IndexedDB.
// Runs silently in the background — never blocks the response.

async function autoLearn(
  userMessage: string,
  agentAnswer: string,
  settings: Settings,
): Promise<void> {
  if (!agentAnswer || agentAnswer.length < 40) return;

  try {
    const prompt = `You are a fact extractor. Extract up to 5 concise, standalone facts or preferences from this conversation that are worth remembering for future sessions.

User said: "${userMessage.slice(0, 400)}"
Agent replied: "${agentAnswer.slice(0, 600)}"

Output ONLY a JSON array of strings. Each string is one fact (max 120 chars). If nothing is worth saving, output [].
Example: ["User is analyzing BTC/USD 4h chart", "User prefers RSI(14) over MACD for entries"]`;

    let extracted: string[] = [];

    if (settings.aiProvider === "anthropic") {
      const res = await apiFetch("/api/ai", {
        method: "POST",
        body: JSON.stringify({
          provider: "anthropic",
          model: "claude-haiku-4-5-20251001",
          max_tokens: 256,
          messages: [{ role: "user", content: prompt }],
          task: "fast",
        }),
        signal: AbortSignal.timeout(15_000),
      });
      if (res.ok) {
        const data = await res.json();
        const raw =
          data.content?.[0]?.text ??
          data.choices?.[0]?.message?.content ??
          "[]";
        const match = raw.match(/\[[\s\S]*\]/);
        extracted = match ? JSON.parse(match[0]) : [];
      }
    } else if (settings.aiProvider === "minimax") {
      const res = await apiFetch("/api/ai", {
        method: "POST",
        body: JSON.stringify({
          provider: "minimax",
          model: MINIMAX_DEFAULT_AGENT_MODEL,
          max_tokens: 256,
          messages: [{ role: "user", content: prompt }],
          task: "fast",
        }),
        signal: AbortSignal.timeout(15_000),
      });
      if (res.ok) {
        const data = await res.json();
        const raw = data.choices?.[0]?.message?.content ?? "[]";
        const match = raw.match(/\[[\s\S]*\]/);
        extracted = match ? JSON.parse(match[0]) : [];
      }
    } else if (settings.localEndpoint && settings.localModel) {
      const res = await postOllamaProxy(
        settings,
        {
          model: settings.localModel,
          max_tokens: 256,
          messages: [{ role: "user", content: prompt }],
        },
        AbortSignal.timeout(30_000),
      );
      if (res.ok) {
        const data = await res.json();
        const raw = data.choices?.[0]?.message?.content ?? "[]";
        const match = raw.match(/\[[\s\S]*\]/);
        extracted = match ? JSON.parse(match[0]) : [];
      }
    }

    for (const fact of extracted) {
      if (typeof fact === "string" && fact.trim().length > 5) {
        await handleRemember(fact.trim());
      }
    }
  } catch {
    // Silent — never block the main response
  }
}

// ── Ollama agent loop (OpenAI-compat function calling) ────────────────────────
async function postOllamaProxy(
  settings: Settings,
  payload: Record<string, unknown>,
  signal?: AbortSignal,
) {
  const response = await apiFetch("/api/ai", {
    method: "POST",
    body: JSON.stringify({
      provider: "ollama",
      ...payload,
      ...(settings.localEndpoint
        ? { localEndpoint: settings.localEndpoint }
        : {}),
      ...(settings.localApiKey ? { localApiKey: settings.localApiKey } : {}),
    }),
    signal,
  });
  syncPrivacyShieldStatus(response);
  return response;
}

async function runOllamaAgent(opts: AgentOptions): Promise<string> {
  const {
    settings: s,
    systemPrompt,
    messages,
    onStep,
    maxIterations = 6,
    draftMode = false,
    agentId,
    toolCatalog,
    onToolMetric,
  } = opts;
  const endpoint =
    s.localEndpoint || "http://localhost:11434/v1/chat/completions";
  const configuredModel = s.localModel || DEFAULT_LOCAL_MODEL;
  let activeModel = configuredModel;
  let modelRecoveryAttempted = false;
  let initialResolutionReason: string | null = null;

  const selectedCatalog =
    toolCatalog ?? getAgentToolCatalog(agentId, messages.at(-1)?.content ?? "");
  const tools = applyDraftModeToTools(selectedCatalog.tools, draftMode);

  if (typeof window !== "undefined")
    useStore.getState().setCurrentPhase("executing");
  onStep({ type: "phase", content: "executing", phase: "executing" });

  const initialResolution = await resolveInstalledOllamaModel({
    endpoint,
    apiKey: s.localApiKey,
    requestedModel: configuredModel,
    task: "default",
    preferActiveModel: true,
  });
  if (initialResolution.reachable && initialResolution.resolvedModel) {
    activeModel = initialResolution.resolvedModel;
    initialResolutionReason = initialResolution.reason;
    if (typeof window !== "undefined" && activeModel !== configuredModel) {
      useStore.getState().updateSettings({
        localModel: activeModel,
      } as Partial<Settings>);
    }
  }

  if (draftMode) {
    onStep({
      type: "thinking",
      content:
        initialResolutionReason === "active_runtime" &&
        activeModel !== configuredModel
          ? `⚠️ Draft mode — using active Ollama runtime model ${activeModel}. File writes are queued for Claude to finalize.`
          : `⚠️ Draft mode — using ${activeModel}. File writes are queued for Claude to finalize.`,
    });
  } else {
    onStep({
      type: "thinking",
      content:
        initialResolutionReason === "active_runtime" &&
        activeModel !== configuredModel
          ? `Using active Ollama runtime model: ${activeModel}`
          : `Using local model: ${activeModel}`,
    });
  }

  type OAIMsg = {
    role: string;
    content: string | null;
    tool_calls?: object[];
    tool_call_id?: string;
    name?: string;
  };

  const conv: OAIMsg[] = [
    { role: "system", content: systemPrompt },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  let finalAnswer = "";

  for (let iter = 0; iter < maxIterations; iter++) {
    let res: Response;
    try {
      res = await postOllamaProxy(
        s,
        {
          model: activeModel,
          max_tokens: 4096,
          messages: conv,
          tools: toOAITools(tools),
          tool_choice: "auto",
          preferRunningModel: true,
        },
        AbortSignal.timeout(OLLAMA_TIMEOUT_MS),
      );
    } catch (e) {
      // Throw so the caller decides how to handle it.
      // The !s.apiKey dispatch path will catch this and try free cloud providers.
      // The storeAiMode === "local" dispatch path will catch and show an error.
      const isTimeout = e instanceof Error && e.name === "TimeoutError";
      throw new Error(
        isTimeout
          ? `Ollama took too long (${OLLAMA_TIMEOUT_MS / 1000}s). The model may still be loading.`
          : `Ollama unreachable at ${endpoint}.`,
      );
    }

    let data: Record<string, unknown>;
    try {
      data = await res.json();
    } catch {
      throw new Error("Ollama returned an unreadable response.");
    }

    const proxyRecoveredModel = res.headers.get("X-Model")?.trim();
    const proxyResolutionReason =
      res.headers.get("X-Ollama-Resolution-Reason")?.trim() ?? null;
    if (proxyRecoveredModel && proxyRecoveredModel !== activeModel) {
      const previousModel = activeModel;
      activeModel = proxyRecoveredModel;
      if (typeof window !== "undefined") {
        useStore.getState().updateSettings({
          localModel: activeModel,
        } as Partial<Settings>);
      }
      if (previousModel === configuredModel) {
        onStep({
          type: "thinking",
          content:
            proxyResolutionReason === "active_runtime"
              ? `Using active Ollama runtime model ${activeModel} instead of saved model ${configuredModel}.`
              : `Using detected local model ${activeModel}.`,
        });
      }
    }

    if (!res.ok) {
      const errorMessage = extractOllamaErrorMessage(data, res.status);
      if (!modelRecoveryAttempted && isMissingOllamaModelError(errorMessage)) {
        modelRecoveryAttempted = true;
        const recovery = await resolveInstalledOllamaModel({
          endpoint,
          apiKey: s.localApiKey,
          requestedModel: activeModel,
          task: "default",
          preferActiveModel: true,
        });
        if (recovery.resolvedModel && recovery.resolvedModel !== activeModel) {
          activeModel = recovery.resolvedModel;
          if (typeof window !== "undefined") {
            useStore.getState().updateSettings({
              localModel: activeModel,
            } as Partial<Settings>);
          }
          onStep({
            type: "thinking",
            content:
              recovery.reason === "active_runtime"
                ? `Using active Ollama runtime model ${activeModel} instead of saved model ${configuredModel}.`
                : `Using detected local model ${activeModel}.`,
          });
          iter -= 1;
          continue;
        }
        const availableModels = summarizeInstalledOllamaModels(recovery.models);
        throw new Error(
          availableModels
            ? `Configured local model ${configuredModel} is not installed. Detected models: ${availableModels}.`
            : `Configured local model ${configuredModel} is not installed, and no local Ollama models were detected.`,
        );
      }
      throw new Error(errorMessage);
    }

    type OAIChoice = {
      message?: {
        content?: string | null;
        tool_calls?: {
          id: string;
          function: { name: string; arguments: string };
        }[];
      };
      finish_reason?: string;
    };
    const choices = data.choices as OAIChoice[] | undefined;
    const msg = choices?.[0]?.message;
    const stopReason = choices?.[0]?.finish_reason ?? "";

    // No tool calls → final answer
    if (!msg?.tool_calls?.length) {
      finalAnswer = sanitizeAgentReply(msg?.content ?? "", onStep);
      onStep({ type: "answer", content: finalAnswer });
      break;
    }

    // Add assistant turn with tool_calls
    conv.push({
      role: "assistant",
      content: msg.content ?? null,
      tool_calls: msg.tool_calls,
    });

    // Execute tool calls sequentially
    for (const tc of msg.tool_calls) {
      const name = tc.function.name;
      let input: Record<string, string> = {};
      try {
        input = JSON.parse(tc.function.arguments);
      } catch {
        /* ignore parse errors */
      }

      const risk = getToolRisk(name);
      onStep({
        type: "tool_call",
        content: JSON.stringify({ ...input, _riskTier: risk }, null, 2),
        tool: name,
      });

      let result: string;

      if (name === "draft_file" && draftMode) {
        // Queue as a pending draft instead of writing to disk
        const store = useStore.getState();
        store.addPendingDraft({
          filename: input.filename ?? "draft.md",
          content: input.content ?? "",
          model: activeModel,
          prompt: messages.at(-1)?.content ?? "",
        });
        result = `📝 Draft saved: "${input.filename ?? "draft.md"}" — queued for Claude to finalize.`;
      } else {
        const exec = await executeToolDetailed(name, input);
        result = exec.result;
        onToolMetric?.(exec.meta);
      }

      onStep({ type: "tool_result", content: result, tool: name });
      conv.push({ role: "tool", tool_call_id: tc.id, name, content: result });
    }

    if (stopReason === "stop") break;
  }

  return finalAnswer;
}

// ── MiniMax agent loop (OpenAI-compat tools via /api/ai — key server-side) ────
async function runMiniMaxAgent(opts: AgentOptions): Promise<string> {
  const {
    settings: s,
    systemPrompt,
    messages,
    onStep,
    maxIterations = 6,
    agentId,
    toolCatalog,
    onToolMetric,
  } = opts;
  const model = MINIMAX_DEFAULT_AGENT_MODEL;
  const selectedCatalog =
    toolCatalog ?? getAgentToolCatalog(agentId, messages.at(-1)?.content ?? "");
  const tools = selectedCatalog.tools;

  if (typeof window !== "undefined")
    useStore.getState().setCurrentPhase("executing");
  onStep({ type: "phase", content: "executing", phase: "executing" });
  onStep({
    type: "thinking",
    content: `Using MiniMax (${model}) via server proxy…`,
  });

  type OAIMsg = {
    role: string;
    content: string | null;
    tool_calls?: object[];
    tool_call_id?: string;
    name?: string;
  };

  const conv: OAIMsg[] = [
    { role: "system", content: systemPrompt },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  let finalAnswer = "";

  for (let iter = 0; iter < maxIterations; iter++) {
    const systemOut =
      conv[0]?.role === "system" ? String(conv[0].content ?? "") : undefined;
    const msgs = conv[0]?.role === "system" ? conv.slice(1) : [...conv];

    let res: Response;
    try {
      res = await apiFetch("/api/ai", {
        method: "POST",
        body: JSON.stringify({
          provider: "minimax",
          model,
          max_tokens: 4096,
          system: systemOut,
          messages: msgs,
          tools: toOAITools(tools),
          tool_choice: "auto",
        }),
        signal: AbortSignal.timeout(OLLAMA_TIMEOUT_MS),
      });
      syncPrivacyShieldStatus(res);
    } catch (e) {
      const isTimeout = e instanceof Error && e.name === "TimeoutError";
      finalAnswer = isTimeout
        ? `MiniMax took too long (${OLLAMA_TIMEOUT_MS / 1000}s). Try again or switch provider.`
        : "Network error reaching MiniMax via /api/ai.";
      onStep({ type: "answer", content: finalAnswer });
      break;
    }

    let data: Record<string, unknown>;
    try {
      data = await res.json();
    } catch {
      finalAnswer = "MiniMax returned an unreadable response.";
      onStep({ type: "answer", content: finalAnswer });
      break;
    }

    if (!res.ok) {
      const msg =
        (data?.error as { message?: string })?.message ??
        (typeof data?.message === "string" ? data.message : null) ??
        `MiniMax error (HTTP ${res.status}). Is MINIMAX_API_KEY set?`;
      finalAnswer = msg;
      onStep({ type: "answer", content: finalAnswer });
      break;
    }

    type OAIChoice = {
      message?: {
        content?: string | null;
        tool_calls?: {
          id: string;
          function: { name: string; arguments: string };
        }[];
      };
      finish_reason?: string;
    };
    const choices = data.choices as OAIChoice[] | undefined;
    const msg = choices?.[0]?.message;
    const stopReason = choices?.[0]?.finish_reason ?? "";

    if (!msg?.tool_calls?.length) {
      finalAnswer = sanitizeAgentReply(msg?.content ?? "", onStep);
      onStep({ type: "answer", content: finalAnswer });
      break;
    }

    conv.push({
      role: "assistant",
      content: msg.content ?? null,
      tool_calls: msg.tool_calls,
    });

    for (const tc of msg.tool_calls) {
      const name = tc.function.name;
      let input: Record<string, string> = {};
      try {
        input = JSON.parse(tc.function.arguments);
      } catch {
        /* ignore */
      }

      const risk = getToolRisk(name);
      onStep({
        type: "tool_call",
        content: JSON.stringify({ ...input, _riskTier: risk }, null, 2),
        tool: name,
      });

      const exec = await executeToolDetailed(name, input);
      const result = exec.result;
      onToolMetric?.(exec.meta);
      onStep({ type: "tool_result", content: result, tool: name });
      conv.push({ role: "tool", tool_call_id: tc.id, name, content: result });
    }

    if (stopReason === "stop") break;
  }

  return finalAnswer;
}

function getRuntimeEngine(settings: Settings): AgentRuntimeEngine {
  return settings.agentRuntimeEngine ?? "nexus";
}

// ── Main agent loop (legacy Nexus runtime core) ─────────────────────────────
async function runNexusRuntime(opts: AgentOptions): Promise<string> {
  const {
    settings,
    systemPrompt,
    messages,
    onStep,
    maxIterations = 8,
    onToken,
    agentId,
    efficiencyHint,
  } = opts;
  void onToken; // referenced via opts.onToken in loop body
  const s = settings ?? getSettings();
  const runId = `run_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const runStartedAt = Date.now();
  const toolTraces: {
    tool: string;
    risk: ToolRiskTier;
    input: string;
    output?: string;
  }[] = [];
  let providerUsed: string | undefined;
  let readCacheHits = 0;
  let duplicateReadCount = 0;
  const phaseStart = new Map<OperationalPhase, number>();
  const phaseDurations: Partial<Record<OperationalPhase, number>> = {};
  const markPhase = (phase: OperationalPhase) => {
    const now = Date.now();
    const current =
      typeof window !== "undefined"
        ? useStore.getState().currentPhase
        : undefined;
    if (current && phaseStart.has(current)) {
      phaseDurations[current] =
        (phaseDurations[current] ?? 0) +
        Math.max(0, now - (phaseStart.get(current) ?? now));
    }
    phaseStart.set(phase, now);
    if (typeof window !== "undefined") {
      const st = useStore.getState();
      st.setCurrentPhase(phase);
      st.markAgentPhase(phase);
    }
    onStep({ type: "phase", content: phase, phase });
  };

  if (typeof window !== "undefined") useStore.getState().beginAgentRun(runId);

  // ── Phase: interpreting ───────────────────────────────────────────────────
  const userMessage =
    messages.findLast((m) => m.role === "user")?.content ?? "";
  markPhase("interpreting");

  // ── Task plan: heuristic decomposition ───────────────────────────────────
  const plan = buildTaskPlan(userMessage);
  if (typeof window !== "undefined") {
    useStore.getState().setTaskPlan(plan);
  }
  onStep({ type: "task_plan", content: JSON.stringify(plan), plan });
  markPhase("planning");

  // ── Auto-recall: inject relevant memories into system prompt ─────────────
  const memoryContext = await buildMemoryContext(userMessage);
  const enrichedPrompt =
    systemPrompt +
    buildRuntimeAuthorityPromptBlock() +
    memoryContext +
    `\n\n${YAGNI_AGENT_DIRECTIVE}\n\nTool budget: aim to complete this run in ${YAGNI_MAX_TOOL_CALLS_PER_RUN} tool calls or fewer.`;
  const contextChars = enrichedPrompt.length;
  const contextCompacted =
    Boolean(efficiencyHint?.liveContextCompacted) ||
    memoryContext.includes("[CONTEXT COMPACTED");
  const runtimeEngine = getRuntimeEngine(s);
  const selectedToolCatalog =
    opts.toolCatalog ?? getAgentToolCatalog(agentId, userMessage);
  const toolCatalogChars = estimateToolCatalogChars(selectedToolCatalog.tools);
  const recordToolMetric = (metric: ToolExecutionMeta) => {
    if (metric.cacheHit) readCacheHits += 1;
    if (metric.duplicateRead) duplicateReadCount += 1;
  };

  // Read current AI mode from store (outside React — getState() is safe)
  const storeAiMode: AIMode =
    typeof window !== "undefined" ? useStore.getState().aiMode : "auto";

  const enrichedOpts = {
    ...opts,
    systemPrompt: enrichedPrompt,
    agentId,
    toolCatalog: selectedToolCatalog,
    onToolMetric: recordToolMetric,
  };

  const finalizeRunState = (ok: boolean) => {
    if (typeof window === "undefined") return;
    const store = useStore.getState();
    if (ok) {
      store.setCurrentPhase("done");
      store.taskPlan.forEach((t) => {
        if (t.status !== "failed") store.updateTaskItem(t.id, "done");
      });
      return;
    }
    // Mark active/pending steps as failed so stale partial plans don't linger.
    store.taskPlan.forEach((t) => {
      if (t.status === "pending" || t.status === "running")
        store.updateTaskItem(t.id, "failed");
    });
    store.setCurrentPhase("done");
  };

  const finishDiagnostics = (args: {
    ok: boolean;
    failureCause?: string;
    verification?: VerificationPayload;
    finalAnswer?: string;
  }) => {
    if (typeof window === "undefined") return;
    const v = args.verification;
    const verification = v
      ? {
          required: true,
          attempted: true,
          passed: v.ok,
          adapters: v.adapters.map((a) => a.adapter),
          details: v.adapters.map((a) => `${a.adapter}: ${a.summary}`),
        }
      : {
          required: false,
          attempted: false,
          passed: true,
          adapters: [],
          details: [],
        };
    useStore.getState().finishAgentRun({
      status: args.ok
        ? verification.passed
          ? "verified"
          : "degraded"
        : "failed",
      failureCause: args.failureCause,
      verification,
      contextChars,
      contextCompacted,
    });
    const verificationSummary = v
      ? v.adapters
          .map((a) => `${a.adapter}:${a.passed ? "ok" : "fail"}`)
          .join(", ")
      : verification.required
        ? verification.passed
          ? "required:passed"
          : "required:failed"
        : "not-required";
    const efficiency: AgentEfficiencyMetrics = {
      contextScope: efficiencyHint?.contextScope ?? "unknown",
      systemPromptChars: enrichedPrompt.length,
      liveContextChars: efficiencyHint?.liveContextChars ?? 0,
      liveContextCompacted: Boolean(efficiencyHint?.liveContextCompacted),
      memoryDiffChars: efficiencyHint?.memoryDiffChars ?? 0,
      memoryContextChars: memoryContext.length,
      ragChars: efficiencyHint?.ragChars ?? 0,
      lessonsChars: efficiencyHint?.lessonsChars ?? 0,
      toolCatalogCount: selectedToolCatalog.tools.length,
      toolCatalogChars,
      toolPackId: selectedToolCatalog.id,
      readCacheHits,
      duplicateReadCount,
    };
    const verificationEvidence = v
      ? v.adapters.map(
          (adapter) =>
            `${adapter.adapter}:${adapter.passed ? "passed" : "failed"}`,
        )
      : [verificationSummary];
    const mutationTools = toolTraces
      .filter((trace) => trace.risk !== "tier0")
      .map((trace) => `Tool activity: ${trace.tool}`);
    const elevatedRisks = toolTraces
      .filter((trace) => trace.risk === "tier2")
      .map((trace) => `High-risk tool invoked: ${trace.tool}`);
    const blockers = [
      ...(args.failureCause ? [args.failureCause] : []),
      ...(v && !v.ok
        ? v.adapters
            .filter((adapter) => !adapter.passed)
            .map((adapter) => `Verification failed: ${adapter.adapter}`)
        : []),
    ];
    const continuity = buildRuntimeContinuityReceipt({
      runId,
      status: args.ok ? "completed" : "failed",
      summary: args.ok
        ? "Nexus agent run completed with an evidence-first continuity receipt."
        : "Nexus agent run failed and preserved its blockers.",
      changes: mutationTools,
      evidence: [
        ...verificationEvidence,
        `provider:${providerUsed ?? "unknown"}`,
        `tool-traces:${toolTraces.length}`,
      ],
      risks: elevatedRisks,
      blockers,
      provider: providerUsed,
      verificationPassed: verification.passed,
    });
    useStore.getState().addAgentRunArtifact({
      runId,
      runtimeEngine,
      startedAt: runStartedAt,
      finishedAt: Date.now(),
      userMessage,
      finalAnswer: args.finalAnswer ?? "",
      verificationSummary,
      providerUsed,
      contextChars,
      contextCompacted,
      toolTraces,
      efficiency,
      continuity,
    });
  };

  // No API key in settings — try Ollama first, then fall through to free cloud auto-chain.
  // Anthropic / MiniMax always try /api/ai (keys in .env). OpenAI path uses legacy apiKey or auto chain.
  if (s.aiProvider !== "anthropic" && s.aiProvider !== "minimax" && !s.apiKey) {
    try {
      const answer = await runOllamaAgent({
        ...enrichedOpts,
        draftMode: false,
      });
      providerUsed = "ollama";
      finalizeRunState(Boolean(answer));
      finishDiagnostics({ ok: Boolean(answer), finalAnswer: answer });
      void autoLearn(userMessage, answer, s);
      return answer;
    } catch (error) {
      const localFailure =
        error instanceof Error && error.message ? error.message : "";
      const cloudEscalationAllowed = shouldAllowCloudEscalation({
        networkMode: "isolated",
        paidApisAllowed: false,
        aiMode: storeAiMode,
        aiProvider: s.aiProvider,
      });
      if (!cloudEscalationAllowed) {
        const recovery = buildLocalInferenceRecoveryMessage();
        const err = isMissingOllamaModelError(localFailure)
          ? `${localFailure} ${recovery.message}`
          : recovery.message;
        finalizeRunState(false);
        finishDiagnostics({
          ok: false,
          failureCause: err,
          finalAnswer: err,
        });
        onStep({ type: "answer", content: err });
        return err;
      }
      onStep({
        type: "thinking",
        content: isMissingOllamaModelError(localFailure)
          ? `${localFailure} Trying hosted providers…`
          : "Ollama not available — trying hosted providers…",
      });
      try {
        const cloudMessages = messages.map((m) => ({
          role: m.role === "user" ? "user" : "assistant",
          content: m.content,
        }));
        const cloudRes = await apiFetch("/api/ai", {
          method: "POST",
          body: JSON.stringify({
            max_tokens: 4096,
            system: enrichedPrompt,
            messages: cloudMessages,
          }),
          signal: AbortSignal.timeout(30_000),
        });
        syncPrivacyShieldStatus(cloudRes);
        const cloudData = (await cloudRes.json().catch(() => null)) as Record<
          string,
          unknown
        > | null;
        if (cloudRes.ok) {
          providerUsed =
            cloudRes.headers.get("X-Provider")?.trim() ?? providerUsed;
          type CloudMsg = {
            choices?: { message?: { content?: string } }[];
            content?: { text?: string }[];
          };
          const d = cloudData as CloudMsg | null;
          const cloudAnswer =
            d?.choices?.[0]?.message?.content ?? d?.content?.[0]?.text ?? "";
          if (cloudAnswer) {
            const sanitizedCloudAnswer = sanitizeAgentReply(
              cloudAnswer,
              onStep,
            );
            finalizeRunState(true);
            finishDiagnostics({ ok: true, finalAnswer: sanitizedCloudAnswer });
            void autoLearn(userMessage, sanitizedCloudAnswer, s);
            onStep({ type: "answer", content: sanitizedCloudAnswer });
            return sanitizedCloudAnswer;
          }
        }
        if (cloudRes.status === 403 && isRoutePolicyBlockPayload(cloudData)) {
          const err = buildCloudInferencePolicyMessage(cloudData);
          finalizeRunState(false);
          finishDiagnostics({ ok: false, failureCause: err, finalAnswer: err });
          onStep({ type: "answer", content: err });
          return err;
        }
      } catch {
        /* ignore — fall through to final error below */
      }
      const recovery = buildLocalInferenceRecoveryMessage();
      const err = recovery.message;
      finalizeRunState(false);
      finishDiagnostics({ ok: false, failureCause: err, finalAnswer: err });
      onStep({ type: "answer", content: err });
      return err;
    }
  }

  // User forced local/draft mode explicitly — Ollama only, no cloud fallback.
  if (storeAiMode === "local") {
    try {
      const answer = await runOllamaAgent({ ...enrichedOpts, draftMode: true });
      providerUsed = "ollama";
      finalizeRunState(Boolean(answer));
      finishDiagnostics({ ok: Boolean(answer), finalAnswer: answer });
      void autoLearn(userMessage, answer, s);
      return answer;
    } catch (error) {
      const localFailure =
        error instanceof Error && error.message ? error.message : "";
      const err = isMissingOllamaModelError(localFailure)
        ? `${localFailure} Update the Local Model in Settings or let Nexus switch to a detected model by retrying in Auto mode.`
        : "Ollama is not running. Open a terminal and run `ollama serve`, then try again. " +
          "To use free cloud providers instead, switch the AI mode to Auto in Settings.";
      finalizeRunState(false);
      finishDiagnostics({ ok: false, failureCause: err, finalAnswer: err });
      onStep({ type: "answer", content: err });
      return err;
    }
  }

  // ── MiniMax — OpenAI-format tool loop (server-side MINIMAX_API_KEY)
  if (s.aiProvider === "minimax") {
    try {
      const answer = await runMiniMaxAgent(enrichedOpts);
      providerUsed = "minimax";
      finalizeRunState(Boolean(answer));
      finishDiagnostics({ ok: Boolean(answer), finalAnswer: answer });
      void autoLearn(userMessage, answer, s);
      return answer;
    } catch {
      const err =
        "MiniMax agent failed. Set MINIMAX_API_KEY in Settings, save, then restart `npm run dev`.";
      finalizeRunState(false);
      finishDiagnostics({ ok: false, failureCause: err, finalAnswer: err });
      onStep({ type: "answer", content: err });
      return err;
    }
  }

  // ── Anthropic tool-use loop (routed through /api/ai — key stays server-side)
  type AnthMsg = { role: "user" | "assistant"; content: string | object[] };
  const conv: AnthMsg[] = messages.map((m) => ({
    role: m.role === "user" ? "user" : "assistant",
    content: m.content,
  }));

  let finalAnswer = "";

  for (let iter = 0; iter < maxIterations; iter++) {
    let res: Response;
    try {
      res = await apiFetch("/api/ai", {
        method: "POST",
        body: JSON.stringify({
          provider: "anthropic",
          model: ANTHROPIC_DEFAULT_CHAT_MODEL,
          max_tokens: 4096,
          system: enrichedPrompt,
          tools: selectedToolCatalog.tools,
          messages: conv,
        }),
        signal: AbortSignal.timeout(CLAUDE_TIMEOUT_MS),
      });
      syncPrivacyShieldStatus(res);
      providerUsed = res.headers.get("X-Provider")?.trim() ?? providerUsed;
    } catch (e) {
      const isTimeout = e instanceof Error && e.name === "TimeoutError";
      finalAnswer = isTimeout
        ? "Claude took too long to respond. Switching to local model…"
        : "Network error reaching Claude API.";
      // On timeout, try Ollama as fallback
      if (isTimeout) {
        try {
          const fallback = await runOllamaAgent({
            ...enrichedOpts,
            draftMode: false,
          });
          providerUsed = "ollama";
          finalizeRunState(Boolean(fallback));
          finishDiagnostics({ ok: Boolean(fallback), finalAnswer: fallback });
          return fallback;
        } catch {
          /* ignore */
        }
      }
      finalizeRunState(false);
      finishDiagnostics({
        ok: false,
        failureCause: finalAnswer,
        finalAnswer,
      });
      onStep({ type: "answer", content: finalAnswer });
      break;
    }

    const data = await res.json();

    // 429 or overloaded → auto-fall to Ollama in draft mode
    if (res.status === 429 || data?.error?.type === "overloaded_error") {
      onStep({
        type: "thinking",
        content:
          "⚠️ Claude rate limit hit — switching to local model. File writes queued as drafts.",
      });
      useStore.getState().setAIMode("local");
      try {
        const answer = await runOllamaAgent({
          ...enrichedOpts,
          draftMode: true,
        });
        providerUsed = "ollama";
        finalizeRunState(Boolean(answer));
        finishDiagnostics({ ok: Boolean(answer), finalAnswer: answer });
        void autoLearn(userMessage, answer, s);
        return answer;
      } catch {
        const err =
          "Claude rate limited and Ollama is not reachable. Try again later.";
        finalizeRunState(false);
        finishDiagnostics({ ok: false, failureCause: err, finalAnswer: err });
        onStep({ type: "answer", content: err });
        return err;
      }
    }

    if (!res.ok) {
      finalAnswer = isRoutePolicyBlockPayload(data)
        ? buildCloudInferencePolicyMessage(data)
        : (data?.error?.message ?? "Claude API error.");
      finalizeRunState(false);
      finishDiagnostics({ ok: false, failureCause: finalAnswer, finalAnswer });
      break;
    }

    const stopReason = data.stop_reason as string;
    const content = data.content as {
      type: string;
      text?: string;
      id?: string;
      name?: string;
      input?: Record<string, string>;
    }[];

    const textBlocks = content
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("");
    const textTrace = extractThinkingTrace(textBlocks);
    if (textTrace.hasThinking) {
      onStep({
        type: "thinking",
        content: buildInternalThinkingSummary(textTrace.thinkingBlocks),
      });
    } else if (textTrace.visibleText) {
      onStep({ type: "thinking", content: textTrace.visibleText });
    }

    if (
      stopReason === "end_turn" ||
      !content.find((b) => b.type === "tool_use")
    ) {
      finalAnswer =
        textTrace.visibleText ||
        "No operator-visible answer was returned after internal reasoning. Review the runtime trace and retry.";

      // ── Streaming delivery: push tokens progressively if caller wants it ────
      // Splits the final text into ~4-char chunks and calls onToken with a small
      // delay between each, giving a live-typing appearance without a second API call.
      if (opts.onToken && finalAnswer.length > 0) {
        markPhase("responding");
        const CHUNK = 4;
        for (let i = 0; i < finalAnswer.length; i += CHUNK) {
          opts.onToken(finalAnswer.slice(i, i + CHUNK));
          await new Promise((r) => setTimeout(r, 8));
        }
      } else {
        onStep({ type: "answer", content: finalAnswer });
      }
      break;
    }

    conv.push({ role: "assistant", content });

    const toolUseBlocks = content.filter((b) => b.type === "tool_use");
    const toolResults: object[] = [];

    // First tool call → transition to executing phase
    if (toolUseBlocks.length > 0) {
      markPhase("executing");
      // Advance task plan: step 1 done, step 2 running
      if (typeof window !== "undefined") {
        const store = useStore.getState();
        const tp = store.taskPlan;
        if (tp.length >= 2) {
          store.updateTaskItem(tp[0].id, "done");
          store.updateTaskItem(tp[1].id, "running");
        }
      }
    }

    await Promise.all(
      toolUseBlocks.map(async (b) => {
        const name = b.name ?? "";
        const input = (b.input ?? {}) as Record<string, string>;
        const risk = getToolRisk(name);
        const trace: {
          tool: string;
          risk: ToolRiskTier;
          input: string;
          output?: string;
        } = {
          tool: name,
          risk,
          input: JSON.stringify(input),
        };
        toolTraces.push(trace);
        onStep({
          type: "tool_call",
          content: JSON.stringify({ ...input, _riskTier: risk }, null, 2),
          tool: name,
        });
        const exec = await executeToolDetailed(name, input);
        const result = exec.result;
        recordToolMetric(exec.meta);
        trace.output = result;
        onStep({ type: "tool_result", content: result, tool: name });
        toolResults.push({
          type: "tool_result",
          tool_use_id: b.id,
          content: result,
        });
      }),
    );

    conv.push({ role: "user", content: toolResults });
  }

  // Final phase transition + mark task plan complete
  if (finalAnswer) {
    markPhase("validating");
    let verification: VerificationPayload | undefined;
    if (!s.agentHighRiskWritesRequireApproval) {
      verification = await runVerificationAdapters();
      if (!verification.ok) {
        onStep({
          type: "thinking",
          content: `Verification failed: run marked DEGRADED (${RUNTIME_VERIFICATION_LABEL}).`,
        });
      } else {
        onStep({
          type: "thinking",
          content: `Verification passed: ${RUNTIME_VERIFICATION_LABEL}.`,
        });
      }
    }
    finalizeRunState(true);
    markPhase("done");
    finishDiagnostics({ ok: true, verification, finalAnswer });
  }

  // Auto-learn from completed conversation — runs silently in background
  if (finalAnswer) void autoLearn(userMessage, finalAnswer, s);
  if (!finalAnswer)
    finishDiagnostics({
      ok: false,
      failureCause: "Run ended without final answer",
      finalAnswer: "",
    });

  return finalAnswer;
}

// ── Runtime adapter boundary (Claude-code-first assimilation) ───────────────
export async function runAgent(opts: AgentOptions): Promise<string> {
  const settings = opts.settings ?? getSettings();
  const runtime = getRuntimeEngine(settings);

  opts.onStep({
    type: "thinking",
    content:
      runtime === "claudeCode"
        ? "[runtime] claudeCode adapter active (compat mode)"
        : "[runtime] nexus adapter active",
  });

  // Current assimilation milestone: keep behavior compatibility by routing
  // both engines through Nexus runtime while preserving an explicit boundary.
  // This lets us ship runtime toggles + telemetry now and swap in claude-code
  // internals incrementally without breaking HQ flows.
  return runNexusRuntime({ ...opts, settings });
}
