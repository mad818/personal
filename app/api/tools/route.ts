// ── api/tools ───────────────────────────────────────────────
// Tools API: dynamic tool discovery and execution framework.

import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs/promises";
import * as path from "path";

// ── Workspace root (files the agent can read/write) ───────────────────────────
const WORKSPACE =
  process.env.AGENT_WORKSPACE ?? path.join(process.cwd(), "agent-workspace");

async function ensureWorkspace() {
  await fs.mkdir(WORKSPACE, { recursive: true });
}

// ── Tool handlers ─────────────────────────────────────────────────────────────

async function webSearch(query: string): Promise<string> {
  const braveKey = process.env.BRAVE_SEARCH_KEY ?? "";

  // ── Brave Search (preferred, much better quality) ──────────────────────────
  if (braveKey) {
    try {
      const q = encodeURIComponent(query);
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
      // fall through to GDELT
    }
  }

  // ── GDELT fallback (no key required) ───────────────────────────────────────
  try {
    const q = encodeURIComponent(query);
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
    const r = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; NexusAI/1.0)" },
      signal: AbortSignal.timeout(10000),
    });
    const html = await r.text();
    // Strip tags, collapse whitespace
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim()
      .slice(0, 4000);
    return text || "Page returned no readable text.";
  } catch {
    return "Could not fetch that URL.";
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
//  - Max read: 60,000 chars (~1,500 lines)

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
  const full = path.join(PROJECT_ROOT, cleaned);
  return { safe: full, blocked: null };
}

async function readProjectFile(relPath: string): Promise<string> {
  const { safe, blocked } = resolveProjectPath(relPath);
  if (blocked) return `Blocked: ${blocked}`;
  const ext = path.extname(relPath).toLowerCase();
  if (!READABLE_EXTS.has(ext))
    return `Cannot read file type "${ext}". Allowed: ${Array.from(READABLE_EXTS).join(", ")}`;
  try {
    const content = await fs.readFile(safe, "utf-8");
    const preview = content.slice(0, 60_000);
    const truncated =
      content.length > 60_000
        ? `\n\n[Truncated — showing first 60,000 of ${content.length} chars]`
        : "";
    return preview + truncated;
  } catch {
    return `File not found: ${relPath}`;
  }
}

async function listProjectFiles(relDir: string): Promise<string> {
  const cleanDir = relDir.replace(/^[/\\]+/, "").replace(/\\/g, "/") || ".";
  const { safe, blocked } = resolveProjectPath(
    cleanDir === "." ? "_root_sentinel" : cleanDir,
  );
  // For root listing, bypass the sentinel trick
  const targetPath = cleanDir === "." ? PROJECT_ROOT : blocked ? null : safe;

  if (!targetPath) return `Blocked: ${blocked}`;

  try {
    const entries = await fs.readdir(targetPath, { withFileTypes: true });
    const lines = entries
      .filter(
        (e) =>
          !BLOCKED_PREFIXES.some(
            (b) => e.name === b || e.name.startsWith(".env"),
          ),
      )
      .map((e) => `${e.isDirectory() ? "📁" : "📄"} ${e.name}`);
    return lines.length ? lines.join("\n") : "Directory is empty.";
  } catch {
    return `Directory not found: ${relDir}`;
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

async function rssFetch(feedUrl: string, limit: string): Promise<string> {
  const params: Record<string, string> = { url: feedUrl };
  if (limit) params.limit = limit;
  return agentReachProxy("/rss", params);
}

// ── Session-scoped read cache (60 s TTL) ─────────────────────────────────────
// Caches fetch responses in memory so repeated reads in the same session don't
// hit external APIs again. Evicted when a patch_project_file write occurs.
interface CacheEntry {
  value: string;
  expiresAt: number;
}
const readCache = new Map<string, CacheEntry>();

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

// ── HuggingFace daily papers search ──────────────────────────────────────────
// Free, no key. Returns today's AI papers from HuggingFace.
async function hfPapersSearch(query: string, limit: string): Promise<string> {
  const cacheKey = `hf_papers:${query}:${limit}`;
  const cached = cacheGet(cacheKey);
  if (cached) return `[cached]\n${cached}`;

  try {
    const url = `https://huggingface.co/api/daily_papers`;
    const r = await fetch(url, {
      headers: { "User-Agent": "NexusPrime/1.0" },
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
      headers: { "User-Agent": "NexusPrime research@nexusprime.local" },
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
const LESSONS_FILE = path.join(PROJECT_ROOT, "tasks", "lessons.md");

async function logLesson(agent: string, lesson: string): Promise<string> {
  if (!lesson.trim()) return "log_lesson: lesson text is required.";
  const date = new Date().toISOString().slice(0, 10);
  const entry = `\n- [PROPOSED — ${agent.toUpperCase()} — ${date}] ${lesson.trim()}`;
  try {
    await fs.appendFile(LESSONS_FILE, entry, "utf-8");
    return `Lesson logged for review: "${lesson.trim()}"`;
  } catch {
    return "Could not write to tasks/lessons.md — check file permissions.";
  }
}

// ── n8n workflow trigger ──────────────────────────────────────────────────────
const N8N_BASE_URL = process.env.N8N_BASE_URL ?? "http://localhost:5678";
const N8N_API_KEY = process.env.N8N_API_KEY ?? "";

async function n8nRunWorkflow(
  workflowId: string,
  payload: Record<string, unknown>,
): Promise<string> {
  if (!workflowId) return "n8n_run_workflow: workflowId is required.";
  if (!N8N_API_KEY) {
    return (
      "n8n is not configured. Add N8N_API_KEY and N8N_BASE_URL to your .env.local, " +
      "then start n8n. See docs/deployment/n8n.md."
    );
  }
  try {
    // Prefer webhook execution (instant); fall back to API execution endpoint
    const url = `${N8N_BASE_URL}/api/v1/workflows/${encodeURIComponent(workflowId)}/execute`;
    const r = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-N8N-API-KEY": N8N_API_KEY,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
    });
    if (!r.ok) {
      return `n8n returned HTTP ${r.status}. Make sure n8n is running and the workflow ID is correct.`;
    }
    const d = await r.json();
    const execId = d?.data?.executionId ?? d?.executionId ?? "unknown";
    return `Workflow ${workflowId} triggered — execution ID: ${execId}`;
  } catch {
    return "Could not reach n8n. Make sure it is running (see docs/deployment/n8n.md).";
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { tool, input } = (await req.json()) as {
      tool: string;
      input: Record<string, string>;
    };

    let result = "";

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
      case "read_project_file":
        result = await readProjectFile(input.path ?? "");
        break;
      case "list_project_files":
        result = await listProjectFiles(input.directory ?? ".");
        break;
      case "patch_project_file":
        // Evict any cached reads for this file path before patching
        cacheEvict(`read_project_file:${input.path ?? ""}`);
        result = await patchProjectFile(
          input.path ?? "",
          input.old_string ?? "",
          input.new_string ?? "",
        );
        break;
      case "create_project_file":
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
      case "rss_fetch":
        result = await rssFetch(input.url ?? "", input.limit ?? "10");
        break;
      case "hf_papers_search":
        result = await hfPapersSearch(input.query ?? "", input.limit ?? "5");
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
        result = await n8nRunWorkflow(input.workflow_id ?? "", payload);
        break;
      }
      default:
        result = `Unknown tool: ${tool}`;
    }

    return NextResponse.json({ result });
  } catch (err) {
    return NextResponse.json(
      {
        result: "Tool execution error.",
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
