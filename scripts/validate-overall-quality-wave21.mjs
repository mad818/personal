#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x overall-quality-wave21: ${message}`);
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

const newsRoute = readRequired("app", "api", "news", "route.ts");
const useArticles = readRequired("hooks", "useArticles.ts");
const liveContext = readRequired("lib", "liveContext.ts");
const repoCompare = readRequired("lib", "repoCompare.ts");
const hq = readRequired("components", "home", "office", "HQTerminalSection.tsx");
const plan = readRequired("docs", "plans", "overall-quality-wave21.md");
const pkg = readRequired("package.json");

requireText(newsRoute, "fetchGuardianNews", "news route");
requireText(newsRoute, "process.env.GUARDIAN_KEY", "news route");
if (useArticles.includes("content.guardianapis.com")) {
  fail("useArticles.ts still fetches Guardian client-side");
}
requireText(liveContext, "shouldUseCompactLiveContext", "liveContext.ts");
requireText(liveContext, "opts.compact", "liveContext.ts");
requireText(repoCompare, "correctionConstraints", "repoCompare.ts");
requireText(hq, "AgentPlatformStrip", "HQTerminalSection.tsx");
requireText(plan, "Guardian", "overall-quality-wave21.md");
requireText(pkg, "assimilation:wave21:check", "package.json");

console.log(
  "ok overall-quality-wave21 (Guardian server proxy + compact context + HQ platform strip)",
);
