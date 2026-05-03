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

export type CorrectionMemoryStatus = "proposed" | "approved" | "archived";
export type CorrectionMemorySensitivity = "safe" | "internal" | "restricted";

export interface CorrectionMemoryScope {
  routeSurface?: string | null;
  agent?: string | null;
  filePathPrefixes: string[];
  taskType?: string | null;
  capability?: AssistantCapabilityId | null;
}

export interface CorrectionMemoryContent {
  rule: string;
  preferredBehavior: string;
}

export interface CorrectionMemoryProvenance {
  sourceQuery: string;
  sourceRunId?: string | null;
  sourceSessionHref?: string | null;
  createdAt: number;
  approvedAt?: number | null;
  archivedAt?: number | null;
}

export interface CorrectionMemoryEntry {
  id: string;
  status: CorrectionMemoryStatus;
  scope: CorrectionMemoryScope;
  content: CorrectionMemoryContent;
  provenance: CorrectionMemoryProvenance;
  sensitivity: CorrectionMemorySensitivity;
  approvalStrength: number;
  appliedCount: number;
  lastAppliedAt?: number | null;
}

interface CorrectionMemoryMatchOptions {
  input: string;
  routeSurface?: string | null;
  agent?: string | null;
  filePath?: string | null;
  taskType?: string | null;
  capability?: AssistantCapabilityId | null;
  limit?: number;
}

interface RememberCorrectionMemoryMeta {
  status?: CorrectionMemoryStatus;
  scope?: Partial<CorrectionMemoryScope>;
  content: CorrectionMemoryContent;
  provenance: Pick<
    CorrectionMemoryProvenance,
    "sourceQuery" | "sourceRunId" | "sourceSessionHref"
  >;
  sensitivity?: CorrectionMemorySensitivity;
  approvalStrength?: number;
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
const MAX_CORRECTION_MEMORIES = 64;
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

function normalizeFilePathPrefix(value: string) {
  return value.replace(/\\/g, "/").replace(/^\.?\//, "").trim();
}

function normalizeCorrectionSensitivity(
  value: string | null | undefined,
): CorrectionMemorySensitivity {
  switch (value) {
    case "internal":
    case "restricted":
    case "safe":
      return value;
    default:
      return "internal";
  }
}

function normalizeCorrectionStatus(
  value: string | null | undefined,
): CorrectionMemoryStatus {
  switch (value) {
    case "approved":
    case "archived":
    case "proposed":
      return value;
    default:
      return "proposed";
  }
}

function clampApprovalStrength(value: number | null | undefined) {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(10, Math.round(value ?? 1)));
}

function normalizeCorrectionScope(
  scope: Partial<CorrectionMemoryScope> | null | undefined,
): CorrectionMemoryScope {
  const routeSurface = scope?.routeSurface?.trim() || null;
  const agent = scope?.agent?.trim()?.toLowerCase() || null;
  const taskType = scope?.taskType?.trim() || null;
  const filePathPrefixes = Array.from(
    new Set(
      (scope?.filePathPrefixes ?? [])
        .map((value) => normalizeFilePathPrefix(value))
        .filter(Boolean),
    ),
  );
  return {
    routeSurface,
    agent,
    filePathPrefixes,
    taskType,
    capability: scope?.capability ?? null,
  };
}

function buildCorrectionSignature(entry: CorrectionMemoryEntry) {
  return [
    entry.content.rule.trim().toLowerCase(),
    entry.content.preferredBehavior.trim().toLowerCase(),
    entry.scope.routeSurface ?? "",
    entry.scope.agent ?? "",
    entry.scope.taskType ?? "",
    entry.scope.capability ?? "",
    entry.scope.filePathPrefixes.join("|"),
  ].join("::");
}

function normalizeOneCorrectionMemory(
  entry: Partial<CorrectionMemoryEntry> | null | undefined,
): CorrectionMemoryEntry | null {
  const rule = entry?.content?.rule?.trim() ?? "";
  const preferredBehavior = entry?.content?.preferredBehavior?.trim() ?? "";
  const sourceQuery = entry?.provenance?.sourceQuery?.trim() ?? "";
  if (!rule || !preferredBehavior || !sourceQuery) return null;
  const createdAt =
    typeof entry?.provenance?.createdAt === "number" &&
    Number.isFinite(entry.provenance.createdAt)
      ? entry.provenance.createdAt
      : Date.now();
  return {
    id: entry?.id?.trim() || `corr-${createdAt}-${Math.random().toString(36).slice(2, 8)}`,
    status: normalizeCorrectionStatus(entry?.status),
    scope: normalizeCorrectionScope(entry?.scope),
    content: {
      rule,
      preferredBehavior,
    },
    provenance: {
      sourceQuery,
      sourceRunId: entry?.provenance?.sourceRunId?.trim() || null,
      sourceSessionHref: entry?.provenance?.sourceSessionHref?.trim() || null,
      createdAt,
      approvedAt:
        typeof entry?.provenance?.approvedAt === "number" &&
        Number.isFinite(entry.provenance.approvedAt)
          ? entry.provenance.approvedAt
          : null,
      archivedAt:
        typeof entry?.provenance?.archivedAt === "number" &&
        Number.isFinite(entry.provenance.archivedAt)
          ? entry.provenance.archivedAt
          : null,
    },
    sensitivity: normalizeCorrectionSensitivity(entry?.sensitivity),
    approvalStrength: clampApprovalStrength(entry?.approvalStrength),
    appliedCount:
      typeof entry?.appliedCount === "number" && Number.isFinite(entry.appliedCount)
        ? Math.max(0, Math.round(entry.appliedCount))
        : 0,
    lastAppliedAt:
      typeof entry?.lastAppliedAt === "number" && Number.isFinite(entry.lastAppliedAt)
        ? entry.lastAppliedAt
        : null,
  };
}

function getCorrectionStatusRank(status: CorrectionMemoryStatus) {
  switch (status) {
    case "approved":
      return 3;
    case "proposed":
      return 2;
    case "archived":
      return 1;
    default:
      return 0;
  }
}

export function pruneCorrectionMemories(
  entries: Partial<CorrectionMemoryEntry>[] | null | undefined,
) {
  const normalized = (entries ?? [])
    .map((entry) => normalizeOneCorrectionMemory(entry))
    .filter((entry): entry is CorrectionMemoryEntry => Boolean(entry));

  const deduped = new Map<string, CorrectionMemoryEntry>();
  for (const entry of normalized) {
    const key = buildCorrectionSignature(entry);
    const current = deduped.get(key);
    if (!current) {
      deduped.set(key, entry);
      continue;
    }
    const currentRank = getCorrectionStatusRank(current.status);
    const nextRank = getCorrectionStatusRank(entry.status);
    if (
      nextRank > currentRank ||
      (nextRank === currentRank &&
        entry.provenance.createdAt >= current.provenance.createdAt)
    ) {
      deduped.set(key, entry);
    }
  }

  return Array.from(deduped.values())
    .sort((left, right) => {
      const statusDelta =
        getCorrectionStatusRank(right.status) - getCorrectionStatusRank(left.status);
      if (statusDelta !== 0) return statusDelta;
      const approvalDelta = right.approvalStrength - left.approvalStrength;
      if (approvalDelta !== 0) return approvalDelta;
      return right.provenance.createdAt - left.provenance.createdAt;
    })
    .slice(0, MAX_CORRECTION_MEMORIES);
}

export function rememberCorrectionMemory(
  entries: Partial<CorrectionMemoryEntry>[] | null | undefined,
  meta: RememberCorrectionMemoryMeta,
) {
  if (!meta.content.rule.trim() || !meta.content.preferredBehavior.trim()) {
    return {
      entries: pruneCorrectionMemories(entries),
      entry: null,
    };
  }

  const nextEntry = normalizeOneCorrectionMemory({
    status: meta.status ?? "proposed",
    scope: normalizeCorrectionScope(meta.scope),
    content: meta.content,
    provenance: {
      sourceQuery: meta.provenance.sourceQuery,
      sourceRunId: meta.provenance.sourceRunId ?? null,
      sourceSessionHref: meta.provenance.sourceSessionHref ?? null,
      createdAt: Date.now(),
      approvedAt: meta.status === "approved" ? Date.now() : null,
      archivedAt: meta.status === "archived" ? Date.now() : null,
    },
    sensitivity: meta.sensitivity ?? "internal",
    approvalStrength: meta.status === "approved"
      ? Math.max(2, clampApprovalStrength(meta.approvalStrength))
      : clampApprovalStrength(meta.approvalStrength),
    appliedCount: 0,
    lastAppliedAt: null,
  });

  if (!nextEntry) {
    return {
      entries: pruneCorrectionMemories(entries),
      entry: null,
    };
  }

  const nextEntries = pruneCorrectionMemories([...(entries ?? []), nextEntry]);
  const storedEntry =
    nextEntries.find((entry) => entry.id === nextEntry.id) ??
    nextEntries.find(
      (entry) => buildCorrectionSignature(entry) === buildCorrectionSignature(nextEntry),
    ) ??
    null;

  return {
    entries: nextEntries,
    entry: storedEntry,
  };
}

function updateCorrectionMemoryStatus(
  entries: Partial<CorrectionMemoryEntry>[] | null | undefined,
  id: string,
  status: CorrectionMemoryStatus,
) {
  return pruneCorrectionMemories(entries).map((entry) => {
    if (entry.id !== id) return entry;
    return {
      ...entry,
      status,
      approvalStrength:
        status === "approved"
          ? Math.max(2, entry.approvalStrength)
          : entry.approvalStrength,
      provenance: {
        ...entry.provenance,
        approvedAt:
          status === "approved"
            ? Date.now()
            : entry.provenance.approvedAt ?? null,
        archivedAt:
          status === "archived"
            ? Date.now()
            : entry.provenance.archivedAt ?? null,
      },
    };
  });
}

export function approveCorrectionMemory(
  entries: Partial<CorrectionMemoryEntry>[] | null | undefined,
  id: string,
) {
  return updateCorrectionMemoryStatus(entries, id, "approved");
}

export function archiveCorrectionMemory(
  entries: Partial<CorrectionMemoryEntry>[] | null | undefined,
  id: string,
) {
  return updateCorrectionMemoryStatus(entries, id, "archived");
}

export function markCorrectionMemoriesApplied(
  entries: Partial<CorrectionMemoryEntry>[] | null | undefined,
  ids: string[],
) {
  const touched = new Set(ids);
  if (touched.size === 0) return pruneCorrectionMemories(entries);
  return pruneCorrectionMemories(entries).map((entry) =>
    touched.has(entry.id)
      ? {
          ...entry,
          appliedCount: entry.appliedCount + 1,
          lastAppliedAt: Date.now(),
        }
      : entry,
  );
}

function getFilePathMatchScore(
  entry: CorrectionMemoryEntry,
  filePath: string | null | undefined,
) {
  if (!filePath) return 0;
  const normalized = normalizeFilePathPrefix(filePath);
  if (!normalized) return 0;
  if (entry.scope.filePathPrefixes.some((prefix) => normalized.startsWith(prefix))) {
    return 28;
  }
  return 0;
}

function getCorrectionRecencyScore(entry: CorrectionMemoryEntry) {
  const approvedAt = entry.provenance.approvedAt ?? entry.provenance.createdAt;
  const ageMs = Math.max(0, Date.now() - approvedAt);
  if (ageMs < 1000 * 60 * 60 * 6) return 14;
  if (ageMs < 1000 * 60 * 60 * 24 * 2) return 10;
  if (ageMs < 1000 * 60 * 60 * 24 * 7) return 6;
  return 2;
}

function scoreCorrectionMemory(
  entry: CorrectionMemoryEntry,
  options: CorrectionMemoryMatchOptions,
) {
  const hasScopedFields = Boolean(
    entry.scope.routeSurface ||
      entry.scope.agent ||
      entry.scope.taskType ||
      entry.scope.capability ||
      entry.scope.filePathPrefixes.length,
  );
  let hasScopeMatch = false;
  let score = entry.approvalStrength * 8;
  score += getCorrectionRecencyScore(entry);

  if (
    options.routeSurface &&
    entry.scope.routeSurface &&
    getRoutePath(entry.scope.routeSurface) === getRoutePath(options.routeSurface)
  ) {
    score += 24;
    hasScopeMatch = true;
  }
  if (options.agent && entry.scope.agent === options.agent.toLowerCase()) {
    score += 22;
    hasScopeMatch = true;
  }
  if (options.capability && entry.scope.capability === options.capability) {
    score += 20;
    hasScopeMatch = true;
  }
  if (options.taskType && entry.scope.taskType === options.taskType) {
    score += 18;
    hasScopeMatch = true;
  }

  const filePathScore = getFilePathMatchScore(entry, options.filePath);
  score += filePathScore;
  if (filePathScore > 0) {
    hasScopeMatch = true;
  }

  const lowerInput = options.input.toLowerCase();
  if (
    entry.content.rule.toLowerCase().includes(lowerInput) ||
    entry.content.preferredBehavior.toLowerCase().includes(lowerInput)
  ) {
    score += 6;
  }

  score += Math.min(8, entry.appliedCount * 2);
  if (hasScopedFields && !hasScopeMatch) {
    score -= 20;
  }
  return score;
}

export function findRelevantCorrectionMemories(
  entries: Partial<CorrectionMemoryEntry>[] | null | undefined,
  options: CorrectionMemoryMatchOptions,
) {
  const limit = Math.max(1, Math.min(3, options.limit ?? 3));
  return pruneCorrectionMemories(entries)
    .filter((entry) => entry.status === "approved")
    .map((entry) => ({
      entry,
      score: scoreCorrectionMemory(entry, options),
    }))
    .filter((entry) => entry.score >= 20)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map((entry) => entry.entry);
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
