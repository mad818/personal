#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const activeSourceDirectories = ["app", "lib", "components"];
const activeSourceExtensions = new Set([".ts", ".tsx", ".mdx"]);
const activeSourceScopes = [
  "{app,lib,components}/**/*.{ts,tsx,mdx}",
  "!app/hq/**/*.{ts,tsx,mdx}",
  "!components/home/arpg/**/*.{ts,tsx,mdx}",
  "!lib/arpg*.{ts,tsx,mdx}",
  "!lib/arpg*/**/*.{ts,tsx,mdx}",
];

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
const verifyFull = packageJson.scripts?.["verify:full"] ?? "";
const formatWrite = packageJson.scripts?.["format:write"] ?? "";
const formatCheck = packageJson.scripts?.["format:check"] ?? "";
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
  !verify.includes("npm run format:check") ||
  !verify.includes("npm run lint")
) {
  fail("verify must run toolchain:check, format:check, and lint");
}

function inspectFormatterCommand(command, expectedMode) {
  const quotedScopes = activeSourceScopes
    .map((scope) => `"${scope}"`)
    .join(" ");
  const expectedCommand = `prettier --${expectedMode} ${quotedScopes} --cache`;
  if (command !== expectedCommand) {
    return {
      error: `must use the exact cached non-RPG active-source scopes: ${activeSourceScopes.join(", ")}`,
      scopes: [],
    };
  }
  return { error: "", scopes: [...activeSourceScopes] };
}

for (const fixture of [
  {
    label: "missing slash",
    command: 'prettier --check "{app,lib,components}**/*.{ts,tsx,mdx}" --cache',
    mode: "check",
  },
  {
    label: "missing RPG exclusions",
    command:
      'prettier --check "{app,lib,components}/**/*.{ts,tsx,mdx}" --cache',
    mode: "check",
  },
  {
    label: "missing cache",
    command: `prettier --check ${activeSourceScopes.map((scope) => `"${scope}"`).join(" ")}`,
    mode: "check",
  },
  {
    label: "wrong mode",
    command: `prettier --write ${activeSourceScopes.map((scope) => `"${scope}"`).join(" ")} --cache`,
    mode: "check",
  },
]) {
  if (!inspectFormatterCommand(fixture.command, fixture.mode).error) {
    fail(`formatter command fixture did not reject ${fixture.label}`);
  }
}

const writeContract = inspectFormatterCommand(formatWrite, "write");
if (writeContract.error) {
  fail(`format:write ${writeContract.error}`);
}
const checkContract = inspectFormatterCommand(formatCheck, "check");
if (checkContract.error) {
  fail(`format:check ${checkContract.error}`);
}
if (JSON.stringify(writeContract.scopes) !== JSON.stringify(checkContract.scopes)) {
  fail("format:write and format:check must resolve the same source scope");
}

function isDirectRpgSource(relativePath) {
  return (
    relativePath.startsWith("app/hq/") ||
    relativePath.startsWith("components/home/arpg/") ||
    relativePath.startsWith("lib/arpg")
  );
}

function collectActiveSources(directory) {
  const directoryPath = path.join(root, directory);
  if (!fs.existsSync(directoryPath)) {
    fail(`active source directory ${directory} is missing`);
  }
  const files = [];
  const pending = [directoryPath];
  while (pending.length > 0) {
    const current = pending.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        pending.push(entryPath);
      } else if (entry.isFile() && activeSourceExtensions.has(path.extname(entry.name))) {
        const relativePath = path
          .relative(root, entryPath)
          .replaceAll(path.sep, "/");
        if (!isDirectRpgSource(relativePath)) {
          files.push(relativePath);
        }
      }
    }
  }
  if (files.length === 0) {
    fail(`active source directory ${directory} has no format-contract files`);
  }
  return files.sort();
}

const activeSourceInventory = activeSourceDirectories.flatMap(collectActiveSources);
if (verifyFull !== "npm run verify") {
  fail("verify:full must remain a compatibility alias for canonical verify");
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
  `ok toolchain-cleanliness (npm include=dev + ESLint + Prettier ${activeSourceInventory.length}-file non-RPG scope + truthful full audit)`,
);
