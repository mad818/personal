#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x toolchain-cleanliness: ${message}`);
  process.exit(1);
}

function readRequired(...parts) {
  const filePath = path.join(root, ...parts);
  if (!fs.existsSync(filePath)) {
    fail(`${parts.join("/")} is missing`);
  }
  return fs.readFileSync(filePath, "utf8");
}

const npmConfig = readRequired(".npmrc");
if (/^\s*production\s*=/m.test(npmConfig)) {
  fail(".npmrc still uses deprecated production=; use include=dev");
}
if (!/^\s*include\s*=\s*dev\s*$/m.test(npmConfig)) {
  fail(".npmrc must explicitly preserve dev dependencies with include=dev");
}

const packageJson = JSON.parse(readRequired("package.json"));
const lint = packageJson.scripts?.lint ?? "";
const lintFix = packageJson.scripts?.["lint:fix"] ?? "";
const verify = packageJson.scripts?.verify ?? "";
const auditFull = packageJson.scripts?.["audit:full"] ?? "";

for (const [label, command] of [
  ["lint", lint],
  ["lint:fix", lintFix],
]) {
  if (!command.startsWith("eslint ")) {
    fail(`${label} must use the direct ESLint CLI`);
  }
  if (/\bnext\s+lint\b/.test(command)) {
    fail(`${label} still uses the deprecated Next lint runner`);
  }
  for (const directory of ["app", "components", "lib"]) {
    if (!command.split(/\s+/).includes(directory)) {
      fail(`${label} must retain the active ${directory} lint scope`);
    }
  }
  if (!command.includes("--ext .js,.jsx,.ts,.tsx")) {
    fail(
      `${label} must lint JavaScript and TypeScript source extensions explicitly`,
    );
  }
}

if (!lint.includes("--max-warnings 0")) {
  fail("lint must reject warnings with --max-warnings 0");
}
if (!lintFix.includes("--fix")) {
  fail("lint:fix must retain explicit fix behavior");
}
if (
  !verify.includes("npm run toolchain:check") ||
  !verify.includes("npm run lint")
) {
  fail("verify must run both toolchain:check and lint");
}

if (auditFull !== "node scripts/audit.js") {
  fail("audit:full must delegate exactly once to scripts/audit.js");
}
const auditSource = readRequired("scripts", "audit.js");
if (auditSource.includes("--verified")) {
  fail("audit.js must not trust a caller-supplied verified flag");
}
if (/\bnext\s+lint\b/.test(auditSource)) {
  fail("audit.js still references the deprecated Next lint runner");
}
for (const [label, pattern] of [
  ["npm CLI provenance", /process\.env\.npm_execpath/],
  [
    "canonical verify child",
    /spawnSync\(process\.execPath, \[npmCli, "run", "verify"\]/,
  ],
  ["shell-free execution", /shell:\s*false/],
  ["inherited verifier output", /stdio:\s*"inherit"/],
  ["argument rejection", /process\.argv\.slice\(2\)/],
  ["local verdict", /Local verification passed\./],
  ["remote boundary", /remote CI remain separate external checks/],
]) {
  if (!pattern.test(auditSource)) {
    fail(`audit.js is missing ${label}`);
  }
}

const eslintConfig = JSON.parse(readRequired(".eslintrc.json"));
const extensions = Array.isArray(eslintConfig.extends)
  ? eslintConfig.extends
  : [];
for (const requiredConfig of [
  "next/core-web-vitals",
  "prettier",
  "plugin:tailwindcss/recommended",
]) {
  if (!extensions.includes(requiredConfig)) {
    fail(`.eslintrc.json must retain ${requiredConfig}`);
  }
}

const typescriptOverride = (eslintConfig.overrides ?? []).find(
  (override) =>
    Array.isArray(override.files) &&
    override.files.includes("*.ts") &&
    override.files.includes("*.tsx"),
);
if (typescriptOverride?.parser !== "@typescript-eslint/parser") {
  fail(".eslintrc.json must retain the TypeScript parser override");
}

console.log(
  "ok toolchain-cleanliness (npm include=dev + direct ESLint + truthful full audit)",
);
