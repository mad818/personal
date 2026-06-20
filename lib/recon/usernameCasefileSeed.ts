import type { OsintCasefileDraft } from "@/lib/xr1Workflows";

export interface UsernameEnumSiteResult {
  name: string;
  uri: string;
  found: boolean;
}

export interface UsernameEnumSummary {
  checked: number;
  found: number;
  results: UsernameEnumSiteResult[];
}

export function buildUsernameCasefileDraft(
  username: string,
  summary: UsernameEnumSummary,
): OsintCasefileDraft {
  const foundSites = summary.results.filter((r) => r.found);

  const passiveFindings =
    foundSites.length > 0
      ? `Username "${username}" confirmed on ${foundSites.length} of ${summary.checked} checked sites:\n` +
        foundSites.map((r) => `• ${r.name}: ${r.uri}`).join("\n")
      : `Username "${username}" not found on any of ${summary.checked} checked sites.`;

  const pivotOpportunities =
    foundSites.length > 0
      ? foundSites.slice(0, 6).map((r) => r.name).join(", ") +
        " — review bio fields, linked accounts, join dates, and cross-platform aliases."
      : "";

  const evidenceGaps =
    "Cross-check with email enumeration, GitHub profile, Gravatar, and image-reverse search. Verify accounts are active and not impersonation or squatting.";

  const nextReviewedMove =
    foundSites.length > 0
      ? `Inspect top-hit profiles for identifiers (bio, linked accounts, location, date joined). Pivot on any email or secondary username found.`
      : "Widen search to alternate spellings, partial matches, or known alias patterns.";

  return {
    subject: username,
    goal: `Enumerate social presence and digital footprint for username "${username}" across platforms.`,
    passiveFindings,
    pivotOpportunities,
    evidenceGaps,
    nextReviewedMove,
    pivots: foundSites.length > 0 ? ["social"] : [],
  };
}
