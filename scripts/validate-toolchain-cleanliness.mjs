#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const activeSourceDirectories = ["app", "lib", "components"];
const activeSourceExtensions = new Set([".ts", ".tsx", ".mdx"]);
const activeSourceScopes = [
  "{app,lib,components}/**/*.{ts,tsx,mdx}",
  "!app/hq/**/*.{ts,tsx,mdx}",
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
const gitignore = readRequired(".gitignore");
if (/^\s*production\s*=/m.test(npmConfig)) {
  fail(".npmrc still uses deprecated production=; use include=dev");
}
if (!/^\s*include\s*=\s*dev\s*$/m.test(npmConfig)) {
  fail(".npmrc must explicitly preserve dev dependencies with include=dev");
}

const packageJson = JSON.parse(readRequired("package.json"));
const packageLock = JSON.parse(readRequired("package-lock.json"));
const nextConfig = readRequired("next.config.js");
const desktopConfig = JSON.parse(
  readRequired("desktop", "src-tauri", "tauri.conf.json"),
);
const desktopReadme = readRequired("desktop", "README.md");
const supportedNodeRange = ">=24 <25";
const supportedNpmRange = ">=11 <12";

function assertNpmManifest(manifest, label) {
  const managerMatch = /^npm@(\d+)\.(\d+)\.(\d+)$/.exec(
    manifest.packageManager ?? "",
  );
  if (!managerMatch || Number.parseInt(managerMatch[1], 10) !== 11) {
    fail(`${label} packageManager must pin an npm 11 release`);
  }
  if (manifest.engines?.node !== supportedNodeRange) {
    fail(`${label} engines.node must equal ${supportedNodeRange}`);
  }
  if (manifest.engines?.npm !== supportedNpmRange) {
    fail(`${label} engines.npm must equal ${supportedNpmRange}`);
  }
}

assertNpmManifest(packageJson, "package.json");
if (!/webpackBuildWorker:\s*false/.test(nextConfig)) {
  fail("next.config.js must keep Windows webpack compilation in-process");
}
if (!/serverMinification:\s*false/.test(nextConfig)) {
  fail(
    "next.config.js must retain the proven Windows prerender worker stability setting",
  );
}
if (!/^desktop\/packaged-runtime\/$/m.test(gitignore)) {
  fail("generated desktop/packaged-runtime must remain ignored");
}
for (const retiredSnapshotFile of ["package.json", "server.js"]) {
  if (
    fs.existsSync(
      path.join(root, "desktop", "packaged-runtime", retiredSnapshotFile),
    )
  ) {
    fail(`retired desktop packaged snapshot returned: ${retiredSnapshotFile}`);
  }
}
if (desktopConfig.build?.frontendDist !== "../../.next/standalone") {
  fail("Tauri frontendDist must use the repo-root standalone runtime");
}
if (
  desktopConfig.build?.beforeBuildCommand !== "npm run desktop:build-runtime"
) {
  fail("Tauri builds must delegate to desktop:build-runtime");
}
if (
  !desktopReadme.includes(".next/standalone/server.js") ||
  !desktopReadme.includes("../../.next/standalone")
) {
  fail("desktop runbook must describe the active root standalone runtime");
}
if (!fs.existsSync(path.join(root, "package-lock.json"))) {
  fail("package-lock.json must remain the active root lockfile");
}
for (const retiredLockfile of ["pnpm-lock.yaml", "yarn.lock"]) {
  if (fs.existsSync(path.join(root, retiredLockfile))) {
    fail(`${retiredLockfile} conflicts with the npm package-manager contract`);
  }
}

const workflowDirectory = path.join(root, ".github", "workflows");
const nodeWorkflowFiles = fs
  .readdirSync(workflowDirectory)
  .filter((fileName) => /\.ya?ml$/i.test(fileName))
  .map((fileName) => ({
    fileName,
    source: fs.readFileSync(path.join(workflowDirectory, fileName), "utf8"),
  }))
  .filter(({ source }) => source.includes("actions/setup-node"));
if (nodeWorkflowFiles.length === 0) {
  fail("GitHub Actions must retain at least one setup-node workflow");
}
for (const { fileName, source } of nodeWorkflowFiles) {
  if (!/node-version:\s*['\"]?24['\"]?(?:\s|$)/m.test(source)) {
    fail(`${fileName} must use the supported Node 24 runtime`);
  }
  if (/\bpnpm\b/i.test(source)) {
    fail(`${fileName} must not bypass the npm lockfile with pnpm`);
  }
}
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
      error: `must use the exact cached active-source scopes: ${activeSourceScopes.join(", ")}`,
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
    label: "missing HQ exclusion",
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
if (
  JSON.stringify(writeContract.scopes) !== JSON.stringify(checkContract.scopes)
) {
  fail("format:write and format:check must resolve the same source scope");
}

function isFormatterExcludedSource(relativePath) {
  return relativePath.startsWith("app/hq/");
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
      } else if (
        entry.isFile() &&
        activeSourceExtensions.has(path.extname(entry.name))
      ) {
        const relativePath = path
          .relative(root, entryPath)
          .replaceAll(path.sep, "/");
        if (!isFormatterExcludedSource(relativePath)) {
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

const activeSourceInventory =
  activeSourceDirectories.flatMap(collectActiveSources);
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

if (
  packageJson.dependencies?.["@typescript-eslint/parser"] ||
  packageJson.devDependencies?.["@typescript-eslint/parser"]
) {
  fail("package.json must let eslint-config-next own the TypeScript parser");
}
if (
  packageLock.packages?.[""]?.dependencies?.["@typescript-eslint/parser"] ||
  packageLock.packages?.[""]?.devDependencies?.["@typescript-eslint/parser"]
) {
  fail("package-lock.json still records a direct TypeScript parser dependency");
}

const parserOverrides = (eslintConfig.overrides ?? []).filter(
  (override) => override?.parser === "@typescript-eslint/parser",
);
if (parserOverrides.length > 0) {
  fail(".eslintrc.json must not override the parser supplied by Next");
}

const parserLockEntries = Object.entries(packageLock.packages ?? {}).filter(
  ([packagePath]) =>
    packagePath === "node_modules/@typescript-eslint/parser" ||
    packagePath.endsWith("/node_modules/@typescript-eslint/parser"),
);
if (parserLockEntries.length === 0) {
  fail(
    "package-lock.json is missing the parser supplied by eslint-config-next",
  );
}
for (const [packagePath, entry] of parserLockEntries) {
  const major = Number.parseInt(entry.version?.split(".")[0] ?? "", 10);
  if (!Number.isInteger(major) || major < 8) {
    fail(`${packagePath} must stay on the Next-compatible parser 8+ line`);
  }
}

function versionTuple(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(version ?? "");
  if (!match) fail(`cannot parse semantic version ${version}`);
  return match.slice(1).map(Number);
}

function compareVersions(left, right) {
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return 0;
}

function supportsVersion(range, version) {
  const minimum = />=(\d+\.\d+\.\d+)/.exec(range ?? "")?.[1];
  const maximum = /<(\d+\.\d+\.\d+)/.exec(range ?? "")?.[1];
  if (!minimum || !maximum) return false;
  const candidate = versionTuple(version);
  return (
    compareVersions(candidate, versionTuple(minimum)) >= 0 &&
    compareVersions(candidate, versionTuple(maximum)) < 0
  );
}

const eslintBin = path.join(root, "node_modules", "eslint", "bin", "eslint.js");
const configResult = spawnSync(
  process.execPath,
  [eslintBin, "--print-config", "app/layout.tsx"],
  {
    cwd: root,
    encoding: "utf8",
    shell: false,
    timeout: 30_000,
  },
);
if (configResult.status !== 0 || !configResult.stdout) {
  fail(
    `ESLint config resolution failed: ${configResult.stderr?.trim() || `exit ${configResult.status}`}`,
  );
}
const resolvedEslintConfig = JSON.parse(configResult.stdout);
const resolvedParserPath = resolvedEslintConfig.parser;
if (
  typeof resolvedParserPath !== "string" ||
  !resolvedParserPath.includes("@typescript-eslint")
) {
  fail("TypeScript files must resolve through @typescript-eslint/parser");
}
const parserDistIndex = resolvedParserPath.lastIndexOf(
  `${path.sep}dist${path.sep}`,
);
if (parserDistIndex < 0) {
  fail(`cannot locate the resolved parser manifest from ${resolvedParserPath}`);
}
const parserManifestPath = path.join(
  resolvedParserPath.slice(0, parserDistIndex),
  "package.json",
);
const parserManifest = JSON.parse(fs.readFileSync(parserManifestPath, "utf8"));
const parserMajor = Number.parseInt(
  parserManifest.version?.split(".")[0] ?? "",
  10,
);
if (!Number.isInteger(parserMajor) || parserMajor < 8) {
  fail(
    `resolved TypeScript parser ${parserManifest.version} must be version 8+`,
  );
}
const pluginLockEntries = Object.entries(packageLock.packages ?? {}).filter(
  ([packagePath]) =>
    packagePath === "node_modules/@typescript-eslint/eslint-plugin" ||
    packagePath.endsWith("/node_modules/@typescript-eslint/eslint-plugin"),
);
if (
  !pluginLockEntries.some(
    ([, entry]) => entry.version === parserManifest.version,
  )
) {
  fail(
    `resolved parser ${parserManifest.version} must have a matching TypeScript ESLint plugin`,
  );
}
const lockedTypeScriptVersion =
  packageLock.packages?.["node_modules/typescript"]?.version;
if (
  !supportsVersion(
    parserManifest.peerDependencies?.typescript,
    lockedTypeScriptVersion,
  )
) {
  fail(
    `resolved parser ${parserManifest.version} does not declare support for TypeScript ${lockedTypeScriptVersion}`,
  );
}

console.log(
  `ok toolchain-cleanliness (npm 11 + Node 24 + root-standalone desktop runtime + retired packaged snapshot + stable Windows Next build workers + npm include=dev + ESLint parser ${parserManifest.version} for TypeScript ${lockedTypeScriptVersion} + Prettier ${activeSourceInventory.length}-file active scope + truthful full audit)`,
);
