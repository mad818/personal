#!/usr/bin/env node
/* eslint-disable no-console */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const repo = process.env.GITHUB_REPOSITORY ?? "mad818/personal";

function fail(message) {
  console.error(`x dependabot-github-closure-verify: ${message}`);
  process.exit(1);
}

function main() {
  const local = spawnSync("node", ["scripts/dependabot-open-alert-closure.mjs", "--json"], {
    cwd: root,
    encoding: "utf8",
  });
  if (local.status !== 0) fail("local closure report failed");
  const report = JSON.parse(local.stdout);
  if (report.status === "blocked_local_fix_required") {
    fail(report.blocked.join("; "));
  }

  const gh = spawnSync(
    "gh",
    ["api", `repos/${repo}/dependabot/alerts?state=open&per_page=100`],
    { encoding: "utf8" },
  );
  if (gh.status !== 0) {
    console.log("skip dependabot-github-closure-verify (gh unavailable offline)");
    process.exit(0);
  }

  const open = JSON.parse(gh.stdout);
  if (open.length > 0) {
    fail(`${open.length} open Dependabot alert(s): ${open.map((a) => `#${a.number}`).join(", ")}`);
  }

  console.log("ok dependabot-github-closure-verify (local floor + zero open GitHub alerts)");
}

main();
