#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const findings = [];
const toRepoPath = (value) => value.replaceAll("\\", "/");

function fail(message) {
  findings.push(message);
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function containsFiles(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) return false;
  const stat = fs.statSync(absolutePath);
  if (stat.isFile()) return true;
  const pending = [absolutePath];
  while (pending.length > 0) {
    const directory = pending.pop();
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.isFile() || entry.isSymbolicLink()) return true;
      if (entry.isDirectory()) pending.push(path.join(directory, entry.name));
    }
  }
  return false;
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const retiredPaths = [
  "assets/arpg",
  "components/home/arpg",
  "desktop/frontend-dist/public/arpg",
  "docs/assets/arpg-asset-ledger.md",
  "docs/game/aether-reliquary",
  "public/arpg",
  "scripts/validate-hq-game-focus-layout.mjs",
  "specs/features/arpg-first-town-presentation-cues.md",
  "specs/features/arpg-pilgrim-rows-rest-road-runtime.md",
  "specs/features/premium-live-rpg-visual-expansion.md",
];

for (const retiredPath of retiredPaths) {
  if (containsFiles(retiredPath)) {
    fail(`retired path still contains files: ${retiredPath}`);
  }
}

for (const directory of ["lib", "scripts"]) {
  for (const entry of fs.readdirSync(path.join(root, directory))) {
    if (/arpg/i.test(entry)) {
      fail(`retired ${directory} entry still exists: ${directory}/${entry}`);
    }
  }
}

const packageJson = JSON.parse(read("package.json"));
const packageScripts = packageJson.scripts ?? {};
for (const [name, command] of Object.entries(packageScripts)) {
  if (/arpg|hq-game/i.test(`${name} ${command}`)) {
    fail(`package command still references the retired subsystem: ${name}`);
  }
}
if (
  packageScripts["rpg:retirement:check"] !==
  "node scripts/validate-retired-rpg-subsystem.mjs"
) {
  fail("package.json must retain the RPG retirement check command");
}
if (!packageScripts.verify?.includes("npm run rpg:retirement:check")) {
  fail("canonical verify must run the RPG retirement check");
}

const activeFiles = [
  "components/home/office/HQConsoleShellSection.tsx",
  "components/settings/SettingsDrawer.tsx",
  "docs/handoff-supplement.md",
  "lib/homefrontSourceIntelligence.ts",
  "lib/homefrontVisualParity.ts",
  "lib/massiveWinPlan.ts",
  "scripts/generate-handoff.js",
  "scripts/orbit.js",
  "store/useStore.ts",
  "tests/e2e/hq-shell.spec.ts",
  "tests/e2e/support/authenticatedShell.ts",
  "tests/e2e/tab-surfaces.spec.ts",
];
const retiredTokens = [
  /\barpg\b/i,
  /aether reliquary/i,
  /excluded_rpg/i,
  /hqRoomMode/,
  /hq-focus-game/,
];

for (const file of activeFiles) {
  if (!exists(file)) {
    fail(`active retirement proof file is missing: ${file}`);
    continue;
  }
  const source = read(file);
  for (const token of retiredTokens) {
    if (token.test(source)) {
      fail(`${file} still contains retired runtime token ${token}`);
    }
  }
}

const store = read("store/useStore.ts");
if (
  !/export type HqConsoleFocusMode = ['"]command['"] \| ['"]chat['"]/.test(
    store,
  )
) {
  fail("HQ focus state must expose only command and chat modes");
}
if (!/hqConsoleFocusMode:\s*['"]command['"]/.test(store)) {
  fail("HQ focus state must default to the command workspace");
}

const shell = read("components/home/office/HQConsoleShellSection.tsx");
if (
  !shell.includes("data-testid={`hq-focus-${mode.id}`}") ||
  !shell.includes('id: "command"') ||
  !shell.includes('id: "chat"')
) {
  fail("HQ shell must retain command and chat focus controls");
}

const gitignore = read(".gitignore");
if (/assets\/arpg/i.test(gitignore)) {
  fail(".gitignore still carries retired asset-intake rules");
}

if (findings.length > 0) {
  console.error(`RPG retirement validation found ${findings.length} issue(s):`);
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log(
  `ok rpg-retirement (paths=${retiredPaths.length}; active-files=${activeFiles.length}; package-commands=${Object.keys(packageScripts).length}; retained-focus=command,chat)`,
);
