export interface VaultRetrievalCandidate {
  id: string;
  title: string;
  summary?: string;
  tags?: string[];
  workflowId?: string;
  domain?: string;
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
}

export function scoreVaultRetrievalCandidate(
  query: string,
  candidate: VaultRetrievalCandidate,
): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;

  let score = 0;
  const title = candidate.title?.toLowerCase() ?? "";
  const summary = candidate.summary?.toLowerCase() ?? "";
  const queryTokens = tokenize(q);

  if (title.includes(q)) score += 4;
  if (summary.includes(q)) score += 2;

  for (const token of queryTokens) {
    if (title.includes(token)) score += 1;
    if (summary.includes(token)) score += 1;
    for (const tag of candidate.tags ?? []) {
      const normalized = tag.toLowerCase();
      if (normalized.includes(token) || token.includes(normalized)) score += 2;
    }
  }

  if (
    candidate.workflowId === "repo-compare" &&
    /\b(compare|versus|vs|which repo)\b/i.test(q)
  ) {
    score += 3;
  }
  if (
    candidate.workflowId === "repo-assimilation" &&
    /\b(assimil|adopt|adapt|reject|repo)\b/i.test(q)
  ) {
    score += 2;
  }
  if (candidate.domain && q.includes(candidate.domain.toLowerCase())) {
    score += 1;
  }

  return score;
}

export function rankVaultRetrievalCandidates<T extends VaultRetrievalCandidate>(
  query: string,
  candidates: T[],
): T[] {
  return [...candidates].sort((left, right) => {
    const delta =
      scoreVaultRetrievalCandidate(query, right) -
      scoreVaultRetrievalCandidate(query, left);
    if (delta !== 0) return delta;
    return left.title.localeCompare(right.title);
  });
}
