import { execFileSync } from "child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { dirname, join, relative } from "path";
import {
  classifyProjectArtifact,
  type ArtifactClassification,
} from "./artifactClassification.ts";

const SOURCE_ROOTS = ["app", "components", "hooks", "lib", "store"] as const;
const SOURCE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"] as const;
const SKIP_DIRS = new Set([
  ".git",
  ".next",
  ".turbo",
  "coverage",
  "dist",
  "node_modules",
]);

export interface ProjectGraphNode {
  path: string;
  directImports: number;
  importers: number;
  coupling: number;
  artifactClassification: ArtifactClassification;
}

export interface ProjectGraphEdge {
  source: string;
  target: string;
}

export interface ProjectGraphResult {
  target?: string;
  nodes: ProjectGraphNode[];
  edges: ProjectGraphEdge[];
  circularDependencies: string[][];
  isolatedFiles: string[];
  highCouplingFiles: string[];
  reviewPack: string[];
  stats: {
    scannedFiles: number;
    nodeCount: number;
    edgeCount: number;
    cycleCount: number;
  };
}

export interface ProjectOwnershipEntry {
  path: string;
  lastAuthor: string;
  lastTouchedAt: string | null;
  changeCount: number;
  coupling: number;
  artifactClassification: ArtifactClassification;
}

export interface ProjectOwnershipResult {
  owners: ProjectOwnershipEntry[];
  recentAuthors: Array<{ author: string; count: number }>;
  detail: string;
}

export interface ProjectHotspotEntry {
  path: string;
  changeCount: number;
  coupling: number;
  hotspotScore: number;
  lastTouchedAt: string | null;
  artifactClassification: ArtifactClassification;
}

export interface ProjectHotspotResult {
  hotspots: ProjectHotspotEntry[];
  detail: string;
}

export type ProjectSecuritySeverity = "medium" | "high";

export interface ProjectSecurityFinding {
  id: string;
  kind:
    | "hardcoded-secret"
    | "dangerous-eval"
    | "html-injection"
    | "shell-composition"
    | "new-function";
  severity: ProjectSecuritySeverity;
  label: string;
  path: string;
  detail: string;
  artifactClassification: ArtifactClassification;
}

export interface ProjectSecurityResult {
  target?: string;
  findings: ProjectSecurityFinding[];
  circularDependencies: string[][];
  isolatedFiles: string[];
  highCouplingFiles: string[];
  stats: {
    findingCount: number;
    highSeverityCount: number;
    cycleCount: number;
    isolatedCount: number;
  };
}

interface ProjectImportIndex {
  sourceFiles: string[];
  fileSet: Set<string>;
  outgoing: Map<string, string[]>;
  incoming: Map<string, Set<string>>;
}

interface GitActivity {
  byPath: Map<
    string,
    {
      changeCount: number;
      lastTouchedAt: string | null;
      lastAuthor: string;
    }
  >;
  authorCounts: Map<string, number>;
}

function normalizeRepoPath(value: string) {
  return value.replace(/\\/g, "/").replace(/^\.\/+/, "").replace(/^\/+/, "");
}

function normalizeRelativeImport(value: string) {
  const parts: string[] = [];
  for (const segment of normalizeRepoPath(value).split("/")) {
    if (!segment || segment === ".") continue;
    if (segment === "..") {
      parts.pop();
      continue;
    }
    parts.push(segment);
  }
  return parts.join("/");
}

function isAllowedSourcePath(path: string) {
  return SOURCE_ROOTS.some((root) => path === root || path.startsWith(`${root}/`));
}

function listSourceFiles(root: string) {
  const results: string[] = [];

  function walk(dir: string) {
    let entries: string[] = [];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }

    for (const name of entries) {
      if (SKIP_DIRS.has(name)) continue;
      const absolutePath = join(dir, name);
      let stats;
      try {
        stats = statSync(absolutePath);
      } catch {
        continue;
      }

      if (stats.isDirectory()) {
        walk(absolutePath);
        continue;
      }

      const relativePath = normalizeRepoPath(relative(root, absolutePath));
      if (
        SOURCE_EXTENSIONS.some((extension) => relativePath.endsWith(extension)) &&
        isAllowedSourcePath(relativePath)
      ) {
        results.push(relativePath);
      }
    }
  }

  for (const sourceRoot of SOURCE_ROOTS) {
    const absolutePath = join(root, sourceRoot);
    if (!existsSync(absolutePath)) continue;
    walk(absolutePath);
  }

  return results.sort((left, right) => left.localeCompare(right));
}

function safeRead(root: string, path: string) {
  try {
    return readFileSync(join(root, path), "utf-8");
  } catch {
    return "";
  }
}

function buildProjectArtifactClassificationMap(
  root: string,
  paths: readonly string[],
) {
  const classifications = new Map<string, ArtifactClassification>();
  for (const path of paths) {
    classifications.set(path, classifyProjectArtifact(path, safeRead(root, path)));
  }
  return classifications;
}

function extractImportSpecifiers(source: string) {
  const specifiers = new Set<string>();
  const patterns = [
    /\bimport\s+(?:[^"'`]+?\s+from\s+)?["'`]([^"'`]+)["'`]/g,
    /\bexport\s+(?:[^"'`]+?\s+from\s+)?["'`]([^"'`]+)["'`]/g,
    /\brequire\(\s*["'`]([^"'`]+)["'`]\s*\)/g,
    /\bimport\(\s*["'`]([^"'`]+)["'`]\s*\)/g,
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null = null;
    while ((match = pattern.exec(source)) !== null) {
      const candidate = match[1]?.trim();
      if (candidate) specifiers.add(candidate);
    }
  }

  return Array.from(specifiers);
}

function resolveCandidate(basePath: string, files: ReadonlySet<string>): string | null {
  const normalizedBase = normalizeRelativeImport(basePath);
  if (!normalizedBase || !isAllowedSourcePath(normalizedBase)) return null;

  const candidates = [normalizedBase];
  if (!SOURCE_EXTENSIONS.some((extension) => normalizedBase.endsWith(extension))) {
    for (const extension of SOURCE_EXTENSIONS) {
      candidates.push(`${normalizedBase}${extension}`);
      candidates.push(`${normalizedBase}/index${extension}`);
    }
  }

  for (const candidate of candidates) {
    if (files.has(candidate)) return candidate;
  }
  return null;
}

function resolveRequestedFile(file: string, files: ReadonlySet<string>) {
  const normalized = normalizeRelativeImport(
    file.startsWith("@/") ? file.slice(2) : file,
  );
  return resolveCandidate(normalized, files);
}

function resolveImportSpecifier(
  importer: string,
  specifier: string,
  files: ReadonlySet<string>,
) {
  if (specifier.startsWith("@/")) {
    return resolveCandidate(specifier.slice(2), files);
  }

  if (specifier.startsWith(".")) {
    const importerDir = normalizeRepoPath(dirname(importer));
    const basePath = normalizeRelativeImport(`${importerDir}/${specifier}`);
    return resolveCandidate(basePath, files);
  }

  return null;
}

function buildProjectImportIndex(root: string): ProjectImportIndex {
  const sourceFiles = listSourceFiles(root);
  const fileSet = new Set(sourceFiles);
  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, Set<string>>();

  for (const sourceFile of sourceFiles) {
    const source = safeRead(root, sourceFile);
    const resolvedImports = Array.from(
      new Set(
        extractImportSpecifiers(source)
          .map((specifier) => resolveImportSpecifier(sourceFile, specifier, fileSet))
          .filter((path): path is string => Boolean(path)),
      ),
    ).sort((left, right) => left.localeCompare(right));

    outgoing.set(sourceFile, resolvedImports);
    for (const importedPath of resolvedImports) {
      const importers = incoming.get(importedPath) ?? new Set<string>();
      importers.add(sourceFile);
      incoming.set(importedPath, importers);
    }
  }

  return { sourceFiles, fileSet, outgoing, incoming };
}

function couplingForPath(index: ProjectImportIndex, path: string) {
  const imports = index.outgoing.get(path)?.length ?? 0;
  const importers = index.incoming.get(path)?.size ?? 0;
  return imports + importers;
}

function buildReviewPack(index: ProjectImportIndex, target: string | null) {
  if (!target) return [];
  const directImports = index.outgoing.get(target) ?? [];
  const importers = Array.from(index.incoming.get(target) ?? []);
  return Array.from(new Set([target, ...importers, ...directImports])).slice(0, 14);
}

function detectCircularDependencies(index: ProjectImportIndex) {
  const cycles = new Set<string>();
  const stack: string[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();

  function visit(node: string) {
    if (visiting.has(node)) {
      const start = stack.indexOf(node);
      if (start >= 0) {
        const cycle = [...stack.slice(start), node];
        cycles.add(cycle.join(" -> "));
      }
      return;
    }
    if (visited.has(node)) return;
    visiting.add(node);
    stack.push(node);
    for (const next of index.outgoing.get(node) ?? []) {
      visit(next);
    }
    stack.pop();
    visiting.delete(node);
    visited.add(node);
  }

  for (const file of index.sourceFiles) visit(file);
  return Array.from(cycles).map((cycle) => cycle.split(" -> "));
}

function detectIsolatedFiles(index: ProjectImportIndex) {
  return index.sourceFiles.filter((file) => {
    const directImports = index.outgoing.get(file)?.length ?? 0;
    const importers = index.incoming.get(file)?.size ?? 0;
    return directImports === 0 && importers === 0;
  });
}

function detectHighCouplingFiles(index: ProjectImportIndex) {
  return index.sourceFiles
    .filter((file) => couplingForPath(index, file) >= 10)
    .sort((left, right) => couplingForPath(index, right) - couplingForPath(index, left))
    .slice(0, 12);
}

function buildGraphNodes(
  index: ProjectImportIndex,
  classifications: ReadonlyMap<string, ArtifactClassification>,
) {
  return index.sourceFiles.map((path) => ({
    path,
    directImports: index.outgoing.get(path)?.length ?? 0,
    importers: index.incoming.get(path)?.size ?? 0,
    coupling: couplingForPath(index, path),
    artifactClassification:
      classifications.get(path) ?? classifyProjectArtifact(path),
  }));
}

function buildGraphEdges(index: ProjectImportIndex) {
  return Array.from(index.outgoing.entries())
    .flatMap(([source, targets]) => targets.map((target) => ({ source, target })))
    .slice(0, 320);
}

function buildGitActivity(root: string, sourceFiles: string[]): GitActivity {
  const byPath = new Map<string, { changeCount: number; lastTouchedAt: string | null; lastAuthor: string }>();
  const authorCounts = new Map<string, number>();

  try {
    const output = execFileSync(
      "git",
      ["-C", root, "log", "--since=180 days ago", "--name-only", "--pretty=format:__COMMIT__%an|%cI"],
      {
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "ignore"],
        maxBuffer: 8 * 1024 * 1024,
      },
    );

    let currentAuthor = "Unknown";
    let currentDate: string | null = null;
    for (const rawLine of output.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line) continue;
      if (line.startsWith("__COMMIT__")) {
        const payload = line.replace("__COMMIT__", "");
        const [author, date] = payload.split("|");
        currentAuthor = author?.trim() || "Unknown";
        currentDate = date?.trim() || null;
        authorCounts.set(currentAuthor, (authorCounts.get(currentAuthor) ?? 0) + 1);
        continue;
      }
      const path = normalizeRepoPath(line);
      if (!sourceFiles.includes(path)) continue;
      const existing = byPath.get(path);
      if (!existing) {
        byPath.set(path, {
          changeCount: 1,
          lastTouchedAt: currentDate,
          lastAuthor: currentAuthor,
        });
      } else {
        byPath.set(path, {
          changeCount: existing.changeCount + 1,
          lastTouchedAt: existing.lastTouchedAt ?? currentDate,
          lastAuthor: existing.lastAuthor || currentAuthor,
        });
      }
    }
  } catch {
    for (const path of sourceFiles) {
      try {
        const stats = statSync(join(root, path));
        byPath.set(path, {
          changeCount: 0,
          lastTouchedAt: stats.mtime.toISOString(),
          lastAuthor: "Local history unavailable",
        });
      } catch {
        byPath.set(path, {
          changeCount: 0,
          lastTouchedAt: null,
          lastAuthor: "Local history unavailable",
        });
      }
    }
  }

  for (const path of sourceFiles) {
    if (byPath.has(path)) continue;
    try {
      const stats = statSync(join(root, path));
      byPath.set(path, {
        changeCount: 0,
        lastTouchedAt: stats.mtime.toISOString(),
        lastAuthor: "Local history unavailable",
      });
    } catch {
      byPath.set(path, {
        changeCount: 0,
        lastTouchedAt: null,
        lastAuthor: "Local history unavailable",
      });
    }
  }

  return { byPath, authorCounts };
}

const SECURITY_PATTERNS: Array<{
  kind: ProjectSecurityFinding["kind"];
  severity: ProjectSecuritySeverity;
  label: string;
  detail: string;
  pattern: RegExp;
}> = [
  {
    kind: "hardcoded-secret",
    severity: "high",
    label: "Possible hardcoded secret",
    detail: "This file matches a credential-like assignment pattern and should be reviewed for accidental secret exposure.",
    pattern:
      /\b(?:api[_-]?key|secret|token|password|passwd|client_secret)\b[^=\n]{0,32}[:=]\s*["'`][^"'`\n]{8,}["'`]/i,
  },
  {
    kind: "dangerous-eval",
    severity: "high",
    label: "Dangerous eval usage",
    detail: "Dynamic code execution increases injection and sandbox-escape risk when input is not tightly controlled.",
    pattern: /\beval\s*\(/,
  },
  {
    kind: "new-function",
    severity: "high",
    label: "Dynamic Function constructor",
    detail: "The Function constructor behaves like eval and should be treated as an injection sink.",
    pattern: /\bnew\s+Function\s*\(/,
  },
  {
    kind: "html-injection",
    severity: "high",
    label: "Risky HTML injection sink",
    detail: "Direct HTML insertion paths should be reviewed for untrusted content handling and sanitization gaps.",
    pattern: /\bdangerouslySetInnerHTML\b|(?:\.innerHTML|\.outerHTML)\s*=|\binsertAdjacentHTML\s*\(/,
  },
  {
    kind: "shell-composition",
    severity: "high",
    label: "Shell composition sink",
    detail: "Shell execution and spawned command composition should be reviewed for argument escaping and untrusted input flow.",
    pattern: /\b(?:exec|execSync|execFile|execFileSync|spawn|spawnSync|fork)\s*\(|\bcmd\s*\/c\b|\bpowershell\b/i,
  },
];

export function getProjectGraph(root: string, file?: string | null): ProjectGraphResult {
  const index = buildProjectImportIndex(root);
  const classifications = buildProjectArtifactClassificationMap(root, index.sourceFiles);
  const target = file ? resolveRequestedFile(file, index.fileSet) : null;
  const circularDependencies = detectCircularDependencies(index);
  const isolatedFiles = detectIsolatedFiles(index);
  const highCouplingFiles = detectHighCouplingFiles(index);
  const nodes = buildGraphNodes(index, classifications)
    .sort((left, right) => right.coupling - left.coupling || left.path.localeCompare(right.path))
    .slice(0, 80);
  const edges = buildGraphEdges(index);

  return {
    target: target ?? undefined,
    nodes,
    edges,
    circularDependencies,
    isolatedFiles: isolatedFiles.slice(0, 24),
    highCouplingFiles,
    reviewPack: buildReviewPack(index, target),
    stats: {
      scannedFiles: index.sourceFiles.length,
      nodeCount: index.sourceFiles.length,
      edgeCount: edges.length,
      cycleCount: circularDependencies.length,
    },
  };
}

export function getProjectOwnership(root: string, file?: string | null): ProjectOwnershipResult {
  const index = buildProjectImportIndex(root);
  const classifications = buildProjectArtifactClassificationMap(root, index.sourceFiles);
  const target = file ? resolveRequestedFile(file, index.fileSet) : null;
  const reviewPack = buildReviewPack(index, target);
  const activity = buildGitActivity(root, index.sourceFiles);
  const focusPaths = reviewPack.length > 0 ? reviewPack : index.sourceFiles.slice(0, 18);
  const owners = focusPaths
    .map((path) => {
      const details = activity.byPath.get(path);
      return {
        path,
        lastAuthor: details?.lastAuthor ?? "Unknown",
        lastTouchedAt: details?.lastTouchedAt ?? null,
        changeCount: details?.changeCount ?? 0,
        coupling: couplingForPath(index, path),
        artifactClassification:
          classifications.get(path) ?? classifyProjectArtifact(path),
      };
    })
    .sort((left, right) => right.changeCount - left.changeCount || right.coupling - left.coupling);

  return {
    owners,
    recentAuthors: Array.from(activity.authorCounts.entries())
      .map(([author, count]) => ({ author, count }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 8),
    detail:
      reviewPack.length > 0
        ? "Ownership is biased toward the current review pack so the likely editors and recent activity stay close to the target file."
        : "Ownership falls back to the local repo history and file system timestamps when git detail is limited.",
  };
}

export function getProjectHotspots(root: string, file?: string | null): ProjectHotspotResult {
  const index = buildProjectImportIndex(root);
  const classifications = buildProjectArtifactClassificationMap(root, index.sourceFiles);
  const activity = buildGitActivity(root, index.sourceFiles);
  const target = file ? resolveRequestedFile(file, index.fileSet) : null;
  const preferred = new Set(buildReviewPack(index, target));

  const hotspots = index.sourceFiles
    .map((path) => {
      const details = activity.byPath.get(path);
      const changeCount = details?.changeCount ?? 0;
      const coupling = couplingForPath(index, path);
      const hotspotScore = changeCount * 2 + coupling + (preferred.has(path) ? 3 : 0);
      return {
        path,
        changeCount,
        coupling,
        hotspotScore,
        lastTouchedAt: details?.lastTouchedAt ?? null,
        artifactClassification:
          classifications.get(path) ?? classifyProjectArtifact(path),
      };
    })
    .sort((left, right) => right.hotspotScore - left.hotspotScore || left.path.localeCompare(right.path))
    .slice(0, 16);

  return {
    hotspots,
    detail:
      "Hotspots combine recent local change activity with import coupling so the riskiest blast-radius files stay visible before edits widen.",
  };
}

export function getProjectSecurity(root: string, file?: string | null): ProjectSecurityResult {
  const index = buildProjectImportIndex(root);
  const classifications = buildProjectArtifactClassificationMap(root, index.sourceFiles);
  const target = file ? resolveRequestedFile(file, index.fileSet) : null;
  const reviewPack = new Set(buildReviewPack(index, target));
  const highCouplingFiles = detectHighCouplingFiles(index);
  const circularDependencies = detectCircularDependencies(index);
  const isolatedFiles = detectIsolatedFiles(index);
  const findings: ProjectSecurityFinding[] = [];

  for (const path of index.sourceFiles) {
    const source = safeRead(root, path);
    for (const pattern of SECURITY_PATTERNS) {
      if (!pattern.pattern.test(source)) continue;
      findings.push({
        id: `${pattern.kind}:${path}`,
        kind: pattern.kind,
        severity: pattern.severity,
        label: pattern.label,
        path,
        detail: pattern.detail,
        artifactClassification:
          classifications.get(path) ?? classifyProjectArtifact(path, source),
      });
    }
  }

  const sortedFindings = findings
    .sort((left, right) => {
      const severityScore = left.severity === right.severity ? 0 : left.severity === "high" ? -1 : 1;
      if (severityScore !== 0) return severityScore;
      const reviewBoost = Number(reviewPack.has(right.path)) - Number(reviewPack.has(left.path));
      if (reviewBoost !== 0) return reviewBoost;
      return left.path.localeCompare(right.path);
    })
    .slice(0, 24);

  return {
    target: target ?? undefined,
    findings: sortedFindings,
    circularDependencies,
    isolatedFiles: isolatedFiles.slice(0, 16),
    highCouplingFiles,
    stats: {
      findingCount: sortedFindings.length,
      highSeverityCount: sortedFindings.filter((finding) => finding.severity === "high").length,
      cycleCount: circularDependencies.length,
      isolatedCount: isolatedFiles.length,
    },
  };
}
