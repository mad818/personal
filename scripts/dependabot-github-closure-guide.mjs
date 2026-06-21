#!/usr/bin/env node
/* eslint-disable no-console */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function main() {
  const report = spawnSync("node", ["scripts/dependabot-open-alert-closure.mjs", "--json"], {
    cwd: root,
    encoding: "utf8",
    shell: false,
  });
  if (report.status !== 0) {
    console.error("x dependabot-github-closure-guide: closure report failed");
    process.exit(1);
  }
  const payload = JSON.parse(report.stdout);
  console.log("Dependabot GitHub closure — operator commands (run manually with gh auth):");
  console.log("");
  if (payload.jsYaml?.externalAction) {
    console.log(`# js-yaml (${payload.jsYaml.packageName})`);
    console.log(payload.jsYaml.externalAction);
    console.log("");
  }
  if (payload.glib?.externalAction) {
    console.log(`# glib (${payload.glib.packageName})`);
    console.log(payload.glib.externalAction);
    console.log("");
  }
  console.log("Proof after GitHub UI updates:");
  console.log("  npm run dependabot:open:closure:check");
}

main();
