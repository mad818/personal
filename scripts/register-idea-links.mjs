#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const queuePath = path.join(root, "docs", "ideas", "pending-links.json");
const URL_RE = /https?:\/\/[^\s<>"')\]]+/gi;
const SCRIPT_BUDGET_MS = 30_000;
const STDIN_READ_TIMEOUT_MS = 15_000;

const scriptBudget = setTimeout(() => {
  console.error(
    `x ideas:register: exceeded ${SCRIPT_BUDGET_MS}ms budget — aborting (stdin may be open with no data)`,
  );
  process.exit(1);
}, SCRIPT_BUDGET_MS);
scriptBudget.unref?.();

function classifyIdeaLink(url) {
  const lower = url.toLowerCase();
  if (lower.includes("github.com") || lower.includes("gitlab.com")) return "github";
  if (lower.includes("x.com/") || lower.includes("twitter.com/")) return "x";
  return "other";
}

function hashLinkFallback(input) {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}

function slugifyIdeaLinkId(url) {
  const kind = classifyIdeaLink(url);
  if (kind === "github") {
    const match = url.match(/github\.com\/([^/\s]+)\/([^/\s#?]+)/i);
    if (match) {
      return `${match[1]}-${match[2]}`.toLowerCase().replace(/[^a-z0-9-]+/g, "-");
    }
  }
  if (kind === "x") {
    const match = url.match(/status\/(\d+)/i);
    if (match) return `x-${match[1]}`;
  }
  return `link-${hashLinkFallback(url)}`;
}

function parseIdeaLinksFromText(text) {
  const matches = text.match(URL_RE) ?? [];
  return [...new Set(matches.map((url) => url.replace(/[),.;]+$/g, "").trim()))].filter(
    Boolean,
  );
}

function buildIdeaLinkIntakeItem(url, extra = {}) {
  const source = url.trim();
  return {
    id: slugifyIdeaLinkId(source),
    source,
    kind: classifyIdeaLink(source),
    status: "pending",
    addedAt: new Date().toISOString(),
    targetMatrix: `docs/ideas/source-parity/${slugifyIdeaLinkId(source)}.json`,
    ...extra,
  };
}

function mergeIdeaLinkIntakeItems(existing, incoming) {
  const bySource = new Map(existing.map((item) => [item.source, item]));
  const added = [];
  for (const item of incoming) {
    if (bySource.has(item.source)) continue;
    bySource.set(item.source, item);
    added.push(item);
  }
  return {
    merged: [...bySource.values()].sort((a, b) => b.addedAt.localeCompare(a.addedAt)),
    added,
  };
}

function readStdinWithTimeout(timeoutMs) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const timer = setTimeout(() => {
      process.stdin.destroy();
      reject(new Error(`stdin read timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => chunks.push(chunk));
    process.stdin.on("end", () => {
      clearTimeout(timer);
      resolve(chunks.join(""));
    });
    process.stdin.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    process.stdin.resume();
  });
}

async function readOptionalStdin(urlsFromArgs) {
  if (urlsFromArgs.length > 0 || process.stdin.isTTY) {
    return "";
  }
  return readStdinWithTimeout(STDIN_READ_TIMEOUT_MS);
}

function readQueue() {
  if (!fs.existsSync(queuePath)) {
    return { schemaVersion: 1, updatedAt: new Date().toISOString(), items: [] };
  }
  return JSON.parse(fs.readFileSync(queuePath, "utf8"));
}

function writeQueue(queue) {
  queue.updatedAt = new Date().toISOString();
  fs.writeFileSync(queuePath, `${JSON.stringify(queue, null, 2)}\n`, "utf8");
}

function writeStubMatrix(item) {
  if (!item.targetMatrix || item.kind === "x") return false;
  const matrixPath = path.join(root, item.targetMatrix);
  if (fs.existsSync(matrixPath)) return false;
  fs.mkdirSync(path.dirname(matrixPath), { recursive: true });
  const stub = {
    schemaVersion: 1,
    id: item.id,
    name: item.id,
    status: "foundation",
    source: {
      url: item.source,
      version: "pending-review",
      reviewedAt: new Date().toISOString().slice(0, 10),
      license: "unknown",
      primaryEvidence: [item.source, ...(item.sourcePost ? [item.sourcePost] : [])],
    },
    capabilities: [
      {
        id: "inventory-pending",
        title: "Exhaustive capability inventory not started",
        sourceEvidence: item.source,
        disposition: "pending",
        reason: "Batch-registered — capability inventory not started.",
        proof: ["docs/ideas/link-intake.md"],
      },
    ],
  };
  fs.writeFileSync(matrixPath, `${JSON.stringify(stub, null, 2)}\n`, "utf8");
  return true;
}

async function main() {
  const argText = process.argv.slice(2).join(" ");
  const urlsFromArgs = parseIdeaLinksFromText(argText);
  const stdin = await readOptionalStdin(urlsFromArgs);
  const urls = parseIdeaLinksFromText(`${argText}\n${stdin}`);
  if (!urls.length) {
    console.error("usage: npm run ideas:register -- <url> [url...]");
    console.error("   or: cat links.txt | npm run ideas:register");
    process.exit(1);
  }

  const queue = readQueue();
  const incoming = urls.map((url) => buildIdeaLinkIntakeItem(url));
  const { merged, added } = mergeIdeaLinkIntakeItems(queue.items ?? [], incoming);
  queue.items = merged;
  writeQueue(queue);

  let matricesCreated = 0;
  for (const item of added) {
    if (writeStubMatrix(item)) matricesCreated++;
    console.log(`+ ${item.source} → ${item.targetMatrix ?? "(x post, no matrix)"}`);
  }

  clearTimeout(scriptBudget);

  if (!added.length) {
    console.log("No new links (all URLs already registered).");
  } else {
    console.log(
      `Registered ${added.length} link(s); created ${matricesCreated} stub matrix/matrices.`,
    );
  }
}

main().catch((error) => {
  clearTimeout(scriptBudget);
  console.error(`x ideas:register: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
