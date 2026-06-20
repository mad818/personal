import {
  extractPaperCodeReferences,
  fetchPaperMetadata,
  findPaperReference,
  type PaperMetadata,
} from "./feynmanPaperInspection.ts";

// ── Types ─────────────────────────────────────────────────────────────────────

export type RepoCoordinates = {
  owner: string;
  repo: string;
  repoUrl: string;
};

export type RepoFileSnippet = {
  path: string;
  url: string;
  chars: number;
  content: string;
  truncated: boolean;
};

export type AuditedClaim = {
  term: string;
  foundIn: string[];
  status: "confirmed" | "absent" | "readme_only";
};

export type PaperCodeAuditReport = {
  arxivId: string | null;
  paperUrl: string;
  repoUrl: string;
  readme: string;
  readmeTruncated: boolean;
  snippets: RepoFileSnippet[];
  claimTerms: string[];
  auditedClaims: AuditedClaim[];
  warnings: string[];
};

export type PaperCodeAuditDeps = {
  fetchImpl?: typeof fetch;
};

// ── Limits ────────────────────────────────────────────────────────────────────

export const FEYNMAN_PAPER_CODE_AUDIT_LIMITS = {
  maximumReadmeChars: 4_000,
  maximumSnippetChars: 1_500,
  maximumSnippetFiles: 3,
  maximumTreeEntries: 500,
  maximumFormattedChars: 14_000,
  maximumClaimTerms: 12,
  timeoutMs: 12_000,
} as const;

// ── Constants ─────────────────────────────────────────────────────────────────

const GITHUB_REPO_RE =
  /https?:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)(?:\/[^\s"<>)]*)?/i;
const AUDIT_USER_AGENT = "NexusPrime/feynman-paper-code-audit";

const CODE_FILE_EXTS = new Set([
  ".py",
  ".ts",
  ".js",
  ".tsx",
  ".jsx",
  ".go",
  ".rs",
  ".cpp",
  ".c",
  ".java",
  ".rb",
  ".sh",
  ".bash",
  ".yaml",
  ".yml",
  ".toml",
  ".md",
]);

// ── Repo resolution ───────────────────────────────────────────────────────────

export function normalizeGitHubRepo(rawUrl: string): RepoCoordinates | null {
  const m = rawUrl.match(GITHUB_REPO_RE);
  if (!m) return null;
  const owner = m[1];
  const repo = (m[2] ?? "").replace(/\.git$/, "");
  if (!owner || !repo) return null;
  return { owner, repo, repoUrl: `https://github.com/${owner}/${repo}` };
}

export function resolveRepoFromPaperMetadata(
  metadata: PaperMetadata,
): RepoCoordinates | null {
  const candidates: string[] = [];
  if (metadata.githubUrl) candidates.push(metadata.githubUrl);
  for (const ref of extractPaperCodeReferences(metadata)) {
    candidates.push(ref);
  }
  for (const url of candidates) {
    const coords = normalizeGitHubRepo(url);
    if (coords) return coords;
  }
  return null;
}

// ── Bounded fetch helpers ─────────────────────────────────────────────────────

function makeAuditHeaders(): Record<string, string> {
  return {
    Accept: "text/plain, application/json, */*",
    "User-Agent": AUDIT_USER_AGENT,
  };
}

function makeAuditInit(): RequestInit {
  return {
    headers: makeAuditHeaders(),
    signal: AbortSignal.timeout(FEYNMAN_PAPER_CODE_AUDIT_LIMITS.timeoutMs),
    cache: "no-store",
  };
}

async function readBoundedText(
  response: Response,
  maxChars: number,
): Promise<{ text: string; truncated: boolean }> {
  const raw = await response.text();
  if (raw.length <= maxChars) return { text: raw, truncated: false };
  return { text: raw.slice(0, maxChars), truncated: true };
}

// ── README fetch ──────────────────────────────────────────────────────────────

export async function fetchRepoReadme(
  coords: RepoCoordinates,
  deps: PaperCodeAuditDeps = {},
): Promise<{ content: string; truncated: boolean }> {
  const fetchFn = deps.fetchImpl ?? fetch;
  const url = `https://raw.githubusercontent.com/${coords.owner}/${coords.repo}/HEAD/README.md`;
  try {
    const response = await fetchFn(url, makeAuditInit());
    if (!response.ok) return { content: "", truncated: false };
    const { text, truncated } = await readBoundedText(
      response,
      FEYNMAN_PAPER_CODE_AUDIT_LIMITS.maximumReadmeChars,
    );
    return { content: text, truncated };
  } catch {
    return { content: "", truncated: false };
  }
}

// ── File tree fetch ───────────────────────────────────────────────────────────

type GitHubTreeEntry = {
  path?: string;
  type?: string;
};

export async function fetchRepoFileTree(
  coords: RepoCoordinates,
  deps: PaperCodeAuditDeps = {},
): Promise<string[]> {
  const fetchFn = deps.fetchImpl ?? fetch;
  const url = `https://api.github.com/repos/${coords.owner}/${coords.repo}/git/trees/HEAD?recursive=1`;
  try {
    const response = await fetchFn(url, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": AUDIT_USER_AGENT,
      },
      signal: AbortSignal.timeout(FEYNMAN_PAPER_CODE_AUDIT_LIMITS.timeoutMs),
      cache: "no-store",
    });
    if (!response.ok) return [];
    const data = (await response.json()) as { tree?: GitHubTreeEntry[] };
    return (data.tree ?? [])
      .filter(
        (e) =>
          e.type === "blob" &&
          e.path &&
          !e.path.includes("node_modules/") &&
          !e.path.startsWith("."),
      )
      .slice(0, FEYNMAN_PAPER_CODE_AUDIT_LIMITS.maximumTreeEntries)
      .map((e) => e.path!)
      .filter(Boolean);
  } catch {
    return [];
  }
}

// ── Claim term extraction (no AI) ─────────────────────────────────────────────

export function extractClaimTerms(abstract: string): string[] {
  const candidates: { term: string; score: number }[] = [];
  const seen = new Set<string>();

  function add(term: string) {
    const key = term.toLowerCase();
    if (term.length < 4 || seen.has(key)) return;
    seen.add(key);
    const score =
      term.length +
      (term.includes("-") ? 2 : 0) +
      (/[A-Z]{2}/.test(term) ? 3 : 0) +
      (/[0-9]/.test(term) ? 1 : 0);
    candidates.push({ term, score });
  }

  // Proper nouns and acronyms
  for (const m of abstract.matchAll(/\b([A-Z][a-z]{3,}|[A-Z]{3,})\b/g)) {
    add(m[1]);
  }

  // camelCase identifiers
  for (const m of abstract.matchAll(/\b([a-z][A-Z][A-Za-z]+)\b/g)) {
    add(m[1]);
  }

  // Hyphenated technical terms
  for (const m of abstract.matchAll(/\b([a-z]+-[a-z]+(?:-[a-z]+)?)\b/g)) {
    if ((m[1]?.length ?? 0) >= 7) add(m[1]);
  }

  // Adjacent capitalized pairs (e.g. "Attention Mechanism")
  for (const m of abstract.matchAll(/\b([A-Z][a-z]+\s+[A-Z][a-z]+)\b/g)) {
    add(m[1]);
  }

  return candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, FEYNMAN_PAPER_CODE_AUDIT_LIMITS.maximumClaimTerms)
    .map((c) => c.term);
}

// ── Claim-aligned file selection ──────────────────────────────────────────────

export function selectClaimAlignedFiles(
  claimTerms: string[],
  tree: string[],
  max: number = FEYNMAN_PAPER_CODE_AUDIT_LIMITS.maximumSnippetFiles,
): string[] {
  const lowerTerms = claimTerms.map((t) => t.toLowerCase());

  return tree
    .filter((filePath) => {
      const lastDot = filePath.lastIndexOf(".");
      const ext = lastDot >= 0 ? filePath.slice(lastDot).toLowerCase() : "";
      return CODE_FILE_EXTS.has(ext);
    })
    .map((filePath) => {
      const lowerPath = filePath.toLowerCase();
      const termScore = lowerTerms.reduce(
        (acc, term) => acc + (lowerPath.includes(term) ? 2 : 0),
        0,
      );
      const depth = filePath.split("/").length;
      return { filePath, score: termScore + Math.max(0, 3 - depth) };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((entry) => entry.filePath);
}

// ── File snippet fetch ────────────────────────────────────────────────────────

export async function fetchFileSnippet(
  coords: RepoCoordinates,
  filePath: string,
  deps: PaperCodeAuditDeps = {},
): Promise<RepoFileSnippet> {
  const fetchFn = deps.fetchImpl ?? fetch;
  const url = `https://raw.githubusercontent.com/${coords.owner}/${coords.repo}/HEAD/${filePath}`;
  try {
    const response = await fetchFn(url, makeAuditInit());
    if (!response.ok) {
      return { path: filePath, url, chars: 0, content: "", truncated: false };
    }
    const { text, truncated } = await readBoundedText(
      response,
      FEYNMAN_PAPER_CODE_AUDIT_LIMITS.maximumSnippetChars,
    );
    return { path: filePath, url, chars: text.length, content: text, truncated };
  } catch {
    return { path: filePath, url, chars: 0, content: "", truncated: false };
  }
}

// ── Claim auditing (no AI) ────────────────────────────────────────────────────

export function auditClaimsAgainstCode(
  claimTerms: string[],
  readme: string,
  snippets: RepoFileSnippet[],
): AuditedClaim[] {
  const lowerReadme = readme.toLowerCase();
  return claimTerms.map((term) => {
    const lowerTerm = term.toLowerCase();
    const foundIn: string[] = [];

    if (lowerReadme.includes(lowerTerm)) foundIn.push("README");

    for (const snippet of snippets) {
      if (snippet.content.toLowerCase().includes(lowerTerm)) {
        foundIn.push(snippet.path);
      }
    }

    let status: AuditedClaim["status"];
    if (foundIn.length === 0) {
      status = "absent";
    } else if (foundIn.length === 1 && foundIn[0] === "README") {
      status = "readme_only";
    } else {
      status = "confirmed";
    }

    return { term, foundIn, status };
  });
}

// ── Report formatting ─────────────────────────────────────────────────────────

export function formatPaperCodeAuditReport(
  report: PaperCodeAuditReport,
): string {
  const confirmed = report.auditedClaims.filter(
    (c) => c.status === "confirmed",
  );
  const readmeOnly = report.auditedClaims.filter(
    (c) => c.status === "readme_only",
  );
  const absent = report.auditedClaims.filter((c) => c.status === "absent");

  const claimLines = report.auditedClaims.map((c) => {
    const marker =
      c.status === "confirmed" ? "✓" : c.status === "readme_only" ? "~" : "✗";
    const locs = c.foundIn.length > 0 ? ` — ${c.foundIn.join(", ")}` : "";
    return `  ${marker} ${c.term}${locs}`;
  });

  const snippetLines = report.snippets.map(
    (s) =>
      `  [${s.path}] ${s.chars} chars${s.truncated ? " (truncated)" : ""}\n  ${s.url}`,
  );

  const receipt = [
    "Paper-code audit",
    `Paper: ${report.paperUrl}`,
    `Repository: ${report.repoUrl}`,
    `README: ${report.readme ? `${report.readme.length} chars${report.readmeTruncated ? " (truncated)" : ""}` : "not found"}`,
    "",
    `Claim evidence (${confirmed.length} confirmed, ${readmeOnly.length} readme-only, ${absent.length} absent):`,
    ...claimLines,
    "",
    `Code snippets (${report.snippets.length}/${FEYNMAN_PAPER_CODE_AUDIT_LIMITS.maximumSnippetFiles} bounded):`,
    ...(snippetLines.length
      ? snippetLines
      : [
          "  No claim-aligned files found in the repository tree.",
        ]),
    "",
    `Warnings: ${report.warnings.join(" | ") || "none"}`,
  ].join("\n");

  if (receipt.length <= FEYNMAN_PAPER_CODE_AUDIT_LIMITS.maximumFormattedChars) {
    return receipt;
  }
  const suffix = "\n[Audit receipt truncated at the bounded evidence limit.]";
  return (
    receipt.slice(
      0,
      FEYNMAN_PAPER_CODE_AUDIT_LIMITS.maximumFormattedChars - suffix.length,
    ) + suffix
  );
}

// ── Core runner ───────────────────────────────────────────────────────────────

export async function runPaperCodeAudit(
  metadata: PaperMetadata,
  deps: PaperCodeAuditDeps = {},
): Promise<PaperCodeAuditReport> {
  const warnings: string[] = [];
  const coords = resolveRepoFromPaperMetadata(metadata);
  if (!coords) {
    throw new Error(
      "Paper code audit requires a public GitHub repository URL in the paper abstract or metadata.",
    );
  }

  const claimTerms = extractClaimTerms(metadata.abstract);
  if (!claimTerms.length) {
    warnings.push("No claim terms could be extracted from the abstract.");
  }

  const [readmeResult, tree] = await Promise.all([
    fetchRepoReadme(coords, deps).catch(() => {
      warnings.push("README fetch failed.");
      return { content: "", truncated: false };
    }),
    fetchRepoFileTree(coords, deps).catch(() => {
      warnings.push("Repository file tree fetch failed.");
      return [] as string[];
    }),
  ]);

  const selectedFiles = selectClaimAlignedFiles(claimTerms, tree);

  const snippetResults = await Promise.allSettled(
    selectedFiles.map((filePath) => fetchFileSnippet(coords, filePath, deps)),
  );
  const snippets: RepoFileSnippet[] = [];
  for (const result of snippetResults) {
    if (result.status === "fulfilled" && result.value.content.trim()) {
      snippets.push(result.value);
    } else if (result.status === "rejected") {
      warnings.push("A snippet fetch failed.");
    }
  }

  const auditedClaims = auditClaimsAgainstCode(
    claimTerms,
    readmeResult.content,
    snippets,
  );

  return {
    arxivId: metadata.arxivId,
    paperUrl: metadata.sourceUrl,
    repoUrl: coords.repoUrl,
    readme: readmeResult.content,
    readmeTruncated: readmeResult.truncated,
    snippets,
    claimTerms,
    auditedClaims,
    warnings,
  };
}

// ── Topic inspection (matches inspectPaperTopic signature) ───────────────────

export async function inspectPaperCodeAuditTopic(
  topic: string,
  deps: PaperCodeAuditDeps = {},
): Promise<{ url: string; content: string } | null> {
  const reference = findPaperReference(topic);
  if (!reference) return null;

  try {
    const metadata = await fetchPaperMetadata(reference, deps);
    const coords = resolveRepoFromPaperMetadata(metadata);
    if (!coords) return null;

    const report = await runPaperCodeAudit(metadata, deps);
    return {
      url: report.repoUrl,
      content: formatPaperCodeAuditReport(report),
    };
  } catch {
    return null;
  }
}
