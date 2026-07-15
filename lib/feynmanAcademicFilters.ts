/**
 * Academic research filters and citation extraction (academic-research-skills patterns).
 */

export interface FeynmanPaperSearchFilters {
  field?: string;
  minYear?: number;
  maxYear?: number;
  minCitations?: number;
  openAccessOnly?: boolean;
}

const FIELD_KEYWORDS: Record<string, string[]> = {
  ml: ["machine learning", "deep learning", "neural", "llm", "transformer"],
  security: ["security", "vulnerability", "cryptograph", "privacy"],
  systems: ["distributed", "systems", "database", "operating system"],
  hci: ["human-computer", "usability", "interface", "ux"],
};

export function parseFeynmanPaperSearchFilters(
  topic: string,
): FeynmanPaperSearchFilters {
  const lower = topic.toLowerCase();
  const filters: FeynmanPaperSearchFilters = {};

  for (const [field, keywords] of Object.entries(FIELD_KEYWORDS)) {
    if (keywords.some((keyword) => lower.includes(keyword))) {
      filters.field = field;
      break;
    }
  }

  const yearMatch = topic.match(/\b(20\d{2})\b/g);
  if (yearMatch?.length) {
    const years = yearMatch.map(Number).sort((a, b) => a - b);
    filters.minYear = years[0];
    if (years.length > 1) filters.maxYear = years[years.length - 1];
  }

  const citationMatch = topic.match(
    /(?:cited|citations?)\s*(?:>=|at least|over)\s*(\d+)/i,
  );
  if (citationMatch) {
    filters.minCitations = Number(citationMatch[1]);
  }

  if (/\bopen[- ]?access\b/i.test(topic)) {
    filters.openAccessOnly = true;
  }

  return filters;
}

export function applyFeynmanPaperSearchFilters(
  query: string,
  filters: FeynmanPaperSearchFilters,
): string {
  const parts = [query.trim()];
  if (filters.field) parts.push(`${filters.field} research`);
  if (filters.minYear) parts.push(`after:${filters.minYear}`);
  if (filters.maxYear) parts.push(`before:${filters.maxYear + 1}`);
  if (filters.minCitations) parts.push(`highly cited`);
  if (filters.openAccessOnly) parts.push(`open access`);
  return parts.filter(Boolean).join(" ");
}

const CITATION_PATTERNS = [
  /\[[^\]]{2,120}\]\((https?:\/\/[^\s)]+)\)/g,
  /https?:\/\/(?:www\.)?arxiv\.org\/abs\/[^\s)]+/gi,
  /https?:\/\/doi\.org\/[^\s)]+/gi,
  /\bdoi:\s*10\.\d{4,9}\/[^\s]+/gi,
];

export function extractCitationsFromText(text: string): string[] {
  const found = new Set<string>();
  for (const pattern of CITATION_PATTERNS) {
    const matches = text.match(pattern) ?? [];
    for (const match of matches) {
      found.add(match.trim().replace(/^doi:\s*/i, ""));
    }
  }
  return [...found].slice(0, 24);
}

export function buildMethodologyCritiqueHints(topic: string): string[] {
  const hints = [
    "State whether the paper defines a reproducible method section.",
    "Flag missing baselines, ablations, or statistical significance claims.",
    "Separate dataset limitations from model limitations.",
  ];
  if (/replicat|reproduc/i.test(topic)) {
    hints.push(
      "List concrete artifacts required to replicate (code, data, seeds, hardware).",
    );
  }
  if (/clinical|medical|biomed/i.test(topic)) {
    hints.push(
      "Check preregistration, sample size, and conflict-of-interest disclosures.",
    );
  }
  return hints;
}

export function scoreReproducibilityPosture(
  text: string,
): "high" | "medium" | "low" {
  const lower = text.toLowerCase();
  let score = 0;
  if (/github\.com|gitlab\.com|code available|open.?source/i.test(lower))
    score += 2;
  if (/dataset|data available|supplementary/i.test(lower)) score += 1;
  if (/random seed|hyperparameter|appendix|supplementary material/i.test(lower))
    score += 1;
  if (/we will release|future work/i.test(lower)) score -= 1;
  if (score >= 3) return "high";
  if (score >= 1) return "medium";
  return "low";
}
