// ── lib/feynmanAutoresearchLoop ──────────────────────────────────────────────
// Measured experiment loop: accepts variant definitions, scores them with a
// deterministic fixture scorer in tests / operator-provided metrics in runtime,
// appends JSONL history under agent-workspace/feynman/autoresearch/, and keeps
// improvements up to a bounded maximum per run.
//
// Adapted from feynman skills/autoresearch/SKILL.md
// No paid APIs, no background cron, no external execution.

import * as fs from "fs/promises";
import * as path from "path";
import * as crypto from "crypto";

export const FEYNMAN_AUTORESEARCH_LIMITS = {
  maximumVariantsPerRun: 8,
  maximumVariantLabelLength: 120,
  maximumHypothesisLength: 800,
  maximumScoreValue: 100,
  maximumHistoryEntries: 200,
  maximumFormattedChars: 10_000,
} as const;

export type VariantDefinition = {
  id: string;
  label: string;
  hypothesis: string;
  parameters?: Record<string, string | number | boolean>;
};

export type VariantScore = {
  variantId: string;
  score: number;
  rationale: string;
  scoredAt: string;
};

export type LoopHistoryEntry = {
  runId: string;
  topic: string;
  startedAt: string;
  completedAt: string;
  variants: VariantDefinition[];
  scores: VariantScore[];
  bestVariantId: string | null;
  improved: boolean;
  previousBestScore: number | null;
};

export type AutoresearchLoopResult = {
  runId: string;
  topic: string;
  variants: VariantDefinition[];
  scores: VariantScore[];
  bestVariantId: string | null;
  bestScore: number | null;
  improved: boolean;
  historyPath: string;
  receipt: string;
};

export type AutoresearchLoopDeps = {
  scorer?: (variant: VariantDefinition, topic: string) => Promise<VariantScore>;
  now?: () => string;
  writeHistory?: (filePath: string, entry: LoopHistoryEntry) => Promise<void>;
  readHistory?: (filePath: string) => Promise<LoopHistoryEntry[]>;
};

// ── Validators ────────────────────────────────────────────────────────────────

export function normalizeVariantDefinitions(
  raw: unknown,
): VariantDefinition[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error("At least one variant definition is required.");
  }
  const bounded = raw.slice(0, FEYNMAN_AUTORESEARCH_LIMITS.maximumVariantsPerRun);
  const seen = new Set<string>();
  return bounded.map((item, index) => {
    if (typeof item !== "object" || item === null) {
      throw new Error(`Variant at index ${index} must be an object.`);
    }
    const v = item as Record<string, unknown>;
    const id = String(v.id ?? `variant-${index}`).trim().slice(0, 64);
    if (!id) throw new Error(`Variant at index ${index} must have a non-empty id.`);
    if (seen.has(id)) throw new Error(`Duplicate variant id: "${id}".`);
    seen.add(id);

    const label = String(v.label ?? id)
      .trim()
      .slice(0, FEYNMAN_AUTORESEARCH_LIMITS.maximumVariantLabelLength);
    if (!label) throw new Error(`Variant "${id}" must have a non-empty label.`);

    const hypothesis = String(v.hypothesis ?? "")
      .trim()
      .slice(0, FEYNMAN_AUTORESEARCH_LIMITS.maximumHypothesisLength);

    const parameters =
      v.parameters && typeof v.parameters === "object" && !Array.isArray(v.parameters)
        ? (v.parameters as Record<string, string | number | boolean>)
        : undefined;

    return { id, label, hypothesis, parameters };
  });
}

export function normalizeTopic(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error("Autoresearch topic is required.");
  if (trimmed.length > 512) throw new Error("Autoresearch topic is too long.");
  return trimmed;
}

// ── Deterministic fixture scorer (for tests; no network) ─────────────────────
// Scores by hashing the variant id + topic to a stable [0, 100] integer.

export function fixtureScorer(
  variant: VariantDefinition,
  topic: string,
  now = new Date().toISOString(),
): VariantScore {
  const raw = crypto
    .createHash("sha256")
    .update(`${variant.id}::${topic}`)
    .digest("hex");
  const score = parseInt(raw.slice(0, 8), 16) % 101;
  return {
    variantId: variant.id,
    score,
    rationale: `Deterministic fixture score for "${variant.label}" on topic "${topic.slice(0, 60)}".`,
    scoredAt: now,
  };
}

// ── JSONL history helpers ─────────────────────────────────────────────────────

function resolveHistoryPath(
  workspace: string,
  topic: string,
): string {
  const slug = topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return path.join(workspace, "feynman", "autoresearch", `${slug || "topic"}.jsonl`);
}

async function defaultWriteHistory(
  filePath: string,
  entry: LoopHistoryEntry,
): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const line = JSON.stringify(entry) + "\n";
  await fs.appendFile(filePath, line, "utf-8");
}

async function defaultReadHistory(
  filePath: string,
): Promise<LoopHistoryEntry[]> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const lines = raw.trim().split("\n").filter(Boolean);
    const entries: LoopHistoryEntry[] = [];
    for (const line of lines.slice(-FEYNMAN_AUTORESEARCH_LIMITS.maximumHistoryEntries)) {
      try {
        entries.push(JSON.parse(line) as LoopHistoryEntry);
      } catch {
        // Skip malformed lines
      }
    }
    return entries;
  } catch {
    return [];
  }
}

function findPreviousBest(history: LoopHistoryEntry[]): number | null {
  if (!history.length) return null;
  const last = history[history.length - 1];
  if (!last.scores.length) return null;
  return Math.max(...last.scores.map((s) => s.score));
}

// ── Format receipt ────────────────────────────────────────────────────────────

export function formatAutoresearchReceipt(result: AutoresearchLoopResult): string {
  const scoreLines = result.scores
    .slice()
    .sort((a, b) => b.score - a.score)
    .map(
      (s) =>
        `  ${s.variantId}: ${s.score}/100 — ${s.rationale.slice(0, 120)}`,
    );

  const lines = [
    `Autoresearch loop`,
    `Run: ${result.runId}`,
    `Topic: ${result.topic.slice(0, 120)}`,
    `Variants scored: ${result.variants.length}`,
    `Best variant: ${result.bestVariantId ?? "none"} (score ${result.bestScore ?? "N/A"}/100)`,
    `Improved: ${result.improved ? "yes" : "no"}`,
    `History: ${result.historyPath}`,
    "",
    "Scores (descending):",
    ...scoreLines,
  ];

  const receipt = lines.join("\n");
  if (receipt.length <= FEYNMAN_AUTORESEARCH_LIMITS.maximumFormattedChars) {
    return receipt;
  }
  const suffix = "\n[Receipt truncated at the bounded evidence limit.]";
  return receipt.slice(0, FEYNMAN_AUTORESEARCH_LIMITS.maximumFormattedChars - suffix.length) + suffix;
}

// ── Main loop ─────────────────────────────────────────────────────────────────

export async function runAutoresearchLoop(
  rawTopic: string,
  rawVariants: unknown,
  workspace: string,
  deps: AutoresearchLoopDeps = {},
): Promise<AutoresearchLoopResult> {
  const topic = normalizeTopic(rawTopic);
  const variants = normalizeVariantDefinitions(rawVariants);
  const now = deps.now ?? (() => new Date().toISOString());
  const scorer = deps.scorer ?? ((v, t) => Promise.resolve(fixtureScorer(v, t, now())));
  const writeHistory = deps.writeHistory ?? defaultWriteHistory;
  const readHistory = deps.readHistory ?? defaultReadHistory;

  const historyPath = resolveHistoryPath(workspace, topic);
  const history = await readHistory(historyPath);
  const previousBestScore = findPreviousBest(history);

  const runId = `ar-${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex")}`;
  const startedAt = now();

  // Score all variants (bounded)
  const scores: VariantScore[] = [];
  for (const variant of variants) {
    const score = await scorer(variant, topic);
    scores.push({
      variantId: variant.id,
      score: Math.min(
        FEYNMAN_AUTORESEARCH_LIMITS.maximumScoreValue,
        Math.max(0, Math.round(score.score)),
      ),
      rationale: score.rationale.trim().slice(0, 300),
      scoredAt: score.scoredAt,
    });
  }

  // Find best this run
  const bestScore = scores.length
    ? Math.max(...scores.map((s) => s.score))
    : null;
  const bestVariantId =
    bestScore !== null
      ? (scores.find((s) => s.score === bestScore)?.variantId ?? null)
      : null;

  const improved =
    bestScore !== null &&
    (previousBestScore === null || bestScore > previousBestScore);

  const completedAt = now();

  const entry: LoopHistoryEntry = {
    runId,
    topic,
    startedAt,
    completedAt,
    variants,
    scores,
    bestVariantId,
    improved,
    previousBestScore,
  };

  await writeHistory(historyPath, entry);

  const result: AutoresearchLoopResult = {
    runId,
    topic,
    variants,
    scores,
    bestVariantId,
    bestScore,
    improved,
    historyPath,
    receipt: "",
  };
  result.receipt = formatAutoresearchReceipt(result);
  return result;
}
