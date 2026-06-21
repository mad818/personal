#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x ideas-link-intake: ${message}`);
  process.exit(1);
}

function readRequired(...parts) {
  const filePath = path.join(root, ...parts);
  if (!fs.existsSync(filePath)) {
    fail(`${parts.join("/")} is missing`);
  }
  return fs.readFileSync(filePath, "utf8");
}

function requireText(source, needle, label) {
  if (!source.includes(needle)) {
    fail(`${label} is missing "${needle}"`);
  }
}

const lib = readRequired("lib", "ideaLinkIntake.ts");
const route = readRequired("app", "api", "ideas", "intake", "route.ts");
const panel = readRequired("components", "recon", "IdeaLinkIntakePanel.tsx");
const guide = readRequired("docs", "ideas", "link-intake.md");
const queue = JSON.parse(readRequired("docs", "ideas", "pending-links.json"));
const pkg = readRequired("package.json");
const recon = readRequired("app", "recon", "page.tsx");

requireText(lib, "parseIdeaLinksFromText", "ideaLinkIntake.ts");
requireText(lib, "buildIdeaLinkIntakeItem", "ideaLinkIntake.ts");
requireText(route, "mergeIdeaLinkIntakeItems", "ideas intake route");
requireText(panel, "Register links", "IdeaLinkIntakePanel.tsx");
requireText(guide, "npm run ideas:register", "link-intake.md");
requireText(recon, "IdeaLinkIntakePanel", "recon page");
requireText(pkg, "ideas:register", "package.json");
requireText(pkg, "ideas:link-intake:check", "package.json");

const registerScript = pkg.match(/"ideas:register"\s*:\s*"([^"]+)"/)?.[1] ?? "";
if (!registerScript.includes("register-idea-links.mjs")) {
  fail('package.json ideas:register must invoke scripts/register-idea-links.mjs');
}
if (registerScript.includes("experimental-strip-types")) {
  fail("package.json ideas:register must not use experimental-strip-types (hangs on Windows)");
}

const registerSource = readRequired("scripts", "register-idea-links.mjs");
if (registerSource.includes("readFileSync(0")) {
  fail("register-idea-links.mjs must not block on readFileSync(0) — use readOptionalStdin");
}
requireText(registerSource, "readOptionalStdin", "register-idea-links.mjs");
requireText(registerSource, "SCRIPT_BUDGET_MS", "register-idea-links.mjs");

if (!Array.isArray(queue.items)) {
  fail("pending-links.json items must be an array");
}

console.log(
  `ok ideas-link-intake (queue ready, ${queue.items.length} pending item(s) registered)`,
);
