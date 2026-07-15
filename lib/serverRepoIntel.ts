import { getBrandServiceName } from "@/lib/brand";
import {
  buildRepoIntelBrief,
  inferRepoIntelStack,
  normalizeRepoIntelReference,
  type RepoIntelProfile,
  type RepoIntelTreeEntry,
} from "@/lib/repoIntel";

const GITHUB_API_BASE = "https://api.github.com";
const REPO_INTEL_CACHE_TTL_MS = 30 * 60_000;

type CachedRepoIntel = {
  profile: RepoIntelProfile;
  expiresAt: number;
};

type GitHubRepoResponse = {
  name?: string;
  full_name?: string;
  description?: string | null;
  topics?: string[];
  stargazers_count?: number;
  forks_count?: number;
  subscribers_count?: number;
  watchers_count?: number;
  license?: { spdx_id?: string | null; name?: string | null } | null;
  default_branch?: string | null;
  owner?: { login?: string };
};

type GitHubContentsEntry = {
  name?: string;
  path?: string;
  type?: "dir" | "file";
};

type GitHubReadmeResponse = {
  content?: string;
  encoding?: string;
};

const repoIntelCache = new Map<string, CachedRepoIntel>();

export class RepoIntelError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "RepoIntelError";
    this.status = status;
  }
}

function pruneRepoIntelCache(now = Date.now()) {
  for (const [key, value] of Array.from(repoIntelCache.entries())) {
    if (value.expiresAt <= now) {
      repoIntelCache.delete(key);
    }
  }
}

function getCachedRepoIntel(repoId: string) {
  pruneRepoIntelCache();
  const cached = repoIntelCache.get(repoId);
  if (!cached || cached.expiresAt <= Date.now()) {
    repoIntelCache.delete(repoId);
    return null;
  }
  return cached.profile;
}

function setCachedRepoIntel(repoId: string, profile: RepoIntelProfile) {
  repoIntelCache.set(repoId, {
    profile,
    expiresAt: Date.now() + REPO_INTEL_CACHE_TTL_MS,
  });
}

async function readGitHubJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": `${getBrandServiceName()}/repo-intel`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
    signal: AbortSignal.timeout(12_000),
    cache: "no-store",
  });

  if (response.status === 404) {
    throw new RepoIntelError("Public GitHub repo not found.", 404);
  }

  const rateLimitRemaining = response.headers.get("x-ratelimit-remaining");
  if (
    response.status === 403 &&
    rateLimitRemaining !== null &&
    rateLimitRemaining === "0"
  ) {
    throw new RepoIntelError(
      "GitHub public metadata rate limit reached. Retry later or use the cached brief if one already exists.",
      429,
    );
  }

  if (response.status === 429) {
    throw new RepoIntelError(
      "GitHub public metadata rate limit reached. Retry later.",
      429,
    );
  }

  if (!response.ok) {
    throw new RepoIntelError(
      `GitHub metadata request failed with HTTP ${response.status}.`,
      response.status,
    );
  }

  return (await response.json()) as T;
}

function decodeReadmeContent(
  content: string | undefined,
  encoding: string | undefined,
) {
  if (!content) return "";
  if (encoding?.toLowerCase() !== "base64") return "";
  try {
    return Buffer.from(content.replace(/\n/g, ""), "base64").toString("utf-8");
  } catch {
    return "";
  }
}

function stripReadmeMarkdown(markdown: string) {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/^>\s*/gm, "")
    .replace(/[*_~]+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1500);
}

function sortTree(entries: RepoIntelTreeEntry[]) {
  return [...entries].sort((left, right) => {
    if (left.type !== right.type) return left.type === "dir" ? -1 : 1;
    return left.name.localeCompare(right.name);
  });
}

function toLanguageHints(languages: Record<string, number>) {
  return Object.entries(languages)
    .sort((left, right) => right[1] - left[1])
    .map(([name]) => name)
    .slice(0, 6);
}

export async function getRepoIntelProfile(
  rawRepoReference: string,
): Promise<{ profile: RepoIntelProfile; cacheHit: boolean }> {
  const normalized = normalizeRepoIntelReference(rawRepoReference);
  if (!normalized.ok) {
    throw new RepoIntelError(normalized.error, 400);
  }

  const cached = getCachedRepoIntel(normalized.normalizedRepoId);
  if (cached) {
    return { profile: cached, cacheHit: true };
  }

  const repoUrl = `${GITHUB_API_BASE}/repos/${normalized.normalizedRepoId}`;
  const repo = await readGitHubJson<GitHubRepoResponse>(repoUrl);
  const warnings: string[] = [];

  const [treeResult, languagesResult, readmeResult] = await Promise.allSettled([
    readGitHubJson<GitHubContentsEntry[]>(`${repoUrl}/contents`),
    readGitHubJson<Record<string, number>>(`${repoUrl}/languages`),
    readGitHubJson<GitHubReadmeResponse>(`${repoUrl}/readme`),
  ]);

  const topLevelTree =
    treeResult.status === "fulfilled" && Array.isArray(treeResult.value)
      ? sortTree(
          treeResult.value
            .filter((entry) => entry.name && entry.path && entry.type)
            .map((entry) => ({
              name: entry.name as string,
              path: entry.path as string,
              type: entry.type as "dir" | "file",
            })),
        )
      : [];
  if (treeResult.status === "rejected") {
    warnings.push(
      "Top-level file tree was unavailable from GitHub at request time.",
    );
  }

  const languageHints =
    languagesResult.status === "fulfilled"
      ? toLanguageHints(languagesResult.value)
      : [];
  if (languagesResult.status === "rejected") {
    warnings.push(
      "Language hints were unavailable from GitHub at request time.",
    );
  }

  const readmeExcerpt =
    readmeResult.status === "fulfilled"
      ? stripReadmeMarkdown(
          decodeReadmeContent(
            readmeResult.value.content,
            readmeResult.value.encoding,
          ),
        )
      : "";
  if (readmeResult.status === "rejected") {
    warnings.push(
      "README excerpt was unavailable from GitHub at request time.",
    );
  }

  const inferredStack = inferRepoIntelStack({
    languageHints,
    topLevelTree,
    topics: repo.topics ?? [],
  });

  const profileBase = {
    normalizedRepoId: normalized.normalizedRepoId,
    sourceUrl: normalized.sourceUrl,
    owner:
      repo.owner?.login?.toLowerCase() ??
      normalized.normalizedRepoId.split("/")[0] ??
      "",
    repo:
      repo.name?.toLowerCase() ??
      normalized.normalizedRepoId.split("/")[1] ??
      "",
    displayName: repo.full_name?.trim() || normalized.normalizedRepoId,
    description: repo.description?.trim() ?? "",
    topics: repo.topics ?? [],
    stars: repo.stargazers_count ?? 0,
    forks: repo.forks_count ?? 0,
    watchers: repo.subscribers_count ?? repo.watchers_count ?? 0,
    license: repo.license?.spdx_id || repo.license?.name || null,
    defaultBranch: repo.default_branch ?? null,
    languageHints,
    inferredStack,
    topLevelTree,
    readmeExcerpt,
    warnings,
  };

  const profile: RepoIntelProfile = {
    ...profileBase,
    implementationBrief: buildRepoIntelBrief(profileBase),
  };

  setCachedRepoIntel(normalized.normalizedRepoId, profile);
  return { profile, cacheHit: false };
}
