// ── api/tools ───────────────────────────────────────────────
// Tools API: dynamic tool discovery and execution framework.

import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import * as fs from "fs/promises";
import * as path from "path";
import { getBrandServiceName } from "@/lib/brand";
import { resolveInternalServiceOrigin } from "@/lib/authSession";
import {
  runFeynmanResearch,
  type FeynmanWorkflowId,
} from "@/lib/feynmanResearch";
import { parseFeynmanResearchIntegrityInput } from "@/lib/feynmanResearchIntegrity";
import {
  formatFeynmanPaperRank,
  parseFeynmanPaperRankInput,
  rankFeynmanPapers,
} from "@/lib/feynmanPaperRank";
import {
  FEYNMAN_PAPER_SECTIONS,
  formatFeynmanPaperInspection,
  inspectFeynmanPaper,
  normalizeFeynmanPaperReference,
  parseFeynmanPaperSections,
} from "@/lib/feynmanPaperInspection";
import {
  FEYNMAN_PAPER_QUESTION_LIMITS,
  auditFeynmanPaperQuestionAnswer,
  buildFeynmanPaperQuestionPrompt,
  formatFeynmanPaperQuestionAnswer,
  normalizeFeynmanPaperQuestion,
} from "@/lib/feynmanPaperQuestion";
import {
  FEYNMAN_PAPER_CODE_AUDIT_LIMITS,
  auditFeynmanPaperCodeAuditAnswer,
  buildFeynmanPaperCodeAuditPrompt,
  formatFeynmanPaperCodeAudit,
  parseFeynmanPaperCodeAuditInput,
  resolveFeynmanPaperCodeRepository,
} from "@/lib/feynmanPaperCodeAudit";
import {
  formatHuggingFaceInspection,
  inspectHuggingFaceRepository,
  inspectHuggingFaceTopic,
  normalizeHuggingFaceReference,
  readHuggingFaceTextFile,
  type HuggingFaceRepoType,
} from "@/lib/huggingFaceInspection";
import {
  buildFeynmanResumeContext,
  isFeynmanContinuityArtifactKind,
  type FeynmanContinuitySession,
} from "@/lib/feynmanContinuity";
import {
  appendFeynmanNotebookEntry,
  completeFeynmanContinuitySession,
  degradeFeynmanContinuitySession,
  getFeynmanContinuitySession,
  listFeynmanContinuitySessions,
  readFeynmanContinuityArtifact,
  searchFeynmanContinuitySessions,
  startFeynmanContinuitySession,
} from "@/lib/feynmanContinuityStore";
import { callInternalAi } from "@/lib/internalAi";
import { listCompiledMemoryPages } from "@/lib/memoryPagesStore";
import {
  buildRepoCompareSynthesisPrompt,
  runRepoCompare,
} from "@/lib/repoCompare";
import {
  buildRepoAssimilationSynthesisPrompt,
  runRepoAssimilation,
} from "@/lib/repoAssimilation";
import {
  assertSafeExternalUrl,
  readResponseTextWithLimit,
} from "@/lib/security/networkGuards";
import { isSensitiveLocalDataPath } from "@/lib/security/localDataPolicy";
import {
  applyRateLimitHeaders,
  checkRateLimit,
} from "@/lib/security/rateLimit";
import { applyProtectedActionHeaders } from "@/lib/security/protectedActionTelemetry";
import { buildStepUpRequiredResponse } from "@/lib/security/stepUpAuth";
import { runToolInIsolation } from "@/lib/security/toolIsolationRunner";
import { applyToolIsolationHeaders } from "@/lib/security/toolIsolationTelemetry";
import {
  resolveToolIsolationDescriptor,
  type ToolIsolationDescriptor,
} from "@/lib/security/toolIsolationPolicy";
import {
  getToolCapabilityClass,
  readProtectedActionContext,
  resolveProtectedActionBlockedReason,
  resolveProtectedActionDescriptor,
  requiresToolStepUp,
  type ProtectedActionDescriptor,
  type ProtectedActionKind,
  type ProtectedActionStatus,
} from "@/lib/security/toolCapabilityPolicy";
import { formatRepoIntelToolResult } from "@/lib/repoIntel";
import { getRepoIntelProfile, RepoIntelError } from "@/lib/serverRepoIntel";
import { loadSavedRepoAssimilationBrief } from "@/lib/serverRepoCompare";
import { buildProjectFileContext } from "@/lib/projectFileContext";
import {
  formatDesignSkillContract,
  formatDesignSkillList,
} from "@/lib/designSkillAtlas";
import {
  formatGoToMarketSkillContract,
  formatGoToMarketSkillList,
} from "@/lib/goToMarketSkillAtlas";
import {
  buildExternalToolResultEnvelope,
  type ExternalToolResultEnvelope,
} from "@/lib/externalToolBridge";
import { parseToolsPostBody } from "@/lib/toolsRequestSchema";
import {
  CENTRAL_ORCHESTRATOR_MAX_WORKERS,
  buildFailedSpecialistHandoff,
  buildSpecialistWorkerMessages,
  formatSpecialistHandoff,
  normalizeSpecialistMission,
  parseSpecialistHandoff,
} from "@/lib/centralOrchestrator";

const TOOL_USER_AGENT = `${getBrandServiceName()}/1.0`;

interface ToolResponseMeta {
  cacheHit?: boolean;
  duplicateRead?: boolean;
  externalTool?: ExternalToolResultEnvelope;
}

interface ToolResult {
  result: string;
  meta: ToolResponseMeta;
}

function withToolResult(
  result: string,
  meta: ToolResponseMeta = {},
): ToolResult {
  return { result, meta };
}

// ── Workspace root (files the agent can read/write) ───────────────────────────
const WORKSPACE =
  process.env.AGENT_WORKSPACE ?? path.join(process.cwd(), "agent-workspace");

async function ensureWorkspace() {
  await fs.mkdir(WORKSPACE, { recursive: true });
}

function getToolProtectedAction(
  capability: ReturnType<typeof getToolCapabilityClass>,
) {
  return (
    capability === "networked" ? "tools_networked" : "tools_mutate_exec"
  ) as ProtectedActionKind;
}

function buildToolBlockedMessage(status: ProtectedActionStatus) {
  switch (status) {
    case "network_locked":
      return "Tool blocked by network policy.";
    case "high_risk_blocked":
      return "Tool blocked until high-risk tools are enabled.";
    case "connector_limited":
      return "Tool blocked because connector exposure is disabled.";
    case "session_required":
      return "Tool blocked until the local session is re-established.";
    default:
      return "Tool blocked by protected-action policy.";
  }
}

function buildToolIsolationBlockedMessage(meta: ToolIsolationDescriptor) {
  switch (meta.status) {
    case "unavailable":
      return "Exec tool blocked because the isolation adapter is unavailable.";
    case "blocked":
      return "Exec tool blocked because it is not isolation-approved.";
    default:
      return "Exec tool blocked by tool-isolation policy.";
  }
}

// ── Tool handlers ─────────────────────────────────────────────────────────────

async function webSearch(query: string): Promise<string> {
  const braveKey = process.env.BRAVE_SEARCH_KEY ?? "";
  const trimmedQuery = query.trim();

  function stripHtml(value: string) {
    return value
      .replace(/<[^>]+>/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\s+/g, " ")
      .trim();
  }

  function decodeDuckDuckGoHref(value: string) {
    try {
      const href = value.startsWith("//") ? `https:${value}` : value;
      const url = new URL(href, "https://duckduckgo.com");
      const redirected = url.searchParams.get("uddg");
      return redirected ? decodeURIComponent(redirected) : url.toString();
    } catch {
      return value;
    }
  }

  function buildOpenWebQueries(value: string) {
    const queries = [value];
    const lower = value.toLowerCase();
    const looksLikeHandleLookup =
      /\b(twitch|streamer|youtube|creator|channel|handle)\b/i.test(value) ||
      /^[a-z0-9_]{3,32}$/i.test(value.replace(/\s+/g, ""));

    if (looksLikeHandleLookup) {
      if (!lower.includes("site:twitch.tv")) {
        queries.unshift(`site:twitch.tv ${value}`);
      }
      if (
        !lower.includes("site:x.com") &&
        !lower.includes("site:twitter.com")
      ) {
        queries.push(`site:x.com OR site:twitter.com ${value}`);
      }
    }

    return Array.from(new Set(queries));
  }

  async function searchOpenWeb(value: string) {
    const collected: { title: string; url: string; source: string }[] = [];

    for (const candidate of buildOpenWebQueries(value)) {
      try {
        const response = await fetch(
          `https://html.duckduckgo.com/html/?q=${encodeURIComponent(candidate)}`,
          {
            headers: {
              "User-Agent": `Mozilla/5.0 (compatible; ${TOOL_USER_AGENT})`,
            },
            signal: AbortSignal.timeout(8000),
          },
        );
        if (!response.ok) continue;
        const html = await response.text();
        const matches = Array.from(
          html.matchAll(
            /<a[^>]+class="(?:result__a|result-link)"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi,
          ),
        );
        for (const match of matches) {
          const href = decodeDuckDuckGoHref(match[1] ?? "");
          const title = stripHtml(match[2] ?? "");
          if (!href || !title) continue;
          if (collected.some((row) => row.url === href)) continue;
          let source = "open web";
          try {
            source = new URL(href).hostname;
          } catch {
            /* ignore */
          }
          collected.push({ title, url: href, source });
          if (collected.length >= 8) break;
        }
        if (collected.length >= 8) break;
      } catch {
        /* try next query */
      }
    }

    if (!collected.length) return "";
    return collected
      .slice(0, 8)
      .map((a, i) => `${i + 1}. ${a.title}\n   Source: ${a.source} | ${a.url}`)
      .join("\n\n");
  }

  // ── Brave Search (preferred, much better quality) ──────────────────────────
  if (braveKey) {
    try {
      const q = encodeURIComponent(trimmedQuery);
      const url = `https://api.search.brave.com/res/v1/web/search?q=${q}&count=8&text_decorations=0`;
      const r = await fetch(url, {
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip",
          "X-Subscription-Token": braveKey,
        },
        signal: AbortSignal.timeout(8000),
      });
      const d = await r.json();
      const results = (d.web?.results ?? []) as {
        title: string;
        url: string;
        description?: string;
        meta_url?: { netloc?: string };
      }[];
      if (results.length) {
        return results
          .slice(0, 8)
          .map(
            (a, i) =>
              `${i + 1}. ${a.title}\n   ${a.description ?? ""}\n   Source: ${a.meta_url?.netloc ?? new URL(a.url).hostname} | ${a.url}`,
          )
          .join("\n\n");
      }
    } catch {
      // fall through to open web / GDELT
    }
  }

  const openWeb = await searchOpenWeb(trimmedQuery);
  if (openWeb) return openWeb;

  // ── GDELT fallback (no key required) ───────────────────────────────────────
  try {
    const q = encodeURIComponent(trimmedQuery);
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${q}&mode=artlist&maxrecords=10&format=json`;
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const d = await r.json();
    const articles = (d.articles ?? []) as {
      title: string;
      url: string;
      domain?: string;
      seendate?: string;
    }[];
    if (!articles.length) return "No results found.";
    return articles
      .slice(0, 8)
      .map(
        (a, i) =>
          `${i + 1}. ${a.title}\n   Source: ${a.domain ?? "unknown"} | ${a.url}`,
      )
      .join("\n\n");
  } catch {
    return "Search failed — could not reach search API.";
  }
}

async function fetchUrl(url: string): Promise<string> {
  try {
    const safeUrl = assertSafeExternalUrl(url);
    const r = await fetch(safeUrl, {
      headers: { "User-Agent": `Mozilla/5.0 (compatible; ${TOOL_USER_AGENT})` },
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) return `Could not fetch that URL (HTTP ${r.status}).`;
    const html = await readResponseTextWithLimit(r, 24_000);
    // Strip tags, collapse whitespace
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim()
      .slice(0, 4000);
    return text || "Page returned no readable text.";
  } catch (error) {
    return error instanceof Error ? error.message : "Could not fetch that URL.";
  }
}

async function writeFile(filename: string, content: string): Promise<string> {
  await ensureWorkspace();
  // Sanitise — no path traversal
  const safe = path.basename(filename);
  const dest = path.join(WORKSPACE, safe);
  await fs.writeFile(dest, content, "utf-8");
  return `File written: ${safe} (${content.length} chars)`;
}

async function readFile(filename: string): Promise<string> {
  await ensureWorkspace();
  const safe = path.basename(filename);
  const src = path.join(WORKSPACE, safe);
  try {
    const content = await fs.readFile(src, "utf-8");
    return content.slice(0, 6000);
  } catch {
    return `File not found: ${safe}`;
  }
}

async function listFiles(): Promise<string> {
  await ensureWorkspace();
  try {
    const files = await fs.readdir(WORKSPACE);
    if (!files.length) return "Workspace is empty.";
    return files.join("\n");
  } catch {
    return "Could not list workspace files.";
  }
}

// ── Agent memory (inspired by OpenClaw SOUL.md / USER.md pattern) ─────────────
const NOTES_FILE = "agent-notes.md";

async function rememberNote(note: string): Promise<string> {
  await ensureWorkspace();
  const dest = path.join(WORKSPACE, NOTES_FILE);
  const ts = new Date().toISOString().slice(0, 16).replace("T", " ");
  const entry = `\n- [${ts}] ${note.trim()}`;
  try {
    await fs.appendFile(dest, entry, "utf-8");
  } catch {
    // File might not exist yet — create it
    const header = `# Agent Notes\n\nThings to remember across sessions.\n`;
    await fs.writeFile(dest, header + entry, "utf-8");
  }
  return `Noted: "${note.trim()}"`;
}

async function recallNotes(): Promise<string> {
  await ensureWorkspace();
  const src = path.join(WORKSPACE, NOTES_FILE);
  try {
    const content = await fs.readFile(src, "utf-8");
    return content.slice(0, 4000) || "No notes saved yet.";
  } catch {
    return "No notes saved yet.";
  }
}

// ── OpenClaw / Max integration ────────────────────────────────────────────────
const OPENCLAW_GATEWAY = process.env.OPENCLAW_URL ?? "http://127.0.0.1:18789";
const OPENCLAW_TOKEN = process.env.OPENCLAW_TOKEN ?? "";

async function askMax(message: string): Promise<string> {
  // OpenClaw REST API: POST /api/v1/messages to main agent session
  const token = OPENCLAW_TOKEN;
  if (!token) {
    return "Max (OpenClaw) is not configured. Set OPENCLAW_TOKEN and OPENCLAW_URL in your environment or .env.local to enable this tool.";
  }
  try {
    const r = await fetch(`${OPENCLAW_GATEWAY}/api/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        agentId: "main",
        message,
        stream: false,
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!r.ok) {
      return `Max returned HTTP ${r.status}. Make sure OpenClaw is running (openclaw gateway run).`;
    }
    const d = await r.json();
    // Response shape: { content: string } or { message: string } depending on version
    const text = d?.content ?? d?.message ?? d?.text ?? JSON.stringify(d);
    return `Max says: ${text}`;
  } catch {
    return "Could not reach Max (OpenClaw). Make sure OpenClaw is running: run `openclaw gateway run` in your terminal.";
  }
}

// ── Nexus central orchestrator specialist delegation ────────────────────────
const specialistDelegationRuns = new Map<
  string,
  { count: number; touchedAt: number }
>();

function claimSpecialistDelegationSlot(runId: string) {
  const now = Date.now();
  const key =
    runId && runId !== "anon"
      ? runId
      : `anon-${Math.floor(now / 60_000).toString(36)}`;
  const current = specialistDelegationRuns.get(key) ?? {
    count: 0,
    touchedAt: now,
  };
  if (current.count >= CENTRAL_ORCHESTRATOR_MAX_WORKERS) return false;

  specialistDelegationRuns.set(key, {
    count: current.count + 1,
    touchedAt: now,
  });
  if (specialistDelegationRuns.size > 256) {
    const oldest = [...specialistDelegationRuns.entries()].sort(
      (left, right) => left[1].touchedAt - right[1].touchedAt,
    )[0]?.[0];
    if (oldest) specialistDelegationRuns.delete(oldest);
  }
  return true;
}

async function delegateSpecialist(
  input: Record<string, string>,
  runId: string,
): Promise<string> {
  const mission = normalizeSpecialistMission({
    worker: input.worker,
    taskId: input.task_id,
    mission: input.mission,
    context: input.context,
    expectedOutput: input.expected_output,
  });
  if (!mission) {
    return "Specialist delegation blocked: choose orbit, nova, cipher, or flux and provide a non-empty bounded mission.";
  }

  if (!claimSpecialistDelegationSlot(runId)) {
    return formatSpecialistHandoff({
      ...buildFailedSpecialistHandoff(
        mission,
        `Delegation cap reached: MAX may use at most ${CENTRAL_ORCHESTRATOR_MAX_WORKERS} workers per run.`,
      ),
      status: "blocked",
      nextAction: "MAX should synthesize the handoffs already received.",
    });
  }

  try {
    const aiResult = await callInternalAi({
      origin: resolveInternalServiceOrigin(),
      task: "central_orchestrator_worker",
      maxTokens: 1_200,
      timeoutMs: 45_000,
      messages: buildSpecialistWorkerMessages(mission),
    });
    if (!aiResult.ok || !aiResult.text.trim()) {
      return formatSpecialistHandoff(
        buildFailedSpecialistHandoff(
          mission,
          `Specialist provider failed with status ${aiResult.status}.`,
        ),
      );
    }
    return formatSpecialistHandoff(
      parseSpecialistHandoff(aiResult.text, mission),
    );
  } catch {
    return formatSpecialistHandoff(
      buildFailedSpecialistHandoff(
        mission,
        "Specialist worker could not be reached.",
      ),
    );
  }
}

// ── Safe math evaluator (no eval / no Function constructor) ──────────────────
// Recursive descent parser: handles +, -, *, /, (), unary minus, %
function mathEval(expr: string): number {
  const s = expr.replace(/\s+/g, "");
  if (!/^[0-9+\-*/().%]+$/.test(s)) throw new Error("Invalid characters");

  let pos = 0;

  function parseExpr(): number {
    let left = parseTerm();
    while (pos < s.length && (s[pos] === "+" || s[pos] === "-")) {
      const op = s[pos++];
      const right = parseTerm();
      left = op === "+" ? left + right : left - right;
    }
    return left;
  }

  function parseTerm(): number {
    let left = parseFactor();
    while (pos < s.length && (s[pos] === "*" || s[pos] === "/")) {
      const op = s[pos++];
      const right = parseFactor();
      if (op === "/" && right === 0) throw new Error("Division by zero");
      left = op === "*" ? left * right : left / right;
    }
    return left;
  }

  function parseFactor(): number {
    if (s[pos] === "(") {
      pos++; // skip '('
      const val = parseExpr();
      if (s[pos] === ")") pos++; // skip ')'
      return val;
    }
    if (s[pos] === "-") {
      pos++;
      return -parseFactor();
    }
    if (s[pos] === "+") {
      pos++;
      return parseFactor();
    }
    let numStr = "";
    while (pos < s.length && /[0-9.]/.test(s[pos])) numStr += s[pos++];
    if (!numStr) throw new Error("Unexpected character");
    const n = parseFloat(numStr);
    if (pos < s.length && s[pos] === "%") {
      pos++;
      return n / 100;
    }
    return n;
  }

  const result = parseExpr();
  if (!isFinite(result)) throw new Error("Non-finite result");
  return result;
}

async function calculate(expression: string): Promise<string> {
  try {
    const result = mathEval(expression);
    return String(result);
  } catch {
    return "Could not evaluate that expression.";
  }
}

// ── Project file access ───────────────────────────────────────────────────────
// Gives the agent read + targeted-edit access to the actual project source code.
// Security rules:
//  - No path traversal (../ blocked)
//  - .env* files always blocked
//  - node_modules, .git, .next, archive blocked
//  - Write only allowed inside safe source dirs
//  - Max response: 60,000 chars with semantic selection for larger files

const PROJECT_ROOT = process.cwd();

// Extensions the agent is allowed to read
const READABLE_EXTS = new Set([
  ".tsx",
  ".ts",
  ".js",
  ".jsx",
  ".css",
  ".json",
  ".md",
  ".txt",
  ".svg",
  ".html",
  ".sh",
  ".bat",
  ".ps1",
]);

// Prefixes blocked for both read and write
const BLOCKED_PREFIXES = ["node_modules", ".git", ".next", "archive", ".env"];

// Directories where the agent is allowed to write/patch
const WRITABLE_DIRS = [
  "app",
  "components",
  "lib",
  "store",
  "public",
  "docs",
  "specs",
  "hooks",
];

function resolveProjectPath(relPath: string): {
  safe: string;
  blocked: string | null;
} {
  // Strip any leading slashes or backslashes
  const cleaned = relPath.replace(/^[/\\]+/, "").replace(/\\/g, "/");
  // Block path traversal
  if (cleaned.includes(".."))
    return { safe: "", blocked: "Path traversal is not allowed." };
  // Block .env files
  const basename = path.basename(cleaned);
  if (basename.startsWith(".env"))
    return { safe: "", blocked: ".env files are protected." };
  // Block known directories
  const topLevel = cleaned.split("/")[0];
  if (
    BLOCKED_PREFIXES.some((p) => topLevel === p || cleaned.startsWith(p + "/"))
  )
    return { safe: "", blocked: `"${topLevel}" is off-limits.` };
  if (isSensitiveLocalDataPath(cleaned))
    return {
      safe: "",
      blocked: `"${cleaned}" is treated as sensitive local data.`,
    };
  const full = path.join(PROJECT_ROOT, cleaned);
  return { safe: full, blocked: null };
}

function normalizeProjectPathKey(relPath: string): string {
  return relPath.replace(/^[/\\]+/, "").replace(/\\/g, "/");
}

async function readProjectFile(
  relPath: string,
  runId: string,
  rawFocus = "",
  rawChunk = "",
): Promise<ToolResult> {
  const { safe, blocked } = resolveProjectPath(relPath);
  if (blocked) return withToolResult(`Blocked: ${blocked}`);
  const ext = path.extname(relPath).toLowerCase();
  if (!READABLE_EXTS.has(ext))
    return withToolResult(
      `Cannot read file type "${ext}". Allowed: ${Array.from(READABLE_EXTS).join(", ")}`,
    );
  const normalizedPath = normalizeProjectPathKey(relPath);
  if (isSensitiveLocalDataPath(normalizedPath)) {
    return withToolResult(
      `Blocked: "${relPath}" is treated as sensitive local data.`,
      {
        duplicateRead: false,
      },
    );
  }
  const selectorKey = createHash("sha256")
    .update(`${rawChunk.trim()}\0${rawFocus.trim().toLowerCase()}`)
    .digest("hex")
    .slice(0, 24);
  const duplicateRead = recordDuplicateRead(
    runId,
    "read_project_file",
    `${normalizedPath}|${selectorKey}`,
  );
  const cacheKey = `read_project_file:${normalizedPath}:${selectorKey}`;
  const cached = cacheGet(cacheKey);
  if (cached !== null) {
    return withToolResult(cached, { cacheHit: true, duplicateRead });
  }
  let content: string;
  try {
    content = await fs.readFile(safe, "utf-8");
  } catch {
    return withToolResult(`File not found: ${relPath}`, { duplicateRead });
  }
  try {
    const result = buildProjectFileContext(content, {
      extension: ext,
      focus: rawFocus,
      chunk: rawChunk,
    }).text;
    cachePut(cacheKey, result);
    return withToolResult(result, { duplicateRead });
  } catch (error) {
    return withToolResult(
      error instanceof Error
        ? error.message
        : "Could not build bounded project-file context.",
      { duplicateRead },
    );
  }
}

async function listProjectFiles(
  relDir: string,
  runId: string,
): Promise<ToolResult> {
  const cleanDir = relDir.replace(/^[/\\]+/, "").replace(/\\/g, "/") || ".";
  const { safe, blocked } = resolveProjectPath(
    cleanDir === "." ? "_root_sentinel" : cleanDir,
  );
  // For root listing, bypass the sentinel trick
  const targetPath = cleanDir === "." ? PROJECT_ROOT : blocked ? null : safe;

  if (!targetPath) return withToolResult(`Blocked: ${blocked}`);
  const duplicateRead = recordDuplicateRead(
    runId,
    "list_project_files",
    cleanDir,
  );
  const cacheKey = `list_project_files:${cleanDir}`;
  const cached = cacheGet(cacheKey);
  if (cached !== null) {
    return withToolResult(cached, { cacheHit: true, duplicateRead });
  }

  try {
    const entries = await fs.readdir(targetPath, { withFileTypes: true });
    const lines = entries
      .filter(
        (e) => !isSensitiveLocalDataPath(path.posix.join(cleanDir, e.name)),
      )
      .map((e) => `${e.isDirectory() ? "📁" : "📄"} ${e.name}`);
    const result = lines.length ? lines.join("\n") : "Directory is empty.";
    cachePut(cacheKey, result);
    return withToolResult(result, { duplicateRead });
  } catch {
    return withToolResult(`Directory not found: ${relDir}`, {
      duplicateRead,
    });
  }
}

async function createProjectFile(
  relPath: string,
  content: string,
): Promise<string> {
  const { safe, blocked } = resolveProjectPath(relPath);
  if (blocked) return `Blocked: ${blocked}`;

  const topLevel = relPath.replace(/^[/\\]+/, "").split("/")[0];
  if (!WRITABLE_DIRS.includes(topLevel)) {
    return `Write blocked: "${topLevel}" is not a writable directory. Allowed: ${WRITABLE_DIRS.join(", ")}`;
  }

  const ext = path.extname(relPath).toLowerCase();
  if (!READABLE_EXTS.has(ext)) return `Cannot create file type "${ext}".`;

  // Refuse to overwrite — agent should use patch_project_file for that
  try {
    await fs.access(safe);
    return `File already exists: ${relPath}. Use patch_project_file to edit it.`;
  } catch {
    // File does not exist — good, proceed
  }

  // Create intermediate directories if needed
  await fs.mkdir(path.dirname(safe), { recursive: true });
  await fs.writeFile(safe, content, "utf-8");
  return `Created: ${relPath} (${content.length} chars, ${content.split("\n").length} lines)`;
}

async function patchProjectFile(
  relPath: string,
  oldStr: string,
  newStr: string,
): Promise<string> {
  const { safe, blocked } = resolveProjectPath(relPath);
  if (blocked) return `Blocked: ${blocked}`;

  // Only allow writes in approved directories
  const topLevel = relPath.replace(/^[/\\]+/, "").split("/")[0];
  if (!WRITABLE_DIRS.includes(topLevel)) {
    return `Write blocked: "${topLevel}" is not a writable directory. Allowed: ${WRITABLE_DIRS.join(", ")}`;
  }

  const ext = path.extname(relPath).toLowerCase();
  if (!READABLE_EXTS.has(ext)) return `Cannot edit file type "${ext}".`;

  // Read current content
  let content: string;
  try {
    content = await fs.readFile(safe, "utf-8");
  } catch {
    return `File not found: ${relPath}. Use create_project_file to create it first.`;
  }

  if (!content.includes(oldStr)) {
    return `Patch failed: the exact text was not found in ${relPath}. Read the file first and copy the exact string you want to replace.`;
  }

  // Only replace the first occurrence (safer — prevents mass replacement)
  const updated = content.replace(oldStr, newStr);
  await fs.writeFile(safe, updated, "utf-8");
  const linesChanged = Math.abs(
    newStr.split("\n").length - oldStr.split("\n").length,
  );
  return `Patched: ${relPath} — ${linesChanged} line(s) changed.`;
}

// ── Agent Reach connectors (free public data — no keys needed) ───────────────
// Proxy calls to the local Agent Reach service (localhost:5051).
// If the service is not running, each tool returns a setup hint.

const AGENT_REACH_BASE = process.env.AGENT_REACH_URL ?? "http://127.0.0.1:5051";

async function agentReachProxy(
  endpoint: string,
  params: Record<string, string>,
): Promise<string> {
  const qs = new URLSearchParams(params).toString();
  const url = `${AGENT_REACH_BASE}${endpoint}${qs ? `?${qs}` : ""}`;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(12_000) });
    const data = (await r.json()) as unknown;
    return JSON.stringify(data, null, 2);
  } catch {
    return (
      `Agent Reach service is not running on ${AGENT_REACH_BASE}.\n` +
      "Start it with: python scripts/agent-reach-service.py\n" +
      "See docs/deployment/agent-reach.md for setup."
    );
  }
}

async function redditSearch(
  query: string,
  subreddit: string,
  limit: string,
): Promise<string> {
  const params: Record<string, string> = { q: query };
  if (subreddit) params.subreddit = subreddit;
  if (limit) params.limit = limit;
  return agentReachProxy("/reddit", params);
}

async function githubTrending(
  language: string,
  since: string,
): Promise<string> {
  const params: Record<string, string> = {};
  if (language) params.language = language;
  params.since = since || "daily";
  return agentReachProxy("/github-trending", params);
}

async function analyzeRepo(repo: string): Promise<ToolResult> {
  try {
    const { profile, cacheHit } = await getRepoIntelProfile(repo);
    return withToolResult(formatRepoIntelToolResult(profile), { cacheHit });
  } catch (error) {
    const message =
      error instanceof RepoIntelError
        ? error.message
        : "Repo intel could not read GitHub metadata.";
    return withToolResult(message);
  }
}

async function assimilateRepo(
  repo: string,
  origin: string,
): Promise<ToolResult> {
  if (!repo.trim()) {
    return withToolResult("assimilate_repo: owner_slash_repo is required.");
  }

  try {
    const result = await runRepoAssimilation(repo, {
      getProfile: getRepoIntelProfile,
      synthesize: async (profile) => {
        const aiResult = await callInternalAi({
          origin,
          task: "repo_assimilation",
          maxTokens: 900,
          timeoutMs: 45_000,
          messages: [
            {
              role: "user",
              content: buildRepoAssimilationSynthesisPrompt(profile),
            },
          ],
        });

        if (!aiResult.ok || !aiResult.text.trim()) {
          throw new Error("Repo assimilation synthesis failed.");
        }

        return aiResult.text;
      },
    });

    return withToolResult(result.brief, { cacheHit: result.cacheHit });
  } catch (error) {
    return withToolResult(
      error instanceof Error
        ? error.message
        : "Repo assimilation failed while reading GitHub metadata.",
    );
  }
}

async function compareRepos(
  rawRepoRefs: string[] | string,
  origin: string,
): Promise<ToolResult> {
  try {
    const result = await runRepoCompare(rawRepoRefs, {
      getProfile: getRepoIntelProfile,
      getSavedAssimilationBrief: loadSavedRepoAssimilationBrief,
      synthesize: async (input) => {
        const aiResult = await callInternalAi({
          origin,
          task: "repo_compare",
          maxTokens: 1_000,
          timeoutMs: 45_000,
          messages: [
            {
              role: "user",
              content: buildRepoCompareSynthesisPrompt(input),
            },
          ],
        });

        if (!aiResult.ok || !aiResult.text.trim()) {
          throw new Error("Repo compare synthesis failed.");
        }

        return aiResult.text;
      },
    });

    return withToolResult(result.brief, { cacheHit: result.cacheHit });
  } catch (error) {
    return withToolResult(
      error instanceof Error
        ? error.message
        : "Repo compare failed while reading GitHub metadata.",
    );
  }
}

const FEYNMAN_WORKFLOWS = new Set<FeynmanWorkflowId>([
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
]);

async function callFeynmanStage(
  origin: string,
  task: string,
  prompt: string,
  maxTokens: number,
) {
  const aiResult = await callInternalAi({
    origin,
    task,
    maxTokens,
    timeoutMs: 60_000,
    messages: [{ role: "user", content: prompt }],
  });
  if (!aiResult.ok || !aiResult.text.trim()) {
    throw new Error(`${task} failed.`);
  }
  return aiResult.text;
}

async function feynmanResearch(
  rawWorkflow: string,
  topic: string,
  origin: string,
  rawExperimentIntakeDeclaration: string,
  rawExperimentProvenanceJson: string,
): Promise<ToolResult> {
  const workflow = rawWorkflow.trim().toLowerCase() as FeynmanWorkflowId;
  if (!FEYNMAN_WORKFLOWS.has(workflow)) {
    return withToolResult(
      `feynman_research: workflow must be one of ${Array.from(FEYNMAN_WORKFLOWS).join(", ")}.`,
    );
  }
  if (!topic.trim()) {
    return withToolResult("feynman_research: topic or artifact is required.");
  }
  let integrityInput;
  try {
    integrityInput = parseFeynmanResearchIntegrityInput({
      experimentIntakeDeclaration: rawExperimentIntakeDeclaration,
      experimentProvenanceJson: rawExperimentProvenanceJson,
    });
  } catch {
    return withToolResult(
      "feynman_research: experiment integrity input is invalid.",
    );
  }

  let continuitySession: FeynmanContinuitySession | null = null;
  try {
    continuitySession = await startFeynmanContinuitySession({
      workflow,
      topic,
    });
  } catch {
    // Research remains available when local continuity storage is unavailable.
  }

  try {
    const result = await runFeynmanResearch(
      workflow,
      topic,
      {
        searchPapers: hfPapersSearch,
        webSearch,
        fetchUrl,
        inspectHuggingFace: inspectHuggingFaceTopic,
        write: (prompt) =>
          callFeynmanStage(origin, "feynman_writer", prompt, 1_800),
        verify: (prompt) =>
          callFeynmanStage(origin, "feynman_verifier", prompt, 1_300),
        review: (prompt) =>
          callFeynmanStage(origin, "feynman_reviewer", prompt, 1_100),
        progress: continuitySession
          ? (event) =>
              appendFeynmanNotebookEntry(continuitySession.id, {
                ...event,
                at: new Date().toISOString(),
              })
          : undefined,
      },
      integrityInput,
    );
    let completedSession: FeynmanContinuitySession | null = null;
    if (continuitySession) {
      try {
        completedSession = await completeFeynmanContinuitySession(
          continuitySession.id,
          result,
        );
      } catch {
        // Preserve the primary research result if continuity finalization fails.
      }
    }
    return withToolResult(
      completedSession
        ? [
            result.report,
            "",
            "## Research Continuity",
            `- Session: ${completedSession.id}`,
            `- Resume: use feynman_outputs action "resume" with session_id "${completedSession.id}".`,
            `- Notebook: /api/feynman/artifacts?sessionId=${encodeURIComponent(completedSession.id)}&artifact=notebook`,
            `- Preview: /api/feynman/artifacts?sessionId=${encodeURIComponent(completedSession.id)}&artifact=preview`,
            `- PDF: /api/feynman/artifacts?sessionId=${encodeURIComponent(completedSession.id)}&artifact=pdf`,
          ].join("\n")
        : result.report,
    );
  } catch (error) {
    if (continuitySession) {
      try {
        await degradeFeynmanContinuitySession(
          continuitySession.id,
          error instanceof Error
            ? error.message
            : "Feynman research workflow failed.",
        );
      } catch {
        // Preserve the original workflow failure.
      }
    }
    return withToolResult(
      error instanceof Error
        ? error.message
        : "Feynman research workflow failed.",
    );
  }
}

function feynmanPaperRank(input: Record<string, string>): ToolResult {
  try {
    const parsed = parseFeynmanPaperRankInput(
      input.topic ?? "",
      input.candidates_json ?? "",
    );
    return withToolResult(
      formatFeynmanPaperRank(
        rankFeynmanPapers(parsed.topic, parsed.candidates),
      ),
    );
  } catch {
    return withToolResult(
      "feynman_paper_rank: provide a topic and candidates_json containing a valid JSON array of 2-25 paper objects with direct metadata and a title for each paper.",
    );
  }
}

async function feynmanPaperInspect(
  input: Record<string, string>,
): Promise<ToolResult> {
  try {
    const reference = normalizeFeynmanPaperReference(
      input.paper ?? input.reference ?? input.arxiv_id ?? "",
    );
    const sections = parseFeynmanPaperSections(input.sections ?? "");
    return withToolResult(
      formatFeynmanPaperInspection(
        await inspectFeynmanPaper(reference, sections),
      ),
    );
  } catch (error) {
    return withToolResult(
      error instanceof Error
        ? `feynman_paper_inspect: ${error.message}`
        : "feynman_paper_inspect failed.",
    );
  }
}

async function feynmanPaperAsk(
  input: Record<string, string>,
  origin: string,
): Promise<ToolResult> {
  try {
    const reference = normalizeFeynmanPaperReference(
      input.paper ?? input.reference ?? input.arxiv_id ?? "",
    );
    const question = normalizeFeynmanPaperQuestion(input.question ?? "");
    const inspection = await inspectFeynmanPaper(reference, [
      ...FEYNMAN_PAPER_SECTIONS,
    ]);
    const prompt = buildFeynmanPaperQuestionPrompt(inspection, question);
    const aiResult = await callInternalAi({
      origin,
      task: "research",
      maxTokens: FEYNMAN_PAPER_QUESTION_LIMITS.maximumOutputTokens,
      timeoutMs: 45_000,
      messages: [
        { role: "system", content: prompt.systemPrompt },
        { role: "user", content: prompt.userPrompt },
      ],
    });
    if (!aiResult.ok || !aiResult.text.trim()) {
      return withToolResult(
        "feynman_paper_ask: Paper evidence was collected, but internal AI answering was unavailable. Check local AI and retry.",
      );
    }
    const audit = auditFeynmanPaperQuestionAnswer(
      aiResult.text,
      prompt.evidenceSections,
    );
    return withToolResult(
      formatFeynmanPaperQuestionAnswer(inspection, question, audit),
    );
  } catch (error) {
    return withToolResult(
      error instanceof Error
        ? `feynman_paper_ask: ${error.message}`
        : "feynman_paper_ask failed.",
    );
  }
}

async function feynmanPaperCodeAudit(
  input: Record<string, string>,
  origin: string,
): Promise<ToolResult> {
  try {
    const reference = normalizeFeynmanPaperReference(
      input.paper ?? input.reference ?? input.arxiv_id ?? "",
    );
    const parsed = parseFeynmanPaperCodeAuditInput(
      input.question ?? "",
      input.repository ?? input.repository_url ?? "",
      input.code_evidence_json ?? "",
    );
    const inspection = await inspectFeynmanPaper(reference, [
      ...FEYNMAN_PAPER_SECTIONS,
    ]);
    const repositoryUrl = resolveFeynmanPaperCodeRepository(
      inspection,
      parsed.requestedRepositoryUrl,
    );
    const prompt = buildFeynmanPaperCodeAuditPrompt(
      inspection,
      parsed.question,
      repositoryUrl,
      parsed.codeEvidence,
    );
    const aiResult = await callInternalAi({
      origin,
      task: "research",
      maxTokens: FEYNMAN_PAPER_CODE_AUDIT_LIMITS.maximumOutputTokens,
      timeoutMs: 45_000,
      messages: [
        { role: "system", content: prompt.systemPrompt },
        { role: "user", content: prompt.userPrompt },
      ],
    });
    if (!aiResult.ok || !aiResult.text.trim()) {
      return withToolResult(
        "feynman_paper_code_audit: Evidence was collected, but internal AI auditing was unavailable. Check local AI and retry.",
      );
    }
    const audit = auditFeynmanPaperCodeAuditAnswer(
      aiResult.text,
      prompt.paperEvidenceSections,
      prompt.codeEvidencePaths,
    );
    return withToolResult(
      formatFeynmanPaperCodeAudit(inspection, prompt, audit),
    );
  } catch (error) {
    return withToolResult(
      error instanceof Error
        ? `feynman_paper_code_audit: ${error.message}`
        : "feynman_paper_code_audit failed.",
    );
  }
}

async function deepResearch(
  topic: string,
  origin: string,
): Promise<ToolResult> {
  return feynmanResearch("deepresearch", topic, origin, "", "");
}

function formatFeynmanSessionIndex(sessions: FeynmanContinuitySession[]) {
  if (sessions.length === 0)
    return "No local Feynman continuity sessions exist yet.";
  return sessions
    .map(
      (session, index) =>
        `${index + 1}. **${session.title}**\n   Session: ${session.id} · Workflow: ${session.workflow} · Status: ${session.status} · Updated: ${session.updatedAt}\n   Preview: /api/feynman/artifacts?sessionId=${encodeURIComponent(session.id)}&artifact=preview · PDF: /api/feynman/artifacts?sessionId=${encodeURIComponent(session.id)}&artifact=pdf`,
    )
    .join("\n");
}

async function feynmanOutputs(
  input: Record<string, string> = {},
): Promise<ToolResult> {
  const action = (input.action ?? "list").trim().toLowerCase();
  try {
    switch (action) {
      case "search": {
        const query = input.query?.trim() ?? "";
        if (!query) {
          return withToolResult("feynman_outputs search requires query.");
        }
        const sessions = await searchFeynmanContinuitySessions(query, {
          limit: 20,
        });
        return withToolResult(
          [
            `# Feynman Session Search · ${query}`,
            "",
            formatFeynmanSessionIndex(sessions),
          ].join("\n"),
        );
      }
      case "resume": {
        const session = input.session_id?.trim()
          ? await getFeynmanContinuitySession(input.session_id.trim())
          : (
              await searchFeynmanContinuitySessions(input.query ?? "", {
                limit: 1,
              })
            )[0];
        if (!session) {
          return withToolResult(
            "No matching Feynman continuity session was found.",
          );
        }
        return withToolResult(buildFeynmanResumeContext(session));
      }
      case "export": {
        const sessionId = input.session_id?.trim() ?? "";
        const artifact = (input.format ?? "pdf").trim().toLowerCase();
        if (!sessionId) {
          return withToolResult("feynman_outputs export requires session_id.");
        }
        if (!isFeynmanContinuityArtifactKind(artifact)) {
          return withToolResult(
            "feynman_outputs export format must be plan, notebook, report, evidence, claims, review, provenance, preview, or pdf.",
          );
        }
        const exportArtifact = await readFeynmanContinuityArtifact(
          sessionId,
          artifact,
        );
        return withToolResult(
          [
            `# Feynman ${artifact} export`,
            "",
            `- Session: ${sessionId}`,
            `- File: ${exportArtifact.fileName}`,
            `- Open: /api/feynman/artifacts?sessionId=${encodeURIComponent(sessionId)}&artifact=${artifact}`,
          ].join("\n"),
        );
      }
      case "list":
        break;
      default:
        return withToolResult(
          "feynman_outputs action must be list, search, resume, or export.",
        );
    }

    const sessions = await listFeynmanContinuitySessions({ limit: 20 });
    const pages = await listCompiledMemoryPages({ limit: 80 });
    const researchPages = pages
      .filter(
        (page) =>
          FEYNMAN_WORKFLOWS.has(page.workflowId as FeynmanWorkflowId) ||
          page.tags.includes("feynman-native"),
      )
      .slice(0, 20);
    if (researchPages.length === 0 && sessions.length === 0) {
      return withToolResult(
        "No Feynman-native VAULT outputs exist yet. Run /deepresearch, /lit, /review, /audit, /replicate, /recipe, /compare, /draft, /autoresearch, or /watch first.",
      );
    }
    return withToolResult(
      [
        "# Feynman Outputs",
        "",
        "## Continuity Sessions",
        formatFeynmanSessionIndex(sessions),
        "",
        "## VAULT Compiled Pages",
        ...researchPages.map(
          (page, index) =>
            `${index + 1}. **${page.title}**\n   Workflow: ${page.workflowId ?? "research"} · Updated: ${new Date(page.updatedAt).toISOString()} · Sources: ${page.researchSignals.sourceCount} · Citations: ${page.researchSignals.citationCount}\n   Open: /vault?focus=vault-compiled-pages&pageId=${encodeURIComponent(page.id)}${page.workflowId ? `&workflowId=${encodeURIComponent(page.workflowId)}` : ""}`,
        ),
      ].join("\n"),
    );
  } catch {
    return withToolResult(
      "Could not read Feynman outputs from the local VAULT.",
    );
  }
}

async function rssFetch(feedUrl: string, limit: string): Promise<string> {
  if (!feedUrl.trim()) return "rss_fetch: url is required.";
  try {
    const safeUrl = assertSafeExternalUrl(feedUrl).toString();
    const params: Record<string, string> = { url: safeUrl };
    if (limit) params.limit = limit;
    return agentReachProxy("/rss", params);
  } catch (error) {
    return error instanceof Error ? error.message : "rss_fetch failed.";
  }
}

// ── Session-scoped read cache (60 s TTL) ─────────────────────────────────────
// Caches fetch responses in memory so repeated reads in the same session don't
// hit external APIs again. Evicted when a patch_project_file write occurs.
interface CacheEntry {
  value: string;
  expiresAt: number;
}
const readCache = new Map<string, CacheEntry>();
interface DuplicateReadEntry {
  count: number;
  lastAccessAt: number;
}
const duplicateReadAudit = new Map<string, DuplicateReadEntry>();

function cacheGet(key: string): string | null {
  const entry = readCache.get(key);
  if (!entry || Date.now() > entry.expiresAt) {
    readCache.delete(key);
    return null;
  }
  return entry.value;
}

function cachePut(key: string, value: string, ttlMs = 60_000): void {
  readCache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

function cacheEvict(prefix: string): void {
  for (const k of Array.from(readCache.keys())) {
    if (k.startsWith(prefix)) readCache.delete(k);
  }
}

function pruneDuplicateReadAudit(now = Date.now()): void {
  if (duplicateReadAudit.size <= 1500) return;
  for (const [key, entry] of Array.from(duplicateReadAudit.entries())) {
    if (now - entry.lastAccessAt > 30 * 60_000) {
      duplicateReadAudit.delete(key);
    }
  }
}

function recordDuplicateRead(
  runId: string,
  kind: string,
  target: string,
): boolean {
  const now = Date.now();
  pruneDuplicateReadAudit(now);
  const key = `${runId}:${kind}:${target}`;
  const next = duplicateReadAudit.get(key);
  const count = (next?.count ?? 0) + 1;
  duplicateReadAudit.set(key, { count, lastAccessAt: now });
  return count >= 3;
}

// ── HuggingFace daily papers search ──────────────────────────────────────────
// Free, no key. Returns today's AI papers from HuggingFace.
async function hfPapersSearch(query: string, limit: string): Promise<string> {
  const cacheKey = `hf_papers:${query}:${limit}`;
  const cached = cacheGet(cacheKey);
  if (cached) return `[cached]\n${cached}`;

  try {
    const url = `https://huggingface.co/api/daily_papers`;
    const r = await fetch(url, {
      headers: { "User-Agent": TOOL_USER_AGENT },
      signal: AbortSignal.timeout(10_000),
    });
    if (!r.ok) return `HuggingFace papers API returned HTTP ${r.status}`;
    const data = (await r.json()) as {
      id: string;
      paper: {
        title: string;
        summary: string;
        authors: { name: string }[];
        upvotes?: number;
      };
    }[];
    if (!Array.isArray(data) || !data.length) return "No papers found today.";

    const q = query.trim().toLowerCase();
    const filtered = q
      ? data.filter((p) =>
          (p.paper.title + " " + (p.paper.summary ?? ""))
            .toLowerCase()
            .includes(q),
        )
      : data;

    const max = Math.min(parseInt(limit ?? "5", 10) || 5, 20);
    const text = (filtered.length ? filtered : data)
      .slice(0, max)
      .map(
        (p, i) =>
          `${i + 1}. ${p.paper.title}\n` +
          `   Authors: ${(p.paper.authors ?? [])
            .slice(0, 3)
            .map((a) => a.name)
            .join(", ")}\n` +
          `   ${(p.paper.summary ?? "").slice(0, 200)}…\n` +
          `   🤗 https://huggingface.co/papers/${p.id}`,
      )
      .join("\n\n");

    cachePut(cacheKey, text);
    return text;
  } catch {
    return "Could not reach HuggingFace papers API.";
  }
}

async function huggingFaceInspect(
  input: Record<string, string> = {},
): Promise<string> {
  const action = (input.action || "inspect").trim().toLowerCase();
  const rawRepoType = input.repo_type?.trim().toLowerCase();
  const repoType =
    rawRepoType === "dataset" || rawRepoType === "model"
      ? (rawRepoType as HuggingFaceRepoType)
      : undefined;
  try {
    const reference = normalizeHuggingFaceReference(
      input.reference ?? input.repo_id ?? "",
      repoType,
    );
    if (action === "inspect") {
      return formatHuggingFaceInspection(
        await inspectHuggingFaceRepository(reference),
      );
    }
    if (action === "read_file") {
      const file = await readHuggingFaceTextFile(reference, input.path ?? "");
      return [
        "Hugging Face bounded text-file read",
        `Source: ${file.url}`,
        `Repository: ${file.repoId}`,
        `Path: ${file.path}`,
        `Bytes: ${file.bytes}`,
        "",
        file.content || "File returned no readable text.",
      ].join("\n");
    }
    return "huggingface_inspect: action must be inspect or read_file.";
  } catch (error) {
    return error instanceof Error
      ? `huggingface_inspect: ${error.message}`
      : "huggingface_inspect failed.";
  }
}

// ── Open-Meteo weather tool ───────────────────────────────────────────────────
// Free, no API key required.
async function openMeteoWeather(
  lat: string,
  lon: string,
  location: string,
): Promise<string> {
  const latitude = parseFloat(lat) || 34.05;
  const longitude = parseFloat(lon) || -118.24;
  const loc = location || `${latitude},${longitude}`;
  const cacheKey = `open_meteo:${latitude}:${longitude}`;
  const cached = cacheGet(cacheKey);
  if (cached) return `[cached]\n${cached}`;

  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
      `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max` +
      `&forecast_days=3&timezone=auto`;
    const r = await fetch(url, { signal: AbortSignal.timeout(8_000) });
    if (!r.ok) return `Open-Meteo returned HTTP ${r.status}`;
    const d = (await r.json()) as {
      current: {
        temperature_2m: number;
        relative_humidity_2m: number;
        wind_speed_10m: number;
        weather_code: number;
      };
      daily: {
        time: string[];
        temperature_2m_max: number[];
        temperature_2m_min: number[];
        precipitation_sum: number[];
        wind_speed_10m_max: number[];
      };
      timezone: string;
    };
    const c = d.current;
    const days = d.daily;
    const forecast = days.time
      .slice(0, 3)
      .map(
        (date, i) =>
          `  ${date}: ${days.temperature_2m_max[i]}°C / ${days.temperature_2m_min[i]}°C, precip ${days.precipitation_sum[i]}mm, wind ${days.wind_speed_10m_max[i]} km/h`,
      )
      .join("\n");

    const text =
      `Weather for ${loc} (${d.timezone})\n` +
      `Current: ${c.temperature_2m}°C, humidity ${c.relative_humidity_2m}%, wind ${c.wind_speed_10m} km/h (WMO code ${c.weather_code})\n\n` +
      `3-day forecast:\n${forecast}`;
    cachePut(cacheKey, text, 30_000);
    return text;
  } catch {
    return "Could not reach Open-Meteo API.";
  }
}

// ── SEC EDGAR full-text search ────────────────────────────────────────────────
// Free public API — no key required.
async function secEdgarSearch(
  query: string,
  forms: string,
  limit: string,
): Promise<string> {
  const cacheKey = `sec_edgar:${query}:${forms}:${limit}`;
  const cached = cacheGet(cacheKey);
  if (cached) return `[cached]\n${cached}`;

  try {
    const q = encodeURIComponent(query);
    const fFilter = forms ? `&forms=${encodeURIComponent(forms)}` : "";
    const url = `https://efts.sec.gov/LATEST/search-index?q=%22${q}%22&dateRange=custom&startdt=2024-01-01&enddt=2026-12-31${fFilter}&hits.hits.total.value=1&hits.hits._source=file_date,display_names,form_type,period_of_report,entity_name,biz_location`;
    const r = await fetch(url, {
      headers: {
        "User-Agent": `${TOOL_USER_AGENT} research@aegis-vector.local`,
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!r.ok) return `SEC EDGAR returned HTTP ${r.status}`;
    const d = (await r.json()) as {
      hits?: {
        hits?: {
          _source: {
            entity_name?: string;
            form_type?: string;
            file_date?: string;
            display_names?: string;
          };
        }[];
      };
    };
    const hits = d.hits?.hits ?? [];
    if (!hits.length) return `No SEC filings found for "${query}".`;

    const max = Math.min(parseInt(limit ?? "8", 10) || 8, 20);
    const text = hits
      .slice(0, max)
      .map((h, i) => {
        const s = h._source;
        return `${i + 1}. ${s.entity_name ?? s.display_names ?? "Unknown"} — ${s.form_type ?? ""} (${s.file_date ?? ""})`;
      })
      .join("\n");

    cachePut(cacheKey, text);
    return `SEC EDGAR filings for "${query}":\n${text}\nFull search: https://efts.sec.gov/LATEST/search-index?q=${q}`;
  } catch {
    return "Could not reach SEC EDGAR full-text search API.";
  }
}

// ── Lesson logger (OpenClaw autoresearch pattern) ─────────────────────────────
// Agents propose lessons after corrections; human reviews on next session open.
const LESSONS_FILE = path.join(PROJECT_ROOT, "docs", "STANDARDS.md");

async function logLesson(agent: string, lesson: string): Promise<string> {
  if (!lesson.trim()) return "log_lesson: lesson text is required.";
  const date = new Date().toISOString().slice(0, 10);
  const entry = `\n- [PROPOSED — ${agent.toUpperCase()} — ${date}] ${lesson.trim()}`;
  try {
    await fs.appendFile(LESSONS_FILE, entry, "utf-8");
    return `Lesson logged for review: "${lesson.trim()}"`;
  } catch {
    return "Could not write to docs/STANDARDS.md — check file permissions.";
  }
}

async function n8nRunWorkflow(
  workflowId: string,
  payload: Record<string, unknown>,
): Promise<ToolResult> {
  if (!workflowId) {
    const result = "n8n_run_workflow: workflowId is required.";
    return withToolResult(result, {
      externalTool: buildExternalToolResultEnvelope({
        toolId: "n8n_run_workflow",
        status: "error",
        result,
      }),
    });
  }
  const result = await runToolInIsolation("n8n_run_workflow", {
    workflow_id: workflowId,
    payload,
  });
  return withToolResult(result, {
    externalTool: buildExternalToolResultEnvelope({
      toolId: "n8n_run_workflow",
      status: "ok",
      result,
    }),
  });
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const rateLimitConfig = {
    bucket: "api-tools",
    windowMs: 60_000,
    maxAttempts: 45,
    includeBearerToken: true,
  } as const;
  const rateLimit = checkRateLimit(req, rateLimitConfig);
  if (!rateLimit.ok) {
    const response = NextResponse.json(
      {
        result: "Tool execution rate limited.",
        error: "Too many tool requests. Slow down and try again shortly.",
      },
      { status: 429 },
    );
    applyRateLimitHeaders(response, rateLimitConfig, rateLimit.retryAfterSec);
    return response;
  }

  let toolCapability: ReturnType<typeof getToolCapabilityClass> | null = null;
  let protectedActionMeta: ProtectedActionDescriptor | null = null;
  let toolIsolationMeta: ToolIsolationDescriptor | null = null;

  try {
    const runId = req.headers.get("x-nexus-run-id") ?? "anon";
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json(
        {
          result: "Tool execution blocked.",
          error: "Invalid or empty JSON body.",
        },
        { status: 400 },
      );
    }
    const parsedBody = parseToolsPostBody(rawBody);
    if (!parsedBody.ok) {
      return NextResponse.json(
        {
          result: "Tool execution blocked.",
          error: parsedBody.error,
        },
        { status: 400 },
      );
    }
    const { tool, input } = parsedBody.data;

    const capability = getToolCapabilityClass(tool);
    toolCapability = capability;
    toolIsolationMeta = resolveToolIsolationDescriptor(tool, capability);

    if (capability === "networked" || requiresToolStepUp(capability)) {
      const trustContext = await readProtectedActionContext(req);
      const protectedAction = getToolProtectedAction(capability);
      protectedActionMeta = resolveProtectedActionDescriptor(
        protectedAction,
        trustContext,
        { capability },
      );
      const capabilityStatus = protectedActionMeta.status;

      if (capability === "networked" && capabilityStatus !== "ready") {
        const blockedReason =
          resolveProtectedActionBlockedReason(capabilityStatus) ??
          "blocked_policy";
        const response = NextResponse.json(
          {
            result: "Tool execution blocked.",
            error: buildToolBlockedMessage(capabilityStatus),
            protectedAction: {
              action: protectedAction,
              capability,
              status: capabilityStatus,
              blockedReason,
            },
          },
          { status: 403 },
        );
        applyProtectedActionHeaders(response, {
          action: protectedAction,
          capability,
          status: capabilityStatus,
          blockedReason,
        });
        applyRateLimitHeaders(response, rateLimitConfig);
        return response;
      }

      if (requiresToolStepUp(capability)) {
        if (capabilityStatus === "revalidate") {
          const response = buildStepUpRequiredResponse(
            trustContext.sessionAuthenticated,
            {
              action: protectedAction,
              capability,
            },
          );
          response.headers.set("X-Tool-Capability", capability);
          applyRateLimitHeaders(response, rateLimitConfig);
          return response;
        }

        if (capabilityStatus !== "ready") {
          const blockedReason =
            resolveProtectedActionBlockedReason(capabilityStatus) ??
            "blocked_policy";
          const response = NextResponse.json(
            {
              result: "Tool execution blocked.",
              error: buildToolBlockedMessage(capabilityStatus),
              protectedAction: {
                action: protectedAction,
                capability,
                status: capabilityStatus,
                blockedReason,
              },
            },
            { status: 403 },
          );
          applyProtectedActionHeaders(response, {
            action: protectedAction,
            capability,
            status: capabilityStatus,
            blockedReason,
          });
          applyRateLimitHeaders(response, rateLimitConfig);
          return response;
        }
      }
    }

    if (
      toolIsolationMeta.requirement === "sandbox_required" &&
      toolIsolationMeta.status !== "ready"
    ) {
      const response = NextResponse.json(
        {
          result: "Tool execution blocked.",
          error: buildToolIsolationBlockedMessage(toolIsolationMeta),
          ...(protectedActionMeta
            ? { protectedAction: protectedActionMeta }
            : {}),
          toolIsolation: toolIsolationMeta,
        },
        { status: 403 },
      );
      if (protectedActionMeta) {
        applyProtectedActionHeaders(response, protectedActionMeta);
      }
      applyToolIsolationHeaders(response, toolIsolationMeta);
      applyRateLimitHeaders(response, rateLimitConfig);
      return response;
    }

    let result = "";
    let meta: ToolResponseMeta = {};

    switch (tool) {
      case "web_search":
        result = await webSearch(input.query ?? "");
        break;
      case "fetch_url":
        result = await fetchUrl(input.url ?? "");
        break;
      case "write_file":
        result = await writeFile(
          input.filename ?? "output.txt",
          input.content ?? "",
        );
        break;
      case "read_file":
        result = await readFile(input.filename ?? "");
        break;
      case "list_files":
        result = await listFiles();
        break;
      case "calculate":
        result = await calculate(input.expression ?? "");
        break;
      case "remember":
        result = await rememberNote(input.note ?? "");
        break;
      case "recall":
        result = await recallNotes();
        break;
      case "ask_max":
        result = await askMax(input.message ?? "");
        break;
      case "delegate_specialist":
        result = await delegateSpecialist(input, runId);
        break;
      case "list_design_skills":
        result = formatDesignSkillList({
          query: input.query ?? "",
          sourceCategory: input.category ?? "",
          family: input.family ?? "",
          availability: input.availability ?? "",
          limit: Number(input.limit),
        });
        break;
      case "resolve_design_skill":
        result = formatDesignSkillContract(input.skill ?? "");
        break;
      case "list_go_to_market_skills":
        result = formatGoToMarketSkillList({
          query: input.query ?? "",
          sourceCategory: input.category ?? "",
          family: input.family ?? "",
          availability: input.availability ?? "",
          limit: Number(input.limit),
        });
        break;
      case "resolve_go_to_market_skill":
        result = formatGoToMarketSkillContract(input.skill ?? "");
        break;
      case "read_project_file":
        {
          const toolResult = await readProjectFile(
            input.path ?? "",
            runId,
            input.focus ?? "",
            input.chunk ?? "",
          );
          result = toolResult.result;
          meta = toolResult.meta;
        }
        break;
      case "list_project_files":
        {
          const toolResult = await listProjectFiles(
            input.directory ?? ".",
            runId,
          );
          result = toolResult.result;
          meta = toolResult.meta;
        }
        break;
      case "patch_project_file":
        // Evict any cached reads for this file path before patching
        cacheEvict(
          `read_project_file:${normalizeProjectPathKey(input.path ?? "")}`,
        );
        cacheEvict("list_project_files:");
        result = await patchProjectFile(
          input.path ?? "",
          input.old_string ?? "",
          input.new_string ?? "",
        );
        break;
      case "create_project_file":
        cacheEvict(
          `read_project_file:${normalizeProjectPathKey(input.path ?? "")}`,
        );
        cacheEvict("list_project_files:");
        result = await createProjectFile(input.path ?? "", input.content ?? "");
        break;
      case "reddit_search":
        result = await redditSearch(
          input.query ?? "",
          input.subreddit ?? "",
          input.limit ?? "10",
        );
        break;
      case "github_trending":
        result = await githubTrending(
          input.language ?? "",
          input.since ?? "daily",
        );
        break;
      case "analyze_repo":
        {
          const toolResult = await analyzeRepo(
            input.owner_slash_repo ?? input.repo ?? "",
          );
          result = toolResult.result;
          meta = toolResult.meta;
        }
        break;
      case "compare_repos":
        {
          const rawRepoRefs = (input as { repo_refs?: unknown }).repo_refs;
          const parsedRepoRefs = Array.isArray(rawRepoRefs)
            ? rawRepoRefs.filter(
                (value): value is string => typeof value === "string",
              )
            : typeof rawRepoRefs === "string"
              ? rawRepoRefs
                  .split(/\s+\bvs\b\s+/i)
                  .map((value) => value.trim())
                  .filter(Boolean)
              : [];
          const toolResult = await compareRepos(
            parsedRepoRefs,
            resolveInternalServiceOrigin(),
          );
          result = toolResult.result;
          meta = toolResult.meta;
        }
        break;
      case "assimilate_repo":
        {
          const toolResult = await assimilateRepo(
            input.owner_slash_repo ?? input.repo ?? "",
            resolveInternalServiceOrigin(),
          );
          result = toolResult.result;
          meta = toolResult.meta;
        }
        break;
      case "deep_research":
        {
          const toolResult = await deepResearch(
            input.topic ?? input.question ?? "",
            resolveInternalServiceOrigin(),
          );
          result = toolResult.result;
          meta = toolResult.meta;
        }
        break;
      case "feynman_research":
        {
          const toolResult = await feynmanResearch(
            input.workflow ?? "deepresearch",
            input.topic ?? input.question ?? input.artifact ?? "",
            resolveInternalServiceOrigin(),
            input.experiment_intake_declaration ?? "",
            input.experiment_provenance_json ?? "",
          );
          result = toolResult.result;
          meta = toolResult.meta;
        }
        break;
      case "feynman_paper_rank":
        {
          const toolResult = feynmanPaperRank(input);
          result = toolResult.result;
          meta = toolResult.meta;
        }
        break;
      case "feynman_paper_inspect":
        {
          const toolResult = await feynmanPaperInspect(input);
          result = toolResult.result;
          meta = toolResult.meta;
        }
        break;
      case "feynman_paper_ask":
        {
          const toolResult = await feynmanPaperAsk(
            input,
            resolveInternalServiceOrigin(),
          );
          result = toolResult.result;
          meta = toolResult.meta;
        }
        break;
      case "feynman_paper_code_audit":
        {
          const toolResult = await feynmanPaperCodeAudit(
            input,
            resolveInternalServiceOrigin(),
          );
          result = toolResult.result;
          meta = toolResult.meta;
        }
        break;
      case "feynman_outputs":
        {
          const toolResult = await feynmanOutputs(input);
          result = toolResult.result;
          meta = toolResult.meta;
        }
        break;
      case "rss_fetch":
        result = await rssFetch(input.url ?? "", input.limit ?? "10");
        break;
      case "hf_papers_search":
        result = await hfPapersSearch(input.query ?? "", input.limit ?? "5");
        break;
      case "huggingface_inspect":
        result = await huggingFaceInspect(input);
        break;
      case "open_meteo_weather":
        result = await openMeteoWeather(
          input.lat ?? "",
          input.lon ?? "",
          input.location ?? "",
        );
        break;
      case "sec_edgar_search":
        result = await secEdgarSearch(
          input.query ?? "",
          input.forms ?? "",
          input.limit ?? "8",
        );
        break;
      case "log_lesson":
        result = await logLesson(input.agent ?? "AGENT", input.lesson ?? "");
        break;
      case "n8n_run_workflow": {
        const payload = input.payload
          ? (JSON.parse(input.payload) as Record<string, unknown>)
          : {};
        const toolResult = await n8nRunWorkflow(
          input.workflow_id ?? "",
          payload,
        );
        result = toolResult.result;
        meta = toolResult.meta;
        break;
      }
      default:
        result = `Unknown tool: ${tool}`;
    }

    const response = NextResponse.json({
      result,
      ...(protectedActionMeta ? { protectedAction: protectedActionMeta } : {}),
      ...(toolIsolationMeta ? { toolIsolation: toolIsolationMeta } : {}),
      ...(meta.externalTool ? { externalTool: meta.externalTool } : {}),
    });
    response.headers.set("X-Tool-Capability", capability);
    if (protectedActionMeta) {
      applyProtectedActionHeaders(response, protectedActionMeta);
    }
    if (toolIsolationMeta) {
      applyToolIsolationHeaders(response, toolIsolationMeta);
    }
    if (meta.cacheHit) response.headers.set("X-Tool-Cache", "hit");
    if (meta.duplicateRead) {
      response.headers.set("X-Tool-Duplicate-Read", "1");
    }
    applyRateLimitHeaders(response, rateLimitConfig);
    return response;
  } catch (err) {
    const response = NextResponse.json(
      {
        result: "Tool execution error.",
        error: err instanceof Error ? err.message : "Unknown error",
        ...(protectedActionMeta
          ? {
              protectedAction: {
                action: protectedActionMeta.action,
                capability: protectedActionMeta.capability,
                status: "blocked_policy" as const,
                blockedReason: "tool_error",
              },
            }
          : {}),
        ...(toolIsolationMeta ? { toolIsolation: toolIsolationMeta } : {}),
      },
      { status: 500 },
    );
    if (toolCapability) {
      response.headers.set("X-Tool-Capability", toolCapability);
    }
    if (protectedActionMeta) {
      applyProtectedActionHeaders(response, {
        action: protectedActionMeta.action,
        capability: protectedActionMeta.capability,
        status: "blocked_policy",
        blockedReason: "tool_error",
      });
    }
    if (toolIsolationMeta) {
      applyToolIsolationHeaders(response, toolIsolationMeta);
    }
    applyRateLimitHeaders(response, rateLimitConfig);
    return response;
  }
}
