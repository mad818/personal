#!/usr/bin/env node
/* eslint-disable no-console */

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);
  assert.ok(fs.existsSync(absolutePath), `missing ${relativePath}`);
  return fs.readFileSync(absolutePath, "utf8");
}

function requireText(source, needle, label) {
  assert.ok(source.includes(needle), `${label}: missing ${needle}`);
}

const tracked = new Set(
  execFileSync("git", ["ls-files", "-z"], { cwd: root })
    .toString("utf8")
    .split("\0")
    .filter(Boolean)
    .map((entry) => entry.replaceAll("\\", "/")),
);

const blockedTrackedPaths = [
  "agent-workspace/",
  "desktop/frontend-dist/",
  "start-nexus.ps1",
  "public/github-infographic-features.svg",
  "public/github-infographic-stack.svg",
  "public/github-readme-overview.svg",
  "public/github-section-api-keys.svg",
  "public/github-section-local-ai.svg",
  "public/github-section-quickstart.svg",
  "public/github-section-selfhost.svg",
  "public/github-section-stack-layers.svg",
  "public/github-section-structure.svg",
  "public/github-social-card.svg",
  "public/groqlabs-logo-black.png",
  "public/images/hero_bg.jpeg",
  "public/office/la-skyline.jpg",
  "public/theme/sadie-armani.jpg",
  "public/theme/sadie-cover.jpg",
  "public/theme/sadie-portrait.jpg",
  "public/theme/sadie-wide.jpg",
  "public/theme/aegis-cosmos.svg",
  "CODEOWNERS",
];
for (const blocked of blockedTrackedPaths) {
  const match = [...tracked].find(
    (entry) => entry === blocked || entry.startsWith(blocked),
  );
  assert.equal(match, undefined, `obsolete path remains tracked: ${match}`);
}

for (const required of [
  ".github/CODEOWNERS",
  ".github/pull_request_template.md",
  ".claude/README.md",
  "CHANGELOG.md",
  "NexusPrime.bat",
  "desktop/README.md",
  "docs/releases/v1.0.0-rc.1.md",
  "docs/repo-hygiene/github-mainline-settings-proposal.md",
  "docs/repo-hygiene/mainline-release-removal-ledger-2026-08-03.md",
  "docs/repo-hygiene/mainline-release-surface-inventory-2026-08-03.md",
  "public/images/nexus-prime-system-showcase.webp",
  "public/theme/nexus-cosmos.svg",
  "tests/e2e/release-baseline.spec.ts",
]) {
  assert.ok(
    tracked.has(required),
    `required release path is not tracked: ${required}`,
  );
}

const gitignore = read(".gitignore");
for (const boundary of [
  "agent-workspace/",
  "desktop/frontend-dist/",
  "start-nexus.ps1",
  "public/github-*.svg",
]) {
  requireText(gitignore, boundary, ".gitignore local/publication boundary");
}

const changelog = read("CHANGELOG.md");
for (const stale of [
  "stockbot-on-groq",
  "bklieger-groq",
  "Initial release of the StockBot project",
]) {
  assert.ok(!changelog.includes(stale), `CHANGELOG retains obsolete ${stale}`);
}
for (const section of [
  "### Capabilities",
  "### User experience",
  "### Intelligence and data",
  "### Security and privacy",
  "### Desktop and operations",
  "### Repository hygiene",
  "### Verification",
  "### Deferred work",
]) {
  requireText(changelog, section, "Nexus changelog");
}

const desktopConfig = JSON.parse(read("desktop/src-tauri/tauri.conf.json"));
assert.equal(
  desktopConfig.build?.frontendDist,
  "../../.next/standalone",
  "Tauri must consume the canonical standalone build",
);
const desktopReadme = read("desktop/README.md");
assert.match(
  desktopReadme,
  /Generated frontend\s+snapshots are not\s+tracked/,
  "desktop release contract must reject tracked generated snapshots",
);
requireText(read(".github/CODEOWNERS"), "* @mad818", "CODEOWNERS");

const activeBrandSources = [
  read("app/globals.css"),
  read("components/auth/AuthGate.tsx"),
  read("components/alpha/TradingViewMarkets.tsx"),
].join("\n");
for (const stale of ["aegis-cosmos", "StockBot"]) {
  assert.ok(!activeBrandSources.includes(stale), `active UI retains ${stale}`);
}

const inventory = read(
  "docs/repo-hygiene/mainline-release-surface-inventory-2026-08-03.md",
);
function requireInventoryEntry(entry, label) {
  const escaped = entry.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  assert.match(inventory, new RegExp("\\|\\s*`" + escaped + "`\\s*\\|"), label);
}
const currentRootEntries = new Set(
  [...tracked].map((entry) => entry.split("/")[0]),
);
for (const entry of currentRootEntries) {
  requireInventoryEntry(entry, `root surface inventory is missing ${entry}`);
}
for (const removedRootEntry of [
  "agent-workspace",
  "CODEOWNERS",
  "start-nexus.ps1",
]) {
  requireInventoryEntry(
    removedRootEntry,
    `root surface removal inventory is missing ${removedRootEntry}`,
  );
}

const ledger = read(
  "docs/repo-hygiene/mainline-release-removal-ledger-2026-08-03.md",
);
for (const evidence of [
  "61 tracked files",
  "17 unreferenced public files",
  "37 net tracked metric files",
  "NexusPrime.bat",
  ".next/standalone",
]) {
  requireText(ledger, evidence, "removal ledger");
}

const packageJson = JSON.parse(read("package.json"));
assert.equal(
  packageJson.scripts?.["mainline:release-hygiene:check"],
  "node scripts/validate-mainline-release-hygiene.mjs && npm run pr:title:check",
);
assert.equal(
  packageJson.scripts?.["pr:title:check"],
  "node scripts/validate-pr-title.mjs",
);
requireText(
  packageJson.scripts?.verify ?? "",
  "npm run mainline:release-hygiene:check",
  "canonical verification",
);

console.log(
  `ok mainline-release-hygiene (tracked=${tracked.size}; root=${currentRootEntries.size}; obsolete=0; release-contracts=14)`,
);
