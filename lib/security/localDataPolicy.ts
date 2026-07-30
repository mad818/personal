import { existsSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";

const SENSITIVE_DIRECTORY_SEGMENTS = new Set([
  ".claude",
  ".git",
  ".next",
  ".next-build",
  ".next-e2e",
  ".next-fresh-runtime",
  ".nexus",
  ".turbo",
  "archive",
  "dist",
  "node_modules",
  "out",
]);

const SENSITIVE_FILE_PATTERNS = [
  /^\.env(\.|$)/i,
  /^\.nexus-release-boundary\.json$/i,
  /^\.nexus-runtime-identity\.json$/i,
  /^temp-.*\.html$/i,
  /^tsconfig(?:\.typecheck)?\.tsbuildinfo$/i,
  /\.(?:p12|pfx|pem|key)$/i,
];

export type LocalDataPolicySummary = {
  canonicalContext: {
    agents: boolean;
    standards: boolean;
    state: boolean;
    bible: boolean;
  };
  legacyContext: {
    claude: boolean;
    tasks: boolean;
    lessons: boolean;
  };
  blockedRoots: string[];
};

export function normalizeLocalDataPath(input: string) {
  return input
    .replace(/^[/\\]+/, "")
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/");
}

export function isSensitiveLocalDataPath(input: string) {
  const cleaned = normalizeLocalDataPath(input).trim();
  if (!cleaned) return true;
  if (cleaned.includes("..")) return true;

  const segments = cleaned.split("/").filter(Boolean);
  if (segments.some((segment) => segment.startsWith("."))) return true;
  if (segments.some((segment) => SENSITIVE_DIRECTORY_SEGMENTS.has(segment))) {
    return true;
  }

  const leaf = segments.at(-1) ?? "";
  return SENSITIVE_FILE_PATTERNS.some((pattern) => pattern.test(leaf));
}

export function filterLocalDataTreeEntries(entries: string[]) {
  return entries.filter((entry) => !isSensitiveLocalDataPath(entry));
}

export function readLocalDataPolicySummary(
  root = process.cwd(),
): LocalDataPolicySummary {
  return {
    canonicalContext: {
      agents: existsSync(join(root, "AGENTS.md")),
      standards: existsSync(join(root, "docs", "STANDARDS.md")),
      state: existsSync(join(root, "docs", "SYSTEM_STATE.md")),
      bible: existsSync(join(root, "docs", "PROJECT_BIBLE.md")),
    },
    legacyContext: {
      claude: existsSync(join(root, "CLAUDE.md")),
      tasks: existsSync(join(root, "tasks", "todo.md")),
      lessons: existsSync(join(root, "tasks", "lessons.md")),
    },
    blockedRoots: Array.from(SENSITIVE_DIRECTORY_SEGMENTS).sort(),
  };
}

export function listSafeLocalTree(
  dir: string,
  root: string,
  maxDepth = 3,
  depth = 0,
): string[] {
  if (depth > maxDepth) return [];

  const entries: string[] = [];
  let items: string[] = [];
  try {
    items = readdirSync(dir);
  } catch {
    return [];
  }

  for (const name of items) {
    const absolutePath = join(dir, name);
    const rel = relative(root, absolutePath);
    if (isSensitiveLocalDataPath(rel)) continue;

    try {
      const st = statSync(absolutePath);
      if (st.isDirectory()) {
        entries.push(`${rel}/`);
        entries.push(
          ...listSafeLocalTree(absolutePath, root, maxDepth, depth + 1),
        );
      } else {
        entries.push(rel);
      }
    } catch {
      /* skip inaccessible */
    }
  }

  return entries;
}
