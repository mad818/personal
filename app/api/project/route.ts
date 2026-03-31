// ── app/api/project/route.ts ───────────────────────────────────────────────────
// Project context bridge — serves the live state of the Nexus Prime project
// to any caller (agents, dashboard panels, or external tools).
//
// GET /api/project
//   Returns: CLAUDE.md, tasks/todo.md, tasks/lessons.md, component counts,
//            and a directory tree of the key source folders.
//
// GET /api/project?section=claude    → just CLAUDE.md
// GET /api/project?section=tasks     → just tasks/todo.md
// GET /api/project?section=lessons   → just tasks/lessons.md
// GET /api/project?section=tree      → just the directory tree
//
// Agents call this via fetch_url('/api/project') to understand the project
// state, active tasks, and lessons learned before making changes.

import { NextRequest, NextResponse } from "next/server";
import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join, relative } from "path";

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

  const claudeMd = safeRead("CLAUDE.md");
  const todoMd = safeRead("tasks/todo.md");
  const lessonsMd = safeRead("tasks/lessons.md");

  if (section === "claude") return NextResponse.json({ content: claudeMd });
  if (section === "tasks") return NextResponse.json({ content: todoMd });
  if (section === "lessons") return NextResponse.json({ content: lessonsMd });

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
    return NextResponse.json({ tree });
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

  // Parse a minimal task summary from todo.md
  const activeTasks: string[] = [];
  const completedTasks: string[] = [];
  for (const line of todoMd.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("- [ ]") || trimmed.match(/pending|in.progress/i)) {
      activeTasks.push(trimmed.replace(/^[-*]\s*\[.\]\s*/, ""));
    } else if (trimmed.startsWith("- [x]") || trimmed.match(/complete|done/i)) {
      completedTasks.push(trimmed.replace(/^[-*]\s*\[.\]\s*/, ""));
    }
  }

  return NextResponse.json({
    meta: {
      generatedAt: new Date().toISOString(),
      projectName: "Nexus Prime",
      root: ROOT,
      counts,
    },
    tasks: {
      active: activeTasks.slice(0, 10),
      completed: completedTasks.slice(0, 10),
      raw: todoMd.slice(0, 2000), // first 2k chars of raw file
    },
    lessons: {
      raw: lessonsMd.slice(0, 2000),
    },
    // CLAUDE.md is long — truncate to first 4000 chars for inline delivery.
    // Agents that need the full file should use read_project_file('CLAUDE.md').
    claudeMd: claudeMd.slice(0, 4000),
  });
}
