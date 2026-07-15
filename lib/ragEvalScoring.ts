export type RagEvalGrade = "A" | "B" | "C" | "F";

export interface RagEvalScore {
  grade: RagEvalGrade;
  citationCount: number;
  urlCount: number;
  highTierMarkers: number;
  lowTierMarkers: number;
  gaps: string[];
}

const URL_RE = /https?:\/\/[^\s)\]>]+/gi;
const HIGH_TIER_RE = /\[(?:HIGH|CONFIRMED|OFFICIAL|S1)\]/gi;
const LOW_TIER_RE = /\[(?:LOW|UNVERIFIED|STALE|WEAK)\]/gi;

export function scoreRagResponse(text: string): RagEvalScore {
  const citationCount = (text.match(/\[[^\]]{2,80}\]/g) ?? []).length;
  const urlCount = (text.match(URL_RE) ?? []).length;
  const highTierMarkers = (text.match(HIGH_TIER_RE) ?? []).length;
  const lowTierMarkers = (text.match(LOW_TIER_RE) ?? []).length;

  const gaps: string[] = [];
  if (urlCount === 0 && citationCount < 2) {
    gaps.push("No source URLs or bracket citations detected.");
  }
  if (lowTierMarkers > highTierMarkers && urlCount > 0) {
    gaps.push("Low-tier credibility markers outweigh high-tier markers.");
  }
  if (!/\bconfidence\b/i.test(text) && text.length > 400) {
    gaps.push("Missing explicit confidence or gaps section.");
  }

  let grade: RagEvalGrade = "F";
  if (urlCount >= 2 && highTierMarkers >= 1 && gaps.length === 0) grade = "A";
  else if (urlCount >= 1 && citationCount >= 2 && gaps.length <= 1) grade = "B";
  else if (urlCount >= 1 || citationCount >= 1) grade = "C";

  return {
    grade,
    citationCount,
    urlCount,
    highTierMarkers,
    lowTierMarkers,
    gaps,
  };
}

export function buildRagEvalRequirementsBlock(): string {
  return (
    `\n[RAG EVAL — production agentic pattern]\n` +
    `Before finishing: cite ≥1 URL, tag credibility [HIGH|MEDIUM|LOW], state confidence, list gaps if any.\n` +
    `Self-check target: grade A/B requires sources + credibility tags.\n` +
    `[END RAG EVAL]\n`
  );
}

export function formatRagEvalReceipt(score: RagEvalScore): string {
  const gapLine =
    score.gaps.length > 0
      ? `Gaps: ${score.gaps.join(" ")}`
      : "Gaps: none detected";
  return `[RAG EVAL RECEIPT] grade=${score.grade} · urls=${score.urlCount} · citations=${score.citationCount} · ${gapLine}`;
}
