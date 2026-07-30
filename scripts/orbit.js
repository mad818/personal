#!/usr/bin/env node
// scripts/orbit.js — npm run orbit:next
// Reads the canonical task queue and reports the next locally actionable
// top-level task without mutating project state.

const fs = require("fs");
const path = require("path");

const TODO_FILE = path.join(process.cwd(), "tasks", "todo.md");
const NEXT_UP_HEADING = "## Next Up";
const IN_PROGRESS_HEADING = "## In Progress";
const MAX_CLASSIFIED_TASKS = 200;
const MAX_RECEIPT_TASK_CHARS = 500;

function getSectionLines(lines, heading) {
  const start = lines.findIndex((line) => line.trim() === heading);
  if (start < 0) return null;

  const section = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();
    if (trimmed.startsWith("## ")) break;
    section.push(lines[index]);
  }
  return section;
}

function parseTopLevelPendingTaskBlocks(lines) {
  const tasks = [];
  let current = null;

  function finishCurrent() {
    if (!current) return;
    current.context = current.lines.join("\n").trim();
    delete current.lines;
    tasks.push(current);
    current = null;
  }

  for (const line of lines) {
    const checklistMatch = line.match(/^[-*]\s+\[([ xX])\]\s+(.+?)\s*$/);
    if (checklistMatch) {
      finishCurrent();
      if (checklistMatch[1].toLowerCase() === "x") continue;
      const task = checklistMatch[2].trim();
      const separator = task.indexOf(" — ");
      current = {
        key: separator >= 0 ? task.slice(0, separator).trim() : task,
        task,
        lines: [line],
      };
      continue;
    }

    if (/^##\s+/.test(line)) {
      finishCurrent();
      continue;
    }
    if (current) current.lines.push(line);
  }
  finishCurrent();
  return tasks.slice(0, MAX_CLASSIFIED_TASKS);
}

function classifyPendingTask(task) {
  const context = task.context;

  const declaredPosture = context.match(
    /^\s*-\s+Queue posture:\s+`?(blocked_external|blocked_manual)`?\b/im,
  )?.[1];
  if (declaredPosture) {
    return {
      ...task,
      classification: "blocked_or_manual",
      reason:
        declaredPosture === "blocked_manual"
          ? "declared_manual_prerequisite"
          : "declared_external_prerequisite",
    };
  }

  if (
    /remaining physical|physical phone|physical device|real phone\/iPad/i.test(
      context,
    ) ||
    /remaining manual acceptance/i.test(context)
  ) {
    return {
      ...task,
      classification: "blocked_or_manual",
      reason: "physical_or_manual_proof",
    };
  }

  if (
    /remaining closure is remote-only|until GitHub is reachable|GitHub alert closure still requires/i.test(
      context,
    )
  ) {
    return {
      ...task,
      classification: "blocked_or_manual",
      reason: "remote_state_required",
    };
  }

  if (
    /remains blocked|blocked until|after acceptance on merged `?main`?|only after .+ accepted|real staged .+hostname|real packaged artifacts|configured signing strategy/i.test(
      context,
    )
  ) {
    return {
      ...task,
      classification: "blocked_or_manual",
      reason: "external_prerequisite",
    };
  }

  return { ...task, classification: "actionable", reason: "local_ready" };
}

function buildOrbitQueue(content) {
  const lines = content.split(/\r?\n/);
  const nextUpLines = getSectionLines(lines, NEXT_UP_HEADING);
  const inProgressLines = getSectionLines(lines, IN_PROGRESS_HEADING);
  const classifySection = (sectionLines, section) =>
    parseTopLevelPendingTaskBlocks(sectionLines).map((task) => ({
      ...classifyPendingTask(task),
      section,
    }));
  const nextUpTasks = nextUpLines
    ? classifySection(nextUpLines, "next_up")
    : [];
  const inProgressTasks = inProgressLines
    ? classifySection(inProgressLines, "in_progress")
    : [];
  const fallbackTasks =
    !nextUpLines && !inProgressLines ? classifySection(lines, "full_file") : [];
  const tasks = [...nextUpTasks, ...inProgressTasks, ...fallbackTasks].slice(
    0,
    MAX_CLASSIFIED_TASKS,
  );
  const actionable = tasks.filter(
    (task) => task.classification === "actionable",
  );
  const nextUpActionable = nextUpTasks.filter(
    (task) => task.classification === "actionable",
  );
  const inProgressActionable = inProgressTasks.filter(
    (task) => task.classification === "actionable",
  );
  const next =
    nextUpActionable[0] ?? inProgressActionable[0] ?? actionable[0] ?? null;
  const blockedOrManual = tasks.filter(
    (task) => task.classification === "blocked_or_manual",
  );
  return {
    source:
      next?.section ??
      (nextUpLines ? "next_up" : inProgressLines ? "in_progress" : "full_file"),
    next,
    firstBlocker: blockedOrManual[0] ?? null,
    tasks,
    counts: {
      total: tasks.length,
      actionable: actionable.length,
      blockedOrManual: blockedOrManual.length,
    },
  };
}

function truncateReceiptTask(task) {
  if (task.length <= MAX_RECEIPT_TASK_CHARS) return task;
  return `${task.slice(0, MAX_RECEIPT_TASK_CHARS - 1).trimEnd()}…`;
}

function buildOrbitReceipt(queue) {
  return {
    command: "orbit:next",
    source: queue.source,
    next: queue.next
      ? {
          key: truncateReceiptTask(queue.next.key),
          task: truncateReceiptTask(queue.next.task),
          section: queue.next.section,
          classification: queue.next.classification,
          reason: queue.next.reason,
        }
      : null,
    firstBlocker: queue.firstBlocker
      ? {
          key: truncateReceiptTask(queue.firstBlocker.key),
          task: truncateReceiptTask(queue.firstBlocker.task),
          section: queue.firstBlocker.section,
          classification: queue.firstBlocker.classification,
          reason: queue.firstBlocker.reason,
        }
      : null,
    counts: queue.counts,
    tasks: queue.tasks.map((task) => ({
      key: truncateReceiptTask(task.key),
      task: truncateReceiptTask(task.task),
      section: task.section,
      classification: task.classification,
      reason: task.reason,
    })),
  };
}

function formatOrbitQueue(queue, options = {}) {
  const lines = ["─────────────────────────────────────────"];
  if (queue.next) {
    lines.push("ORBIT NEXT ACTIONABLE TASK");
    lines.push("─────────────────────────────────────────");
    lines.push(queue.next.task);
    lines.push("");
    lines.push(`Classification: local_ready · ${queue.next.section}`);
  } else {
    lines.push("ORBIT ACTIONABLE QUEUE");
    lines.push("─────────────────────────────────────────");
    lines.push("No locally actionable task is currently proven.");
    if (queue.firstBlocker) {
      lines.push("");
      lines.push(`First blocker: ${queue.firstBlocker.task}`);
      lines.push(`Reason: ${queue.firstBlocker.reason}`);
    }
  }
  lines.push("");
  lines.push(
    `${queue.counts.total} top-level pending: ${queue.counts.actionable} actionable, ${queue.counts.blockedOrManual} blocked/manual`,
  );

  if (options.all) {
    lines.push("");
    lines.push("QUEUE REVIEW");
    for (const task of queue.tasks) {
      lines.push(
        `- [${task.section}/${task.classification}/${task.reason}] ${task.task}`,
      );
    }
  }
  lines.push("─────────────────────────────────────────");
  return lines.join("\n");
}

function parseArgs(args) {
  const allowed = new Set(["--all", "--json"]);
  const unknown = args.filter((arg) => !allowed.has(arg));
  if (unknown.length > 0) {
    throw new Error(`unknown option: ${unknown.join(", ")}`);
  }
  return { all: args.includes("--all"), json: args.includes("--json") };
}

function main(args = process.argv.slice(2)) {
  let options;
  try {
    options = parseArgs(args);
  } catch (error) {
    console.error("Usage: npm run orbit:next -- [--all] [--json]");
    console.error(`orbit:next: ${error.message}`);
    process.exit(1);
  }

  let content;
  try {
    content = fs.readFileSync(TODO_FILE, "utf8");
  } catch {
    console.error("ERROR: tasks/todo.md not found. Run from the project root.");
    process.exit(1);
  }

  const queue = buildOrbitQueue(content);
  if (options.json) {
    console.log(JSON.stringify(buildOrbitReceipt(queue), null, 2));
    return;
  }
  console.log(formatOrbitQueue(queue, options));
}

module.exports = {
  buildOrbitQueue,
  buildOrbitReceipt,
  classifyPendingTask,
  formatOrbitQueue,
  getSectionLines,
  parseArgs,
  parseTopLevelPendingTaskBlocks,
};

if (require.main === module) main();
