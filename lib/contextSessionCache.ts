import type { AgentStep } from "@/lib/agent";

export const CONTEXT_SESSION_READ_TTL_MS = 5 * 60 * 1000;

interface SessionReadEntry {
  path: string;
  readAt: number;
}

const sessionReads = new Map<string, SessionReadEntry>();

export function extractProjectReadPathsFromSteps(steps: AgentStep[]): string[] {
  const paths: string[] = [];
  for (const step of steps) {
    if (step.type !== "tool_call" || step.tool !== "read_project_file")
      continue;
    try {
      const parsed = JSON.parse(step.content) as { path?: string };
      if (typeof parsed.path === "string" && parsed.path.trim()) {
        paths.push(parsed.path.trim());
      }
    } catch {
      /* ignore malformed tool payloads */
    }
  }
  return Array.from(new Set(paths));
}

export function recordContextSessionRead(
  path: string,
  readAt = Date.now(),
): void {
  const normalized = path
    .replace(/^[/\\]+/, "")
    .replace(/\\/g, "/")
    .trim();
  if (!normalized) return;
  sessionReads.set(normalized, { path: normalized, readAt });
  pruneContextSessionReads(readAt);
}

export function recordContextSessionReads(
  paths: string[],
  readAt = Date.now(),
): void {
  for (const path of paths) {
    recordContextSessionRead(path, readAt);
  }
}

function pruneContextSessionReads(now = Date.now()): void {
  for (const [key, entry] of Array.from(sessionReads.entries())) {
    if (now - entry.readAt > CONTEXT_SESSION_READ_TTL_MS) {
      sessionReads.delete(key);
    }
  }
  if (sessionReads.size <= 40) return;
  const sorted = Array.from(sessionReads.values()).sort(
    (a, b) => a.readAt - b.readAt,
  );
  for (const entry of sorted.slice(0, sessionReads.size - 40)) {
    sessionReads.delete(entry.path);
  }
}

export function getRecentContextSessionReads(
  max = 8,
  now = Date.now(),
): string[] {
  pruneContextSessionReads(now);
  return Array.from(sessionReads.values())
    .filter((entry) => now - entry.readAt <= CONTEXT_SESSION_READ_TTL_MS)
    .sort((a, b) => b.readAt - a.readAt)
    .slice(0, max)
    .map((entry) => entry.path);
}

export function buildContextSessionCacheBlock(paths?: string[]): string {
  const recent = paths?.length ? paths : getRecentContextSessionReads();
  if (!recent.length) return "";
  return (
    `\n[CONTEXT SESSION CACHE — recently read project files]\n` +
    `${recent.map((path, index) => `${index + 1}. ${path}`).join("\n")}\n` +
    `[END CONTEXT SESSION CACHE]\n`
  );
}

export function shouldSuppressContextSection(
  section: string,
  queryText: string,
  recentPaths: string[],
): boolean {
  if (!recentPaths.length) return false;
  const normalizedQuery = queryText.trim().toLowerCase();
  const inCodeSession = recentPaths.some(
    (path) =>
      path.startsWith("lib/") ||
      path.startsWith("components/") ||
      path.startsWith("app/") ||
      path.startsWith("store/"),
  );
  if (!inCodeSession) return false;

  const wantsMarket =
    normalizedQuery.includes("market") ||
    normalizedQuery.includes("btc") ||
    normalizedQuery.includes("eth") ||
    normalizedQuery.includes("crypto") ||
    normalizedQuery.includes("price");
  const wantsThreat =
    normalizedQuery.includes("cve") ||
    normalizedQuery.includes("security") ||
    normalizedQuery.includes("threat") ||
    normalizedQuery.includes("vulnerability");

  if ((section === "market" || section === "sentiment") && !wantsMarket) {
    return true;
  }
  if (section === "cves" && !wantsThreat) {
    return true;
  }
  return false;
}
