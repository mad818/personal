const OWNER_REPO_RE = /\b([A-Za-z0-9._-]{1,100})\/([A-Za-z0-9._-]{1,100})\b/g;

export function extractRepoIdsFromBrief(brief: string): string[] {
  const ids = new Set<string>();
  for (const match of brief.matchAll(OWNER_REPO_RE)) {
    const owner = match[1]?.trim();
    const repo = match[2]?.trim();
    if (!owner || !repo) continue;
    if (owner.length > 39 || repo.length > 100) continue;
    ids.add(`${owner}/${repo}`);
  }
  return Array.from(ids);
}

export function buildRepoCompareHandoffHref(repoIds: string[]): string {
  const unique = Array.from(
    new Set(repoIds.map((id) => id.trim()).filter(Boolean)),
  );
  if (unique.length < 2) {
    return "/recon?view=osint&focus=repo-intel";
  }
  const query = encodeURIComponent(unique.slice(0, 3).join(" "));
  return `/recon?view=osint&focus=repo-compare&compare=${query}`;
}

export function buildAssimilationCompareHint(repoIds: string[]): string {
  if (repoIds.length < 2) {
    return "Add another repo reference to the assimilation brief to open a compare handoff.";
  }
  return `Compare ${repoIds.slice(0, 3).join(" vs ")} before adopt/adapt/reject.`;
}
