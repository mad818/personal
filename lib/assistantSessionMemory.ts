import { normalizePreparedWorkspaceTarget } from "@/lib/assistantSessionRegistry";
import { normalizeSessionHref } from "@/lib/exactSessionLinks";
import type { AssistantCapabilityId } from "@/lib/assistantCapabilityRegistry";
import type {
  HQAssistantIntent,
  PreparedWorkspaceTarget,
} from "@/components/home/office/types";

export type UnfinishedSessionCompletionState = "prepared" | "active" | "paused";
export type UnfinishedSessionArtifactClass =
  | "generic"
  | "repo_work"
  | "archive"
  | "study"
  | "memory_palace"
  | "reverse_engineering"
  | "second_brain"
  | "scheduler"
  | "live_context";

export interface UnfinishedSessionMemory extends PreparedWorkspaceTarget {
  intent: HQAssistantIntent;
  sourceQuery: string;
  lastUsedAt: number;
  confidence: number;
  capability?: AssistantCapabilityId | null;
  artifactClass?: UnfinishedSessionArtifactClass;
  continuationValue: number;
  completionState: UnfinishedSessionCompletionState;
}

interface AssistantSessionMatchOptions {
  input: string;
  intent: HQAssistantIntent;
  routeHint?: string | null;
  capability?: AssistantCapabilityId | null;
}

interface RememberSessionMeta {
  intent: HQAssistantIntent;
  sourceQuery: string;
  confidence?: number;
  capability?: AssistantCapabilityId | null;
  artifactClass?: UnfinishedSessionArtifactClass;
  continuationValue?: number;
  completionState?: UnfinishedSessionCompletionState;
}

const MAX_UNFINISHED_SESSIONS = 8;
const UNFINISHED_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 3;
const RE_HIGH_CONFIDENCE_THRESHOLD = 78;

const REVERSE_ENGINEERING_RE =
  /\b(?:reverse engineering|reverse-engineering|binary|ghidra|strings|entropy|ioc|malware|sample)\b/i;
const SECOND_BRAIN_RE =
  /\b(?:second brain|obsidian|heartbeat|moc|map of content|knowledge pack)\b/i;
const SCHEDULER_RE =
  /\b(?:scheduler|scheduled|cron|automation|job|jobs)\b/i;
const MEMORY_RE =
  /\b(?:memory|vault|archive|recall|remember|compiled page|citation|citations|sources?)\b/i;
const STUDY_RE =
  /\b(?:teach|explain|review|quiz|practice|study|learning|lesson)\b/i;
const REPO_RE =
  /\b(?:repo|repository|codebase|component|hook|api route|typescript|next\.?js|refactor|blast radius)\b/i;
const LIVE_RE =
  /\b(?:latest|current|today|recent|news|headline|price|prices|markets?|btc|eth|cve|threat)\b/i;

function clampConfidence(value: number | null | undefined) {
  if (!Number.isFinite(value)) return 72;
  return Math.max(0, Math.min(100, Math.round(value ?? 72)));
}

function clampContinuationValue(value: number | null | undefined) {
  if (!Number.isFinite(value)) return 72;
  return Math.max(0, Math.min(100, Math.round(value ?? 72)));
}

function normalizeCompletionState(
  value: string | null | undefined,
): UnfinishedSessionCompletionState {
  switch (value) {
    case "active":
    case "paused":
    case "prepared":
      return value;
    default:
      return "prepared";
  }
}

function getRoutePath(href: string | null | undefined) {
  if (!href) return null;
  return normalizeSessionHref(href).split("?")[0] ?? href;
}

function getRecencyBonus(ageMs: number) {
  if (ageMs < 1000 * 60 * 20) return 18;
  if (ageMs < 1000 * 60 * 60 * 3) return 14;
  if (ageMs < 1000 * 60 * 60 * 18) return 9;
  if (ageMs < UNFINISHED_SESSION_TTL_MS) return 4;
  return -100;
}

function getStateBonus(state: UnfinishedSessionCompletionState) {
  switch (state) {
    case "active":
      return 12;
    case "prepared":
      return 6;
    case "paused":
      return 2;
    default:
      return 0;
  }
}

function normalizeOneSession(
  session: Partial<UnfinishedSessionMemory> | null | undefined,
): UnfinishedSessionMemory | null {
  if (!session?.href) return null;
  const normalizedTarget = normalizePreparedWorkspaceTarget({
    href: session.href,
    label: session.label ?? "Resume workspace",
    detail:
      session.detail ??
      "Prepared the most relevant exact session so the previous flow can continue without a broad route reset.",
  });
  if (!normalizedTarget) return null;
  const sourceQuery = session.sourceQuery?.trim() ?? "";
  return {
    ...normalizedTarget,
    intent: session.intent ?? "conversation",
    sourceQuery,
    lastUsedAt:
      typeof session.lastUsedAt === "number" && Number.isFinite(session.lastUsedAt)
        ? session.lastUsedAt
        : Date.now(),
    confidence: clampConfidence(session.confidence),
    capability: session.capability ?? null,
    artifactClass: session.artifactClass ?? "generic",
    continuationValue: clampContinuationValue(session.continuationValue),
    completionState: normalizeCompletionState(session.completionState),
  };
}

export function pruneUnfinishedSessions(
  sessions: Partial<UnfinishedSessionMemory>[] | null | undefined,
) {
  const now = Date.now();
  const normalized = (sessions ?? [])
    .map((session) => normalizeOneSession(session))
    .filter((session): session is UnfinishedSessionMemory => Boolean(session))
    .filter((session) => now - session.lastUsedAt < UNFINISHED_SESSION_TTL_MS);

  const deduped = new Map<string, UnfinishedSessionMemory>();
  for (const session of normalized) {
    const key = normalizeSessionHref(session.href);
    const current = deduped.get(key);
    if (
      !current ||
      session.lastUsedAt > current.lastUsedAt ||
      session.confidence > current.confidence
    ) {
      deduped.set(key, session);
    }
  }

  return Array.from(deduped.values())
    .sort((a, b) => {
      const delta = b.lastUsedAt - a.lastUsedAt;
      if (delta !== 0) return delta;
      return b.confidence - a.confidence;
    })
    .slice(0, MAX_UNFINISHED_SESSIONS);
}

export function rememberUnfinishedSession(
  sessions: Partial<UnfinishedSessionMemory>[] | null | undefined,
  target: PreparedWorkspaceTarget | null | undefined,
  meta: RememberSessionMeta,
) {
  if (!target || !meta.sourceQuery?.trim()) {
    return pruneUnfinishedSessions(sessions);
  }

  const baseTarget = normalizePreparedWorkspaceTarget(target);
  if (!baseTarget) {
    return pruneUnfinishedSessions(sessions);
  }

  const next = pruneUnfinishedSessions(sessions).filter(
    (session) => normalizeSessionHref(session.href) !== normalizeSessionHref(baseTarget.href),
  );

  next.unshift({
    ...baseTarget,
    intent: meta.intent,
    sourceQuery: meta.sourceQuery.trim(),
    lastUsedAt: Date.now(),
    confidence: clampConfidence(meta.confidence),
    capability: meta.capability ?? null,
    artifactClass: meta.artifactClass ?? "generic",
    continuationValue: clampContinuationValue(meta.continuationValue),
    completionState: meta.completionState ?? "prepared",
  });

  return pruneUnfinishedSessions(next);
}

export function touchUnfinishedSession(
  sessions: Partial<UnfinishedSessionMemory>[] | null | undefined,
  href: string,
  completionState: UnfinishedSessionCompletionState = "active",
) {
  return pruneUnfinishedSessions(sessions).map((session) =>
    normalizeSessionHref(session.href) === normalizeSessionHref(href)
      ? {
          ...session,
          lastUsedAt: Date.now(),
          completionState,
        }
      : session,
  );
}

function scoreUnfinishedSession(
  session: UnfinishedSessionMemory,
  options: AssistantSessionMatchOptions,
) {
  const normalizedRoutePath = getRoutePath(options.routeHint);
  const sessionRoutePath = getRoutePath(session.href);
  const lowerInput = options.input.toLowerCase();
  const ageMs = Math.max(0, Date.now() - session.lastUsedAt);

  let score = session.confidence;
  score += Math.round(session.continuationValue * 0.24);
  score += getRecencyBonus(ageMs);
  score += getStateBonus(session.completionState);

  if (normalizedRoutePath && sessionRoutePath === normalizedRoutePath) {
    score += 18;
  }
  if (session.intent === options.intent) {
    score += 14;
  }
  if (options.capability && session.capability === options.capability) {
    score += 18;
  }

  if (REVERSE_ENGINEERING_RE.test(lowerInput)) {
    if (
      session.href.includes("recon-binary") ||
      session.href.includes("compiledFilter=reverse-engineering") ||
      session.artifactClass === "reverse_engineering"
    ) {
      score += 24;
    }
  }

  if (
    SECOND_BRAIN_RE.test(lowerInput) &&
    (session.href.includes("vault-export-second-brain") ||
      session.artifactClass === "second_brain")
  ) {
    score += 22;
  }

  if (
    SCHEDULER_RE.test(lowerInput) &&
    (session.href.includes("hq-scheduler") || session.artifactClass === "scheduler")
  ) {
    score += 18;
  }

  if (
    MEMORY_RE.test(lowerInput) &&
    (session.href.includes("memory-spine") ||
      session.artifactClass === "archive" ||
      session.artifactClass === "memory_palace")
  ) {
    score += 16;
  }

  if (
    STUDY_RE.test(lowerInput) &&
    (session.href.includes("/skills") ||
      session.href.includes("vault-memory-") ||
      session.artifactClass === "study")
  ) {
    score += 20;
  }

  if (
    REPO_RE.test(lowerInput) &&
    (session.href.includes("/resources?view=impact") ||
      session.artifactClass === "repo_work")
  ) {
    score += 18;
  }

  if (LIVE_RE.test(lowerInput) && session.artifactClass === "live_context") {
    score += 14;
  }

  return score;
}

export function findStrongestUnfinishedSession(
  sessions: Partial<UnfinishedSessionMemory>[] | null | undefined,
  options: AssistantSessionMatchOptions,
) {
  const ranked = pruneUnfinishedSessions(sessions)
    .map((session) => ({
      session,
      score: scoreUnfinishedSession(session, options),
    }))
    .sort((a, b) => b.score - a.score);

  const strongest = ranked[0];
  if (!strongest || strongest.score < RE_HIGH_CONFIDENCE_THRESHOLD) {
    return null;
  }
  return strongest.session;
}

export function findStrongestUnfinishedSessionForPath(
  sessions: Partial<UnfinishedSessionMemory>[] | null | undefined,
  pathname: string | null | undefined,
) {
  if (!pathname) return null;
  const normalizedPath = getRoutePath(pathname);
  const ranked = pruneUnfinishedSessions(sessions)
    .filter((session) => getRoutePath(session.href) === normalizedPath)
    .map((session) => ({
      session,
      score:
        session.confidence +
        Math.round(session.continuationValue * 0.2) +
        getRecencyBonus(Math.max(0, Date.now() - session.lastUsedAt)) +
        getStateBonus(session.completionState),
    }))
    .sort((a, b) => b.score - a.score);

  const strongest = ranked[0];
  if (!strongest || strongest.score < 70) {
    return null;
  }
  return strongest.session;
}

export function findStrongestUnfinishedSessionForRoute(
  sessions: Partial<UnfinishedSessionMemory>[] | null | undefined,
  opts: {
    pathname: string | null | undefined;
    capability?: AssistantCapabilityId | null;
  },
) {
  if (!opts.pathname) return null;
  const normalizedPath = getRoutePath(opts.pathname);
  const ranked = pruneUnfinishedSessions(sessions)
    .filter((session) => getRoutePath(session.href) === normalizedPath)
    .map((session) => ({
      session,
      score:
        session.confidence +
        Math.round(session.continuationValue * 0.2) +
        getRecencyBonus(Math.max(0, Date.now() - session.lastUsedAt)) +
        getStateBonus(session.completionState) +
        (opts.capability && session.capability === opts.capability ? 18 : 0),
    }))
    .sort((a, b) => b.score - a.score);

  const strongest = ranked[0];
  if (!strongest || strongest.score < 70) {
    return null;
  }
  return strongest.session;
}
