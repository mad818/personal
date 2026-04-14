import type { LearningEntry } from "@/lib/agentLearnings";
import type { AgentRunArtifact, Article, ModeBriefing } from "@/store/useStore";

export type MemoryLayer = "raw" | "knowledge" | "output";
export type MemoryVisibility = "safe" | "internal" | "restricted";
export type MemoryLifecycleState =
  | "compaction_candidate"
  | "durable_note"
  | "reopen_candidate"
  | "sensitive_hold";
export type MemoryNextAction =
  | "promote"
  | "compact"
  | "reopen"
  | "review"
  | "reference";
export type MemoryDomain =
  | "intel"
  | "cyber"
  | "markets"
  | "ops"
  | "engineering"
  | "strategy"
  | "general";

export interface MemorySpineItem {
  id: string;
  layer: MemoryLayer;
  kind: "clip" | "learning" | "run" | "briefing" | "page";
  title: string;
  summary: string;
  sourceLabel: string;
  domain: MemoryDomain;
  tags: string[];
  timestamp: number;
  visibility: MemoryVisibility;
  citationId?: string;
  lifecycle?: MemoryLifecycleState;
  nextAction?: MemoryNextAction;
  sensitivityTags?: string[];
}

export interface MemorySpineSnapshot {
  items: MemorySpineItem[];
  total: number;
  latestUpdatedAt: number | null;
  countsByLayer: Record<MemoryLayer, number>;
  countsByDomain: Record<MemoryDomain, number>;
  countsByVisibility: Record<MemoryVisibility, number>;
}

export interface MemorySpineSources {
  savedArticles: Article[];
  agentLearnings: Record<string, LearningEntry[]>;
  agentRunHistory: AgentRunArtifact[];
  modeBriefings: ModeBriefing[];
}

const EMPTY_LAYER_COUNTS: Record<MemoryLayer, number> = {
  raw: 0,
  knowledge: 0,
  output: 0,
};

const EMPTY_DOMAIN_COUNTS: Record<MemoryDomain, number> = {
  intel: 0,
  cyber: 0,
  markets: 0,
  ops: 0,
  engineering: 0,
  strategy: 0,
  general: 0,
};

const EMPTY_VISIBILITY_COUNTS: Record<MemoryVisibility, number> = {
  safe: 0,
  internal: 0,
  restricted: 0,
};

const MEMORY_VISIBILITY_ORDER: Record<MemoryVisibility, number> = {
  safe: 0,
  internal: 1,
  restricted: 2,
};

const RESTRICTED_TEXT_PATTERNS = [
  /\b(api[_ -]?key|access[_ -]?key|secret|password|token|cookie|session|bearer|client secret|refresh token|private key|credentials?)\b/i,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bghp_[A-Za-z0-9]{16,}\b/,
  /\bsk-[A-Za-z0-9]{16,}\b/i,
  /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/i,
  /\.env(\.[A-Za-z0-9_-]+)?\b/i,
  /\b(id_rsa|id_dsa|authorized_keys|known_hosts|npmrc|pypirc)\b/i,
  /(?:^|\s)(?:tasks[\\/](?:agent-learnings\.jsonl|memory-pages\.json|memory-spine-snapshot\.json)|\.git[\\/]|node_modules[\\/]|\.next[\\/])/i,
  /(?:[A-Za-z]:\\|\/)(?:[^\\/\s]+[\\/])*(?:\.ssh|secrets?|credentials?|keys?|certs?|private)(?:[\\/]|$)/i,
];

const INTERNAL_HINT_PATTERNS = [
  /\b(internal|operator|private|sensitive|restricted|classified|bench|doctrine|playbook|workbench)\b/i,
];

function normalizeText(value: string) {
  return value.toLowerCase();
}

function trimSummary(value: string, max = 180) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length <= max
    ? normalized
    : `${normalized.slice(0, max - 1).trimEnd()}…`;
}

function guessDomainFromText(text: string): MemoryDomain {
  const lower = normalizeText(text);
  if (/\b(cve|vulnerability|threat|malware|exploit|incident|security|otx|containment)\b/.test(lower)) {
    return "cyber";
  }
  if (/\b(bitcoin|btc|eth|crypto|market|trade|portfolio|fear and greed|momentum)\b/.test(lower)) {
    return "markets";
  }
  if (/\b(world risk|geopolit|conflict|ops|earthquake|flight|maritime|weather)\b/.test(lower)) {
    return "ops";
  }
  if (/\b(next|react|typescript|tailwind|store|agent|prompt|runtime|verify|code)\b/.test(lower)) {
    return "engineering";
  }
  if (/\b(strategy|brief|portfolio review|vrio|porter|bcg|jtbd|mission codex)\b/.test(lower)) {
    return "strategy";
  }
  if (/\b(news|research|source|article|report|analysis|intel)\b/.test(lower)) {
    return "intel";
  }
  return "general";
}

export function guessMemoryDomain(text: string): MemoryDomain {
  return guessDomainFromText(text);
}

export function resolveMemoryVisibility(
  detected: MemoryVisibility,
  requested?: MemoryVisibility,
): MemoryVisibility {
  if (!requested) return detected;
  if (!(requested in MEMORY_VISIBILITY_ORDER)) return detected;
  return MEMORY_VISIBILITY_ORDER[requested] > MEMORY_VISIBILITY_ORDER[detected]
    ? requested
    : detected;
}

function domainFromArticle(article: Article): MemoryDomain {
  const hint = `${article.cat ?? ""} ${article.title} ${article.desc ?? ""} ${(article.tags ?? []).join(" ")}`;
  return guessDomainFromText(hint);
}

function domainFromLearning(entry: LearningEntry): MemoryDomain {
  if (entry.queryType === "security") return "cyber";
  if (entry.queryType === "market") return "markets";
  if (entry.queryType === "research") return "intel";
  if (entry.queryType === "code") return "engineering";
  if (entry.queryType === "planning") return "strategy";
  return guessDomainFromText(entry.summary);
}

function domainFromRun(artifact: AgentRunArtifact): MemoryDomain {
  const text = `${artifact.userMessage} ${artifact.finalAnswer} ${artifact.toolTraces.map((trace) => trace.tool).join(" ")}`;
  return guessDomainFromText(text);
}

function domainFromBriefing(briefing: ModeBriefing): MemoryDomain {
  const text = `${briefing.summary} ${briefing.relatedTab} ${briefing.mode}`;
  return guessDomainFromText(text);
}

function redactSensitiveText(value: string) {
  return value
    .replace(/\b(Bearer\s+)[A-Za-z0-9._-]+\b/gi, "$1[redacted]")
    .replace(
      /\b(api[_ -]?key|access[_ -]?key|secret|password|token|cookie|session|client secret|refresh token)\s*[:=]\s*([^\s,;]+)/gi,
      "$1=[redacted]",
    )
    .replace(/\bAKIA[0-9A-Z]{16}\b/g, "[redacted-key]")
    .replace(/\bghp_[A-Za-z0-9]{16,}\b/g, "[redacted-token]")
    .replace(/\bsk-[A-Za-z0-9]{16,}\b/gi, "[redacted-key]")
    .replace(/\bxox[baprs]-[A-Za-z0-9-]{10,}\b/gi, "[redacted-token]")
    .replace(
      /(?:[A-Za-z]:\\|\/)(?:[^\\/\s]+[\\/])*(?:\.ssh|secrets?|credentials?|keys?|certs?|private)(?:[\\/][^\s]*)?/gi,
      "[protected-path]",
    )
    .replace(/\.env(\.[A-Za-z0-9_-]+)?\b/gi, "[protected-env]")
    .replace(/\s+/g, " ")
    .trim();
}

export function detectMemoryVisibility(args: {
  layer: MemoryLayer;
  kind: MemorySpineItem["kind"];
  title: string;
  summary: string;
  sourceLabel: string;
  tags: string[];
  extraText?: string;
}): MemoryVisibility {
  const combined = [
    args.title,
    args.summary,
    args.sourceLabel,
    args.tags.join(" "),
    args.extraText ?? "",
  ].join(" ");

  if (RESTRICTED_TEXT_PATTERNS.some((pattern) => pattern.test(combined))) {
    return "restricted";
  }

  if (
    args.layer !== "raw" ||
    INTERNAL_HINT_PATTERNS.some((pattern) => pattern.test(combined))
  ) {
    return "internal";
  }

  return "safe";
}

function dedupeTags(tags: string[]) {
  return Array.from(new Set(tags.filter(Boolean)));
}

function buildMemoryCitationId(base: Pick<MemorySpineItem, "id" | "layer" | "kind">) {
  const layerCode =
    base.layer === "raw" ? "RAW" : base.layer === "knowledge" ? "KNW" : "OUT";
  const kindCode = base.kind.slice(0, 3).toUpperCase();
  const slug = base.id
    .replace(/^[^:]+:/, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toUpperCase()
    .slice(-16);
  return `NX-${layerCode}-${kindCode}-${slug || "ITEM"}`;
}

function deriveSensitivityTags(combined: string, visibility: MemoryVisibility) {
  const tags: string[] = [];
  if (visibility === "restricted") {
    if (
      /\b(api[_ -]?key|access[_ -]?key|secret|password|token|cookie|session|bearer|client secret|refresh token)\b/i.test(
        combined,
      )
    ) {
      tags.push("credential-like");
    }
    if (
      /(?:[A-Za-z]:\\|\/)(?:[^\\/\s]+[\\/])*(?:\.ssh|secrets?|credentials?|keys?|certs?|private)(?:[\\/]|$)/i.test(
        combined,
      )
    ) {
      tags.push("protected-path");
    }
  }
  if (visibility !== "safe" && INTERNAL_HINT_PATTERNS.some((pattern) => pattern.test(combined))) {
    tags.push("internal-doctrine");
  }
  return dedupeTags(tags);
}

function deriveLifecycleState(
  base: Omit<MemorySpineItem, "visibility">,
  visibility: MemoryVisibility,
): MemoryLifecycleState {
  if (visibility === "restricted") return "sensitive_hold";
  if (base.layer === "raw") return "compaction_candidate";
  if (base.kind === "run" || base.kind === "briefing" || base.kind === "page") {
    return "reopen_candidate";
  }
  return "durable_note";
}

function deriveNextAction(
  lifecycle: MemoryLifecycleState,
  base: Omit<MemorySpineItem, "visibility">,
): MemoryNextAction {
  if (lifecycle === "sensitive_hold") return "review";
  if (lifecycle === "compaction_candidate") {
    return base.kind === "clip" ? "promote" : "compact";
  }
  if (lifecycle === "reopen_candidate") return "reopen";
  return "reference";
}

function sanitizeMemoryItem(
  base: Omit<MemorySpineItem, "visibility">,
  options?: { extraText?: string; visibility?: MemoryVisibility },
): MemorySpineItem {
  const visibility =
    options?.visibility ??
    detectMemoryVisibility({ ...base, extraText: options?.extraText });
  const combined = [
    base.title,
    base.summary,
    base.sourceLabel,
    base.tags.join(" "),
    options?.extraText ?? "",
  ].join(" ");
  const lifecycle = base.lifecycle ?? deriveLifecycleState(base, visibility);
  const nextAction = base.nextAction ?? deriveNextAction(lifecycle, base);
  const citationId = base.citationId ?? buildMemoryCitationId(base);
  const sensitivityTags =
    base.sensitivityTags ?? deriveSensitivityTags(combined, visibility);

  if (visibility === "restricted") {
    return {
      ...base,
      title: `${base.kind.toUpperCase()} artifact (restricted)`,
      summary: "Sensitive content withheld from shared memory surfaces.",
      sourceLabel: "Restricted artifact",
      tags: ["restricted"],
      visibility,
      citationId,
      lifecycle,
      nextAction,
      sensitivityTags,
    };
  }

  return {
    ...base,
    title: trimSummary(redactSensitiveText(base.title), 90),
    summary: trimSummary(redactSensitiveText(base.summary)),
    sourceLabel: trimSummary(redactSensitiveText(base.sourceLabel), 60),
    tags: dedupeTags(
      base.tags.map((tag) => trimSummary(redactSensitiveText(tag), 32)),
    ),
    visibility,
    citationId,
    lifecycle,
    nextAction,
    sensitivityTags,
  };
}

export function materializeMemorySpineItem(
  base: Omit<MemorySpineItem, "visibility">,
  options?: { extraText?: string; visibility?: MemoryVisibility },
): MemorySpineItem {
  return sanitizeMemoryItem(base, options);
}

export function buildMemorySpineItems(input: MemorySpineSources): MemorySpineItem[] {
  const articleItems = input.savedArticles.map<MemorySpineItem>((article) => ({
    id: `article:${article.id}`,
    layer: "raw",
    kind: "clip",
    title: article.title,
    summary: trimSummary(article.desc ?? article.title),
    sourceLabel: article.src ? `Source · ${article.src}` : "Vault clip",
    domain: domainFromArticle(article),
    tags: article.tags ?? [],
    timestamp: Number.isFinite(new Date(article.date).getTime())
      ? new Date(article.date).getTime()
      : 0,
    visibility: "safe",
  })).map((item) => sanitizeMemoryItem(item));

  const learningItems = Object.entries(input.agentLearnings).flatMap(([, entries]) =>
    entries.map<MemorySpineItem>((entry) => ({
      id: `learning:${entry.id}`,
      layer: "knowledge",
      kind: "learning",
      title: `${entry.agent.toUpperCase()} ${entry.category}`,
      summary: trimSummary(entry.summary),
      sourceLabel: entry.proposedFix ? "Agent learning · proposed fix" : "Agent learning",
      domain: domainFromLearning(entry),
      tags: [entry.queryType, entry.category, entry.agent],
      timestamp: entry.ts,
      visibility: "safe",
    })).map((item) => sanitizeMemoryItem(item)),
  );

  const runItems = input.agentRunHistory.map<MemorySpineItem>((artifact) => ({
    id: `run:${artifact.runId}`,
    layer: "output",
    kind: "run",
    title: trimSummary(artifact.userMessage, 72),
    summary: trimSummary(artifact.finalAnswer),
    sourceLabel: `Agent run · ${artifact.runtimeEngine}`,
    domain: domainFromRun(artifact),
    tags: [
      artifact.toolTraces[0]?.tool ?? "answer",
      artifact.efficiency.toolPackId,
      artifact.verificationSummary,
    ].filter(Boolean),
    timestamp: artifact.finishedAt,
    visibility: "safe",
  })).map((item) => sanitizeMemoryItem(item));

  const briefingItems = input.modeBriefings.map<MemorySpineItem>((briefing) => ({
    id: `briefing:${briefing.id}`,
    layer: "output",
    kind: "briefing",
    title: `${briefing.mode} ${briefing.jobName}`,
    summary: trimSummary(briefing.summary),
    sourceLabel: `Mode briefing · ${briefing.relatedTab}`,
    domain: domainFromBriefing(briefing),
    tags: [briefing.mode, briefing.relatedTab, briefing.status],
    timestamp: briefing.createdAt,
    visibility: "safe",
  })).map((item) => sanitizeMemoryItem(item));

  return [...articleItems, ...learningItems, ...runItems, ...briefingItems].sort(
    (a, b) => b.timestamp - a.timestamp,
  );
}

export function buildMemorySpineSnapshotFromItems(items: MemorySpineItem[]): MemorySpineSnapshot {
  const countsByLayer = { ...EMPTY_LAYER_COUNTS };
  const countsByDomain = { ...EMPTY_DOMAIN_COUNTS };
  const countsByVisibility = { ...EMPTY_VISIBILITY_COUNTS };

  for (const item of items) {
    countsByLayer[item.layer] += 1;
    countsByDomain[item.domain] += 1;
    countsByVisibility[item.visibility] += 1;
  }

  return {
    items,
    total: items.length,
    latestUpdatedAt: items[0]?.timestamp ?? null,
    countsByLayer,
    countsByDomain,
    countsByVisibility,
  };
}

export function buildMemorySpineSnapshot(input: MemorySpineSources): MemorySpineSnapshot {
  return buildMemorySpineSnapshotFromItems(buildMemorySpineItems(input));
}

export function searchMemorySpine(
  snapshot: MemorySpineSnapshot,
  options?: {
    query?: string;
    layer?: MemoryLayer | "all";
    limit?: number;
    includeRestricted?: boolean;
  },
): MemorySpineItem[] {
  const query = options?.query?.trim().toLowerCase() ?? "";
  const layer = options?.layer ?? "all";
  const limit = options?.limit ?? 8;
  const includeRestricted = options?.includeRestricted ?? false;
  const terms = query.split(/\s+/).filter(Boolean);

  const candidates = snapshot.items.filter((item) =>
    (layer === "all" ? true : item.layer === layer) &&
    (includeRestricted ? true : item.visibility !== "restricted"),
  );

  const scored = candidates
    .map((item) => {
      if (terms.length === 0) {
        return { item, score: 0 };
      }

      const haystacks = {
        title: normalizeText(item.title),
        summary: normalizeText(item.summary),
        tags: normalizeText(item.tags.join(" ")),
        source: normalizeText(item.sourceLabel),
      };

      let score = 0;
      if (haystacks.title.includes(query)) score += 12;
      if (haystacks.summary.includes(query)) score += 7;
      if (haystacks.tags.includes(query)) score += 6;

      for (const term of terms) {
        if (haystacks.title.includes(term)) score += 4;
        if (haystacks.summary.includes(term)) score += 2;
        if (haystacks.tags.includes(term)) score += 3;
        if (haystacks.source.includes(term)) score += 1;
      }

      return { item, score };
    })
    .filter(({ score }) => terms.length === 0 || score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.item.timestamp - a.item.timestamp;
    });

  return scored.slice(0, limit).map(({ item }) => item);
}
