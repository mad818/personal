import { normalizeSessionHref } from "@/lib/exactSessionLinks";

const GITHUB_HOSTS = new Set(["github.com", "www.github.com"]);
const REPO_ID_RE = /^[A-Za-z0-9._-]{1,100}\/[A-Za-z0-9._-]{1,100}$/;
const GITHUB_URL_RE = /https?:\/\/(?:www\.)?github\.com\/[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+/i;
const OWNER_REPO_RE = /\b[A-Za-z0-9._-]{1,100}\/[A-Za-z0-9._-]{1,100}\b/;
const REPO_INTEL_RE =
  /\b(?:github|open source|oss|dependency|dependencies|reference repo|reference library|competitor repo|compare repos?|assess repo|analy(?:s|z)e repo|repo intel|repository assessment|library assessment)\b/i;

export interface RepoIntelTreeEntry {
  name: string;
  path: string;
  type: "file" | "dir";
}

export interface RepoIntelProfile {
  normalizedRepoId: string;
  sourceUrl: string;
  owner: string;
  repo: string;
  displayName: string;
  description: string;
  topics: string[];
  stars: number;
  forks: number;
  watchers: number;
  license: string | null;
  defaultBranch: string | null;
  languageHints: string[];
  inferredStack: string[];
  topLevelTree: RepoIntelTreeEntry[];
  readmeExcerpt: string;
  implementationBrief: string;
  warnings: string[];
}

export interface RepoIntelNormalizationSuccess {
  ok: true;
  normalizedRepoId: string;
  sourceUrl: string;
}

export interface RepoIntelNormalizationFailure {
  ok: false;
  error: string;
}

export type RepoIntelNormalizationResult =
  | RepoIntelNormalizationSuccess
  | RepoIntelNormalizationFailure;

function normalizeOwnerRepo(owner: string, repo: string): RepoIntelNormalizationResult {
  const candidate = `${owner.trim()}/${repo.trim()}`;
  if (!REPO_ID_RE.test(candidate)) {
    return {
      ok: false,
      error:
        "Repo references must match owner/repo and may only contain letters, numbers, dot, underscore, and dash.",
    };
  }

  const normalizedRepoId = candidate.toLowerCase();
  return {
    ok: true,
    normalizedRepoId,
    sourceUrl: `https://github.com/${normalizedRepoId}`,
  };
}

export function normalizeRepoIntelReference(
  rawValue: string | null | undefined,
): RepoIntelNormalizationResult {
  const trimmed = (rawValue ?? "").trim();
  if (!trimmed) {
    return { ok: false, error: "A GitHub repo URL or owner/repo reference is required." };
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      return { ok: false, error: "Repo URL is invalid." };
    }

    if (!GITHUB_HOSTS.has(parsed.hostname.toLowerCase())) {
      return { ok: false, error: "Only github.com repo URLs are supported." };
    }
    if (parsed.search || parsed.hash) {
      return {
        ok: false,
        error: "Repo URLs cannot include query strings or fragments.",
      };
    }

    const segments = parsed.pathname.split("/").filter(Boolean);
    if (segments.length !== 2) {
      return {
        ok: false,
        error:
          "Repo URLs must point to the repo root only. Branch, tree, blob, issue, and compare URLs are not supported.",
      };
    }

    return normalizeOwnerRepo(segments[0] ?? "", segments[1] ?? "");
  }

  const segments = trimmed.split("/", 2);
  if (segments.length !== 2) {
    return {
      ok: false,
      error: "Repo references must use owner/repo or a GitHub repo root URL.",
    };
  }

  return normalizeOwnerRepo(segments[0] ?? "", segments[1] ?? "");
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function cleanTextBlock(value: string, max = 1_500) {
  const next = value.replace(/\s+/g, " ").trim();
  return next.slice(0, max).trim();
}

function stripReadmeMarkdown(markdown: string) {
  return cleanTextBlock(
    markdown
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
      .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
      .replace(/^#{1,6}\s*/gm, "")
      .replace(/^>\s*/gm, "")
      .replace(/[*_~]+/g, "")
      .replace(/\r\n?/g, "\n"),
  );
}

function hasTreeEntry(tree: RepoIntelTreeEntry[], pattern: RegExp) {
  return tree.some((entry) => pattern.test(entry.name));
}

export function inferRepoIntelStack(input: {
  languageHints: string[];
  topLevelTree: RepoIntelTreeEntry[];
  topics: string[];
}) {
  const stack: string[] = [];
  const languages = input.languageHints.map((value) => value.toLowerCase());
  const tree = input.topLevelTree;
  const topics = input.topics.map((value) => value.toLowerCase());

  if (
    hasTreeEntry(tree, /^next\.config\./i) ||
    topics.includes("nextjs") ||
    topics.includes("next-js")
  ) {
    stack.push("Next.js");
  }

  if (
    hasTreeEntry(tree, /^package\.json$/i) ||
    languages.includes("javascript") ||
    languages.includes("typescript")
  ) {
    stack.push("Node.js");
  }

  if (
    hasTreeEntry(tree, /^tsconfig\.json$/i) ||
    languages.includes("typescript")
  ) {
    stack.push("TypeScript");
  }

  if (languages.includes("javascript") && !stack.includes("Node.js")) {
    stack.push("JavaScript");
  }

  if (
    hasTreeEntry(tree, /^(requirements\.txt|pyproject\.toml|poetry\.lock|environment\.ya?ml)$/i) ||
    languages.includes("python")
  ) {
    stack.push("Python");
  }

  if (hasTreeEntry(tree, /^go\.mod$/i) || languages.includes("go")) {
    stack.push("Go");
  }

  if (hasTreeEntry(tree, /^cargo\.toml$/i) || languages.includes("rust")) {
    stack.push("Rust");
  }

  if (
    hasTreeEntry(tree, /^(dockerfile|docker-compose\.ya?ml)$/i) ||
    topics.includes("docker")
  ) {
    stack.push("Docker");
  }

  if (
    hasTreeEntry(tree, /^gemfile$/i) ||
    hasTreeEntry(tree, /^\.ruby-version$/i) ||
    languages.includes("ruby")
  ) {
    stack.push("Ruby");
  }

  if (hasTreeEntry(tree, /^composer\.json$/i) || languages.includes("php")) {
    stack.push("PHP");
  }

  if (
    hasTreeEntry(tree, /^(pom\.xml|build\.gradle|settings\.gradle|gradle\.properties)$/i) ||
    languages.includes("java") ||
    languages.includes("kotlin")
  ) {
    stack.push("JVM");
  }

  return unique(stack).slice(0, 6);
}

function summarizeTopLevelTree(tree: RepoIntelTreeEntry[]) {
  const dirs = tree.filter((entry) => entry.type === "dir").map((entry) => entry.name);
  const files = tree.filter((entry) => entry.type === "file").map((entry) => entry.name);
  const signals = [
    dirs.length > 0 ? `top-level directories: ${dirs.slice(0, 4).join(", ")}` : "",
    files.length > 0 ? `key files: ${files.slice(0, 5).join(", ")}` : "",
  ].filter(Boolean);
  return signals.join("; ");
}

export function buildRepoIntelBrief(profile: Omit<RepoIntelProfile, "implementationBrief">) {
  const stack = profile.inferredStack.length > 0
    ? profile.inferredStack.join(", ")
    : profile.languageHints.length > 0
      ? profile.languageHints.join(", ")
      : "no clear stack signal";
  const description =
    cleanTextBlock(profile.description, 180) ||
    (profile.readmeExcerpt
      ? cleanTextBlock(profile.readmeExcerpt, 180)
      : "No description or README summary was available.");
  const structuralSignals =
    summarizeTopLevelTree(profile.topLevelTree) || "top-level structure is minimal.";
  const topicText = profile.topics.length > 0
    ? `Topics suggest ${profile.topics.slice(0, 4).join(", ")}.`
    : "Topics are sparse, so fit should be judged from the README and file layout.";

  return cleanTextBlock(
    `${profile.normalizedRepoId} looks like a public reference repo for ${description} Likely stack: ${stack}. ${topicText} Structural signals: ${structuralSignals}. Best fit for Nexus is read-only assessment first, then an ORBIT implementation plan only if the pattern is worth adapting locally.`,
    420,
  );
}

export function hasRepoIntelSignal(input: string) {
  if (GITHUB_URL_RE.test(input)) return true;
  if (REPO_INTEL_RE.test(input)) return true;

  const ownerRepo = input.match(OWNER_REPO_RE)?.[0];
  if (!ownerRepo) return false;
  return /\b(?:analy(?:s|z)e|assess|compare|review|inspect|dependency|dependencies|library|competitor|reference)\b/i.test(
    input,
  );
}

export function buildRepoIntelOrbitPrompt(profile: RepoIntelProfile) {
  const stack = profile.inferredStack.length > 0
    ? profile.inferredStack.join(", ")
    : profile.languageHints.join(", ") || "Unknown";
  const treeSummary =
    profile.topLevelTree
      .slice(0, 8)
      .map((entry) => `${entry.type === "dir" ? "dir" : "file"}:${entry.name}`)
      .join(", ") || "No top-level tree available.";
  const warningText =
    profile.warnings.length > 0
      ? `Warnings: ${profile.warnings.join(" ")}`
      : "Warnings: none.";

  return [
    `Assess the public GitHub repo ${profile.normalizedRepoId} as a read-only reference for Nexus Prime.`,
    `Source URL: ${profile.sourceUrl}`,
    `Description: ${profile.description || "No GitHub description was available."}`,
    `Likely stack: ${stack}`,
    `Topics: ${profile.topics.join(", ") || "none"}`,
    `Top-level tree: ${treeSummary}`,
    `README excerpt: ${profile.readmeExcerpt || "No README excerpt was available."}`,
    `Implementation brief: ${profile.implementationBrief}`,
    warningText,
    "Respond with: 1. fit for Nexus, 2. safest adoption points, 3. boundaries or patterns to avoid importing directly.",
  ].join("\n");
}

export function formatRepoIntelToolResult(profile: RepoIntelProfile) {
  const lines = [
    `Repo: ${profile.normalizedRepoId}`,
    `URL: ${profile.sourceUrl}`,
    `Description: ${profile.description || "No description available."}`,
    `Stack: ${profile.inferredStack.join(", ") || profile.languageHints.join(", ") || "Unknown"}`,
    `Topics: ${profile.topics.join(", ") || "none"}`,
    `Stats: ${profile.stars} stars · ${profile.forks} forks · ${profile.watchers} watchers`,
    `Default branch: ${profile.defaultBranch ?? "unknown"}`,
    `License: ${profile.license ?? "unknown"}`,
    `Top-level tree: ${
      profile.topLevelTree.map((entry) => `${entry.type === "dir" ? "[dir]" : "[file]"} ${entry.name}`).join(", ") ||
      "No tree available."
    }`,
    `README excerpt: ${profile.readmeExcerpt || "No README excerpt available."}`,
    `Implementation brief: ${profile.implementationBrief}`,
  ];

  if (profile.warnings.length > 0) {
    lines.push(`Warnings: ${profile.warnings.join(" ")}`);
  }

  return lines.join("\n");
}

export function buildRepoIntelPreparedWorkspace() {
  const href = normalizeSessionHref("/recon?view=osint&focus=recon-repo-intel");
  return {
    href,
    label: "Open RECON repo intel",
    detail:
      "Prepared the read-only repo-intel lane so public GitHub metadata, stack signals, and a compact ORBIT handoff brief are ready before implementation planning widens.",
  };
}
