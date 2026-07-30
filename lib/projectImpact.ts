import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { dirname, join, relative } from "path";

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

export type ProjectImpactBlastRadius = "narrow" | "moderate" | "wide";
export type ProjectImpactReason = "target" | "depends_on" | "depended_on_by";

export interface ProjectImpactPath {
  path: string;
  reasons: ProjectImpactReason[];
}

export interface ProjectImpactResult {
  target: string;
  directImports: string[];
  importers: string[];
  likelyTouched: ProjectImpactPath[];
  reviewPack: string[];
  blastRadius: ProjectImpactBlastRadius;
  warnings: string[];
  stats: {
    scannedFiles: number;
    directImports: number;
    importers: number;
    likelyTouched: number;
  };
}

function normalizeRepoPath(value: string) {
  return value
    .replace(/\\/g, "/")
    .replace(/^\.\/+/, "")
    .replace(/^\/+/, "");
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
  return SOURCE_ROOTS.some(
    (root) => path === root || path.startsWith(`${root}/`),
  );
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
        SOURCE_EXTENSIONS.some((extension) =>
          relativePath.endsWith(extension),
        ) &&
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

function resolveCandidate(
  basePath: string,
  files: ReadonlySet<string>,
): string | null {
  const normalizedBase = normalizeRelativeImport(basePath);
  if (!normalizedBase || !isAllowedSourcePath(normalizedBase)) return null;

  const candidates = [normalizedBase];
  if (
    !SOURCE_EXTENSIONS.some((extension) => normalizedBase.endsWith(extension))
  ) {
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

function computeBlastRadius(count: number): ProjectImpactBlastRadius {
  if (count >= 10) return "wide";
  if (count >= 5) return "moderate";
  return "narrow";
}

function buildLikelyTouched(
  target: string,
  directImports: string[],
  importers: string[],
) {
  const touched = new Map<string, Set<ProjectImpactReason>>();
  touched.set(target, new Set<ProjectImpactReason>(["target"]));

  for (const importedPath of directImports) {
    const reasons = touched.get(importedPath) ?? new Set<ProjectImpactReason>();
    reasons.add("depends_on");
    touched.set(importedPath, reasons);
  }

  for (const importerPath of importers) {
    const reasons = touched.get(importerPath) ?? new Set<ProjectImpactReason>();
    reasons.add("depended_on_by");
    touched.set(importerPath, reasons);
  }

  const orderedPaths = [target, ...importers, ...directImports];
  return Array.from(touched.entries())
    .sort((left, right) => {
      const leftOrder = orderedPaths.indexOf(left[0]);
      const rightOrder = orderedPaths.indexOf(right[0]);
      return leftOrder - rightOrder || left[0].localeCompare(right[0]);
    })
    .map(([path, reasons]) => ({
      path,
      reasons: Array.from(reasons),
    }));
}

export function getProjectImpact(
  root: string,
  file: string,
): ProjectImpactResult | null {
  const sourceFiles = listSourceFiles(root);
  const fileSet = new Set(sourceFiles);
  const target = resolveRequestedFile(file, fileSet);
  if (!target) return null;

  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, Set<string>>();

  for (const sourceFile of sourceFiles) {
    const source = safeRead(root, sourceFile);
    const resolvedImports = Array.from(
      new Set(
        extractImportSpecifiers(source)
          .map((specifier) =>
            resolveImportSpecifier(sourceFile, specifier, fileSet),
          )
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

  const directImports = outgoing.get(target) ?? [];
  const importers = Array.from(incoming.get(target) ?? []).sort((left, right) =>
    left.localeCompare(right),
  );
  const likelyTouched = buildLikelyTouched(target, directImports, importers);
  const warnings: string[] = [];

  if (importers.length === 0) {
    warnings.push(
      "No local importers were found. This may be an entry surface, a dynamically loaded module, or a file outside the current scan heuristics.",
    );
  }
  if (directImports.length === 0) {
    warnings.push(
      "No local imports were found. This can be normal for route entries, leaf helpers, or files that mostly depend on framework/runtime globals.",
    );
  }

  return {
    target,
    directImports,
    importers,
    likelyTouched,
    reviewPack: likelyTouched.map((entry) => entry.path).slice(0, 12),
    blastRadius: computeBlastRadius(likelyTouched.length),
    warnings,
    stats: {
      scannedFiles: sourceFiles.length,
      directImports: directImports.length,
      importers: importers.length,
      likelyTouched: likelyTouched.length,
    },
  };
}

export function listProjectImpactCandidates(root: string) {
  return listSourceFiles(root);
}
