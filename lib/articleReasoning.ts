import { callAI } from "@/lib/ai";

export interface ArticleReasoningIndex {
  summary: string;
  entities: string[];
  claim: string;
  domainHints: string[];
}

export interface ArticleReasoningSource {
  id?: string;
  title: string;
  desc?: string | null;
  src?: string | null;
  cat?: string | null;
  link?: string | null;
  tags?: string[] | null;
  index?: ArticleReasoningIndex | null;
}

export interface ArticleReasoningMatch<TArticle extends ArticleReasoningSource> {
  article: TArticle;
  score: number;
  cue: string;
}

const KNOWN_DOMAIN_HINTS = [
  "markets",
  "crypto",
  "cyber",
  "tech",
  "world",
  "research",
  "engineering",
  "ops",
  "strategy",
  "agent",
] as const;

function trimText(value: string, max = 180) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1).trimEnd()}…`;
}

function uniqueStrings(values: Array<string | null | undefined>, max = 8) {
  return Array.from(
    new Set(
      values
        .map((value) => value?.trim() ?? "")
        .filter((value) => value.length > 0),
    ),
  ).slice(0, max);
}

function extractJsonObject(value: string) {
  const match = value.match(/\{[\s\S]*\}/);
  return match?.[0] ?? "";
}

function firstSentence(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  const sentence = normalized.match(/.+?[.!?](?:\s|$)/)?.[0]?.trim() ?? "";
  return sentence || normalized;
}

function inferDomainHints(article: ArticleReasoningSource) {
  const signal = [
    article.cat,
    article.title,
    article.desc ?? "",
    article.src ?? "",
    ...(article.tags ?? []),
  ]
    .join(" ")
    .toLowerCase();

  const hints = new Set<string>();
  const category = article.cat?.trim().toLowerCase();
  if (category) hints.add(category);
  if (/\b(bitcoin|btc|ethereum|eth|crypto|token|defi|market|stocks?|trading)\b/.test(signal)) {
    hints.add("markets");
  }
  if (/\b(bitcoin|btc|ethereum|eth|crypto|token|defi)\b/.test(signal)) {
    hints.add("crypto");
  }
  if (/\b(cve|vulnerability|threat|ransomware|malware|exploit|apt|security)\b/.test(signal)) {
    hints.add("cyber");
  }
  if (/\b(ai|llm|model|chip|cloud|software|tech|developer|github|open source)\b/.test(signal)) {
    hints.add("tech");
  }
  if (/\b(conflict|war|diplomacy|sanctions|election|policy|geopolit)\b/.test(signal)) {
    hints.add("world");
  }
  if (/\b(research|paper|study|findings|report)\b/.test(signal)) {
    hints.add("research");
  }
  if (/\b(code|typescript|react|next\.?js|runtime|api|agent)\b/.test(signal)) {
    hints.add("engineering");
  }
  if (/\b(operator|mission|lane|workbench|triage)\b/.test(signal)) {
    hints.add("ops");
  }
  if (/\b(strategy|adoption|portfolio|compare|fit)\b/.test(signal)) {
    hints.add("strategy");
  }
  return uniqueStrings(
    Array.from(hints).filter((hint): hint is string =>
      (KNOWN_DOMAIN_HINTS as readonly string[]).includes(hint),
    ),
    4,
  );
}

function extractEntities(article: ArticleReasoningSource) {
  const titleEntities =
    article.title.match(
      /\b(?:[A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+){0,2}|[A-Z]{2,}(?:-[A-Z0-9]+)?)\b/g,
    ) ?? [];

  const descEntities =
    (article.desc ?? "").match(
      /\b(?:[A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+){0,2}|[A-Z]{2,}(?:-[A-Z0-9]+)?)\b/g,
    ) ?? [];

  return uniqueStrings(
    [
      ...(article.tags ?? []),
      article.src ?? "",
      ...titleEntities,
      ...descEntities,
    ],
    6,
  ).map((entity) => trimText(entity, 32));
}

function normalizeIndex(
  input: Partial<ArticleReasoningIndex> | null | undefined,
  fallback: ArticleReasoningIndex,
): ArticleReasoningIndex {
  return {
    summary: trimText(input?.summary ?? fallback.summary, 200),
    claim: trimText(input?.claim ?? fallback.claim, 180),
    entities: uniqueStrings(input?.entities ?? fallback.entities, 6).map((value) =>
      trimText(value, 32),
    ),
    domainHints: uniqueStrings(input?.domainHints ?? fallback.domainHints, 4).filter(
      (value) => (KNOWN_DOMAIN_HINTS as readonly string[]).includes(value),
    ),
  };
}

export function buildArticleReasoningFallback(
  article: ArticleReasoningSource,
): ArticleReasoningIndex {
  const baseText = trimText(
    [article.title, article.desc ?? ""].filter(Boolean).join(". "),
    200,
  );
  const claim = trimText(
    firstSentence(article.desc ?? article.title) || article.title,
    180,
  );
  return normalizeIndex(
    {
      summary: baseText || trimText(article.title, 200),
      claim,
      entities: extractEntities(article),
      domainHints: inferDomainHints(article),
    },
    {
      summary: trimText(article.title, 200),
      claim: trimText(article.title, 180),
      entities: uniqueStrings([article.src ?? "", ...(article.tags ?? [])], 4),
      domainHints: inferDomainHints(article),
    },
  );
}

export async function enrichArticleReasoningIndex(
  article: ArticleReasoningSource,
): Promise<ArticleReasoningIndex> {
  const fallback = buildArticleReasoningFallback(article);
  const prompt = [
    "Return JSON only.",
    'Shape: {"summary":"", "claim":"", "entities":[""], "domainHints":[""]}',
    "Summarize this saved article for local archive recall.",
    "Rules:",
    "- summary <= 200 chars",
    "- claim <= 180 chars",
    "- entities = up to 6 short strings",
    "- domainHints = up to 4 values from markets, crypto, cyber, tech, world, research, engineering, ops, strategy, agent",
    "",
    `Title: ${article.title}`,
    `Description: ${article.desc ?? ""}`,
    `Source: ${article.src ?? ""}`,
    `Category: ${article.cat ?? ""}`,
    `Tags: ${(article.tags ?? []).join(", ")}`,
    `Link: ${article.link ?? ""}`,
  ].join("\n");

  try {
    const raw = await callAI(prompt, 260, "reasoning");
    const payload = extractJsonObject(raw);
    if (!payload) return fallback;
    const parsed = JSON.parse(payload) as Partial<ArticleReasoningIndex>;
    return normalizeIndex(parsed, fallback);
  } catch {
    return fallback;
  }
}

export function getArticleReasoningSummary(article: ArticleReasoningSource) {
  return trimText(
    article.index?.summary ||
      article.index?.claim ||
      article.desc ||
      article.title,
    200,
  );
}

export function getArticleReasoningClaim(article: ArticleReasoningSource) {
  return trimText(article.index?.claim || firstSentence(article.desc ?? "") || "", 180);
}

export function getArticleReasoningEntities(article: ArticleReasoningSource) {
  return uniqueStrings(article.index?.entities ?? [], 6);
}

export function getArticleReasoningDomainHints(article: ArticleReasoningSource) {
  const hints = article.index?.domainHints;
  if (Array.isArray(hints) && hints.length > 0) {
    return uniqueStrings(hints, 4);
  }
  return inferDomainHints(article);
}

export function buildArticleReasoningSearchText(article: ArticleReasoningSource) {
  return [
    article.title,
    article.desc ?? "",
    article.src ?? "",
    article.cat ?? "",
    ...(article.tags ?? []),
    article.index?.summary ?? "",
    article.index?.claim ?? "",
    ...(article.index?.entities ?? []),
    ...(article.index?.domainHints ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function buildArticleReasoningGraphText(article: ArticleReasoningSource) {
  return [
    article.title,
    article.desc ?? "",
    article.src ?? "",
    article.cat ?? "",
    ...(article.tags ?? []),
    getArticleReasoningSummary(article),
    getArticleReasoningClaim(article),
    ...getArticleReasoningEntities(article),
    ...getArticleReasoningDomainHints(article),
  ]
    .filter(Boolean)
    .join(" ");
}

export function scoreArticleReasoningMatch(
  article: ArticleReasoningSource,
  query: string,
) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return 0;
  const terms = normalizedQuery.split(/\s+/).filter(Boolean);
  if (terms.length === 0) return 0;

  const title = article.title.toLowerCase();
  const desc = (article.desc ?? "").toLowerCase();
  const tags = (article.tags ?? []).join(" ").toLowerCase();
  const summary = (article.index?.summary ?? "").toLowerCase();
  const claim = (article.index?.claim ?? "").toLowerCase();
  const entities = (article.index?.entities ?? []).join(" ").toLowerCase();
  const domainHints = (article.index?.domainHints ?? []).join(" ").toLowerCase();

  let score = 0;
  if (title.includes(normalizedQuery)) score += 12;
  if (summary.includes(normalizedQuery) || claim.includes(normalizedQuery)) score += 9;
  if (tags.includes(normalizedQuery)) score += 7;
  if (desc.includes(normalizedQuery)) score += 6;

  for (const term of terms) {
    if (title.includes(term)) score += 4;
    if (summary.includes(term)) score += 3;
    if (claim.includes(term)) score += 4;
    if (entities.includes(term)) score += 3;
    if (tags.includes(term)) score += 2;
    if (domainHints.includes(term)) score += 2;
    if (desc.includes(term)) score += 1;
  }

  return score;
}

export function findArticleReasoningMatches<TArticle extends ArticleReasoningSource>(
  query: string,
  articles: TArticle[],
  limit = 2,
): Array<ArticleReasoningMatch<TArticle>> {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return [];

  return articles
    .map((article) => {
      const score = scoreArticleReasoningMatch(article, normalizedQuery);
      return {
        article,
        score,
        cue: getArticleReasoningClaim(article) || getArticleReasoningSummary(article),
      };
    })
    .filter((match) => match.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (b.article.id ?? "").localeCompare(a.article.id ?? "");
    })
    .slice(0, limit);
}
