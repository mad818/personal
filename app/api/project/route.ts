// ── app/api/project/route.ts ───────────────────────────────────────────────────
// Project context bridge — serves the live state of the Nexus context spine
// to any caller (agents, dashboard panels, or external tools).
//
// GET /api/project
//   Returns: AGENTS.md, docs/SYSTEM_STATE.md, docs/STANDARDS.md,
//            docs/PROJECT_BIBLE.md, component counts, and a directory tree
//            of the key source folders.
//
// GET /api/project?section=agents     → just AGENTS.md
// GET /api/project?section=standards  → just docs/STANDARDS.md
// GET /api/project?section=state      → just docs/SYSTEM_STATE.md
// GET /api/project?section=bible      → just docs/PROJECT_BIBLE.md
// GET /api/project?section=tree       → just the directory tree
// GET /api/project?section=impact     → approximate local import blast radius
//
// Legacy aliases kept for the compatibility tranche:
// GET /api/project?section=claude   → AGENTS.md
// GET /api/project?section=tasks    → docs/SYSTEM_STATE.md
// GET /api/project?section=lessons  → docs/STANDARDS.md
//
// Agents call this via fetch_url('/api/project') to understand the project
// state, active queue, and standards before making changes.

import { NextRequest } from "next/server";
import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join, relative } from "path";
import { BRAND_NAME } from "@/lib/brand";
import {
  isProjectContextSection,
  readMarkdownSection,
  resolveProjectContextSlice,
} from "@/lib/contextSpine";
import { getProjectImpact } from "@/lib/projectImpact";
import { protectedJson } from "@/lib/protectedApi";

// Project root — resolved relative to the Next.js server process CWD
const ROOT = process.cwd();

function safeRead(rel: string): string {
  const abs = join(ROOT, rel);
  if (!existsSync(abs)) return "";
  try {
    return readFileSync(abs, "utf-8");
  } catch {
    return "";
  }
}

function extractUncheckedTasks(md: string): string[] {
  return md
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^-\s+\[\s\]\s+/.test(line))
    .map((line) => line.replace(/^-\s+\[\s\]\s+/, "").trim());
}

// Recursively list files up to `maxDepth` levels, skipping noise directories.
// Returns an array of relative paths.
function listTree(dir: string, maxDepth = 3, depth = 0): string[] {
  if (depth > maxDepth) return [];
  const SKIP = new Set([
    "node_modules",
    ".next",
    ".git",
    "dist",
    ".turbo",
    "coverage",
  ]);
  const entries: string[] = [];
  let items: string[] = [];
  try {
    items = readdirSync(dir);
  } catch {
    return [];
  }

  for (const name of items) {
    if (SKIP.has(name) || name.startsWith(".")) continue;
    const abs = join(dir, name);
    const rel = relative(ROOT, abs);
    try {
      const st = statSync(abs);
      if (st.isDirectory()) {
        entries.push(`${rel}/`);
        entries.push(...listTree(abs, maxDepth, depth + 1));
      } else {
        entries.push(rel);
      }
    } catch {
      /* skip inaccessible */
    }
  }
  return entries;
}

// Count .tsx/.ts files in a directory (non-recursive)
function countFiles(rel: string, ext = ".tsx"): number {
  const abs = join(ROOT, rel);
  if (!existsSync(abs)) return 0;
  try {
    return readdirSync(abs).filter((f) => f.endsWith(ext) || f.endsWith(".ts"))
      .length;
  } catch {
    return 0;
  }
}

export async function GET(req: NextRequest) {
  const section = req.nextUrl.searchParams.get("section");
  const slice = req.nextUrl.searchParams.get("slice");

  const agentsMd = safeRead("AGENTS.md");
  const standardsMd = safeRead("docs/STANDARDS.md");
  const stateMd = safeRead("docs/SYSTEM_STATE.md");
  const bibleMd = safeRead("docs/PROJECT_BIBLE.md");

  if (section === "agents" || section === "claude") {
    const content =
      section === "agents"
        ? resolveProjectContextSlice("agents", agentsMd, slice)
        : agentsMd;
    return protectedJson({ content, section, slice: section === "agents" ? slice : null });
  }
  if (section === "standards" || section === "lessons") {
    const content =
      section === "standards"
        ? resolveProjectContextSlice("standards", standardsMd, slice)
        : standardsMd;
    return protectedJson({ content, section, slice: section === "standards" ? slice : null });
  }
  if (section === "state" || section === "tasks") {
    const content =
      section === "state"
        ? resolveProjectContextSlice("state", stateMd, slice)
        : stateMd;
    return protectedJson({ content, section, slice: section === "state" ? slice : null });
  }
  if (section === "bible") {
    const content = resolveProjectContextSlice("bible", bibleMd, slice);
    return protectedJson({ content, section, slice });
  }

  if (slice && section && !isProjectContextSection(section)) {
    return protectedJson(
      {
        error:
          "Slice mode is supported only for section=agents|standards|state|bible. Legacy aliases remain whole-file only during the compatibility tranche.",
      },
      { status: 400 },
    );
  }

  if (section === "tree") {
    // Return a focused tree of the source directories only
    const sourceDirs = [
      "app",
      "components",
      "lib",
      "store",
      "hooks",
      ".claude/skills",
    ];
    const tree: string[] = [];
    for (const d of sourceDirs) {
      tree.push(...listTree(join(ROOT, d), 2));
    }
    return protectedJson({ tree });
  }

  if (section === "impact") {
    const file = req.nextUrl.searchParams.get("file") ?? "";
    if (!file.trim()) {
      return protectedJson(
        {
          error:
            "A repo-relative file path is required, for example components/resources/ResourcesWorkbench.tsx.",
        },
        { status: 400 },
      );
    }

    const impact = getProjectImpact(ROOT, file);
    if (!impact) {
      return protectedJson(
        {
          error:
            "That file could not be resolved inside the local source roots. Use a repo-relative path under app, components, hooks, lib, or store.",
        },
        { status: 404 },
      );
    }

    return protectedJson({ impact });
  }

  // ── Full response ──────────────────────────────────────────────────────────
  // Counts give a fast sense of project size without sending the full tree
  const counts = {
    appRoutes: countFiles("app"),
    components: countFiles("components"),
    libFiles: countFiles("lib", ".ts"),
    hookFiles: countFiles("hooks", ".ts"),
    skills: existsSync(join(ROOT, ".claude/skills"))
      ? readdirSync(join(ROOT, ".claude/skills")).filter((d) =>
          statSync(join(ROOT, ".claude/skills", d)).isDirectory(),
        ).length
      : 0,
  };

  const nextUpSection = readMarkdownSection(stateMd, "## Next Up");
  const blockerSection = readMarkdownSection(stateMd, "## Active Blockers");
  const activeTasks = extractUncheckedTasks(nextUpSection);
  const blockers = blockerSection
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.replace(/^- /, "").trim());

  return protectedJson({
    meta: {
      generatedAt: new Date().toISOString(),
      projectName: BRAND_NAME,
      root: ROOT,
      counts,
    },
    state: {
      active: activeTasks.slice(0, 10),
      blockers: blockers.slice(0, 10),
      raw: stateMd.slice(0, 2500),
    },
    standards: {
      raw: standardsMd.slice(0, 2500),
    },
    bible: {
      raw: bibleMd.slice(0, 2500),
    },
    agentsMd: agentsMd.slice(0, 4000),
    // Legacy compatibility keys for one tranche.
    tasks: {
      active: activeTasks.slice(0, 10),
      raw: stateMd.slice(0, 2500),
    },
    lessons: {
      raw: standardsMd.slice(0, 2500),
    },
    claudeMd: agentsMd.slice(0, 4000),
  });
}
