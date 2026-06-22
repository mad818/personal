#!/usr/bin/env node
/* eslint-disable no-console */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const repo = process.env.GITHUB_REPOSITORY ?? "mad818/personal";
const dryRun = process.argv.includes("--dry-run");

function fail(message) {
  console.error(`x dependabot-github-closure-apply: ${message}`);
  process.exit(1);
}

function runGh(args) {
  const result = spawnSync("gh", args, {
    cwd: root,
    encoding: "utf8",
    shell: false,
  });
  if (result.status !== 0) {
    fail(result.stderr?.trim() || result.stdout?.trim() || `gh ${args.join(" ")} failed`);
  }
  return result.stdout.trim();
}

function readClosureReport() {
  const report = spawnSync("node", ["scripts/dependabot-open-alert-closure.mjs", "--json"], {
    cwd: root,
    encoding: "utf8",
    shell: false,
  });
  if (report.status !== 0) {
    fail("local closure report failed — fix manifests before GitHub apply");
  }
  return JSON.parse(report.stdout);
}

function dismissAlert(alertNumber, reason, comment) {
  console.log(`Dismissing alert #${alertNumber} (${reason})`);
  if (dryRun) {
    console.log(`  dry-run: gh api repos/${repo}/dependabot/alerts/${alertNumber} -X PATCH ...`);
    return;
  }
  runGh([
    "api",
    `repos/${repo}/dependabot/alerts/${alertNumber}`,
    "-X",
    "PATCH",
    "-f",
    `state=dismissed`,
    "-f",
    `dismissed_reason=${reason}`,
    "-f",
    `dismissed_comment=${comment}`,
  ]);
}

function main() {
  const ghCheck = spawnSync("gh", ["auth", "status"], { encoding: "utf8", shell: false });
  if (ghCheck.status !== 0) {
    fail("gh is not authenticated — run gh auth login first");
  }

  const report = readClosureReport();
  if (report.status === "blocked_local_fix_required") {
    fail(`local manifests blocked: ${report.blocked.join("; ")}`);
  }

  const openAlerts = JSON.parse(
    runGh(["api", `repos/${repo}/dependabot/alerts?state=open&per_page=100`]),
  );
  const openNumbers = new Set(openAlerts.map((alert) => alert.number));

  if (openNumbers.has(report.glib.alertNumber) && report.glib.localStatus === "release_scope_safe_not_used") {
    dismissAlert(
      report.glib.alertNumber,
      "not_used",
      "Linux desktop bundles are out of release scope; glib is not used in Windows/macOS MSI/DMG targets.",
    );
  } else if (openNumbers.has(report.glib.alertNumber)) {
    console.log(`Skipping glib #${report.glib.alertNumber} — local status: ${report.glib.localStatus}`);
  } else {
    console.log(`ok glib alert #${report.glib.alertNumber} already closed on GitHub`);
  }

  if (openNumbers.has(report.jsYaml.alertNumber) && report.jsYaml.localStatus === "patched_locally") {
    dismissAlert(
      report.jsYaml.alertNumber,
      "fix_started",
      `js-yaml@${report.jsYaml.lockVersion} override and lock floor applied; merge to default branch pending.`,
    );
  } else if (openNumbers.has(report.jsYaml.alertNumber)) {
    fail(`js-yaml alert still open and local status is ${report.jsYaml.localStatus}`);
  } else {
    console.log(`ok js-yaml alert #${report.jsYaml.alertNumber} already closed on GitHub`);
  }

  const proofPath = path.join(root, "docs", "metrics", "dependabot-github-closure-apply.json");
  const proof = {
    generatedAt: new Date().toISOString(),
    repository: repo,
    dryRun,
    localStatus: report.status,
    jsYaml: report.jsYaml,
    glib: report.glib,
    openAlertNumbersAfter: dryRun
      ? [...openNumbers]
      : JSON.parse(runGh(["api", `repos/${repo}/dependabot/alerts?state=open&per_page=100`])).map(
          (alert) => alert.number,
        ),
  };
  if (!dryRun) {
    fs.mkdirSync(path.dirname(proofPath), { recursive: true });
    fs.writeFileSync(proofPath, `${JSON.stringify(proof, null, 2)}\n`, "utf8");
    console.log(`Wrote ${path.relative(root, proofPath)}`);
  }

  const remaining = proof.openAlertNumbersAfter.length;
  if (remaining === 0) {
    console.log("ok dependabot-github-closure-apply (no open alerts)");
    return;
  }
  console.log(
    `dependabot-github-closure-apply complete — ${remaining} open alert(s) remain (likely js-yaml until push/rescan)`,
  );
}

main();
