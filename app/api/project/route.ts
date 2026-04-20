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
// GET /api/project?section=graph      → local dependency graph + coupling
// GET /api/project?section=ownership  → recent ownership + activity summary
// GET /api/project?section=hotspots   → change/coupling hotspots
// GET /api/project?section=security   → lightweight local security heuristics
//
// Legacy aliases kept for the compatibility tranche:
// GET /api/project?section=claude   → AGENTS.md
// GET /api/project?section=tasks    → docs/SYSTEM_STATE.md
// GET /api/project?section=lessons  → docs/STANDARDS.md
//
// Agents call this via fetch_url('/api/project') to understand the project
// state, active queue, and standards before making changes.

import { NextRequest } from "next/server";
import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { BRAND_NAME } from "@/lib/brand";
import {
  isProjectContextSection,
  readMarkdownSection,
  resolveProjectContextSlice,
} from "@/lib/contextSpine";
import { getProjectImpact } from "@/lib/projectImpact";
import {
  getProjectGraph,
  getProjectHotspots,
  getProjectOwnership,
  getProjectSecurity,
} from "@/lib/projectArchitecture";
import { protectedJson } from "@/lib/protectedApi";
import {
  filterLocalDataTreeEntries,
  listSafeLocalTree,
  readLocalDataPolicySummary,
} from "@/lib/security/localDataPolicy";

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
  return filterLocalDataTreeEntries(listSafeLocalTree(dir, ROOT, maxDepth, depth));
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

function readContextBundle() {
  const agentsMd = safeRead("AGENTS.md") || safeRead("CLAUDE.md");
  const standardsMd = safeRead("docs/STANDARDS.md") || safeRead("tasks/lessons.md");
  const stateMd = safeRead("docs/SYSTEM_STATE.md") || safeRead("tasks/todo.md");
  const bibleMd = safeRead("docs/PROJECT_BIBLE.md");

  return { agentsMd, standardsMd, stateMd, bibleMd };
}

export async function GET(req: NextRequest) {
  const section = req.nextUrl.searchParams.get("section");
  const slice = req.nextUrl.searchParams.get("slice");

  const { agentsMd, standardsMd, stateMd, bibleMd } = readContextBundle();

  if (section === "agents" || section === "claude") {
    const content =
      section === "agents"
        ? resolveProjectContextSlice("agents", agentsMd, slice)
        : agentsMd;
    return protectedJson({
      content,
      section,
      slice: section === "agents" ? slice : null,
    });
  }
  if (section === "standards" || section === "lessons") {
    const content =
      section === "standards"
        ? resolveProjectContextSlice("standards", standardsMd, slice)
        : standardsMd;
    return protectedJson({
      content,
      section,
      slice: section === "standards" ? slice : null,
    });
  }
  if (section === "state" || section === "tasks") {
    const content =
      section === "state"
        ? resolveProjectContextSlice("state", stateMd, slice)
        : stateMd;
    return protectedJson({
      content,
      section,
      slice: section === "state" ? slice : null,
    });
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
    const sourceDirs = ["app", "components", "lib", "store", "hooks"];
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

  if (section === "graph") {
    const file = req.nextUrl.searchParams.get("file");
    return protectedJson({ graph: getProjectGraph(ROOT, file) });
  }

  if (section === "ownership") {
    const file = req.nextUrl.searchParams.get("file");
    return protectedJson({ ownership: getProjectOwnership(ROOT, file) });
  }

  if (section === "hotspots") {
    const file = req.nextUrl.searchParams.get("file");
    return protectedJson({ hotspots: getProjectHotspots(ROOT, file) });
  }

  if (section === "security") {
    const file = req.nextUrl.searchParams.get("file");
    return protectedJson({ security: getProjectSecurity(ROOT, file) });
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
    summary: {
      generatedAt: new Date().toISOString(),
      projectName: BRAND_NAME,
      root: ROOT,
      counts,
      localData: readLocalDataPolicySummary(ROOT),
      activeTasks: activeTasks.slice(0, 10),
      blockers: blockers.slice(0, 10),
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
