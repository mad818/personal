#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const scriptExtensions = new Set([
  ".js",
  ".mjs",
  ".cjs",
  ".ps1",
  ".bat",
  ".vbs",
]);
const packageTargetPattern =
  /scripts\/[A-Za-z0-9._/-]+\.(?:mjs|cjs|js|ps1|bat|vbs)/g;
const referencedScriptPattern =
  /(?:scripts[\\/]|\.\.?[\\/])?[A-Za-z0-9._-]+(?:[\\/][A-Za-z0-9._-]+)*\.(?:mjs|cjs|js|ps1|bat|vbs)/g;

const runtimeOwnedScripts = new Map([
  ["scripts/tool-isolation-runner.mjs", "lib/security/toolIsolationRunner.ts"],
  [
    "scripts/windows-optimization-snapshot.ps1",
    "lib/windowsOptimizationAdvisorServer.ts",
  ],
]);

const exactDeferredExclusions = new Set([
  "scripts/validate-phone-acceptance-code-lane.mjs",
]);
const reachabilityMetadataScript =
  "scripts/check-maintained-script-reachability.mjs";

function fail(message) {
  console.error(`x maintained-script-reachability: ${message}`);
  process.exit(1);
}

function toRepoPath(value) {
  return value.replaceAll("\\", "/");
}

function walk(relativeDirectory, output) {
  const absoluteDirectory = path.join(root, relativeDirectory);
  for (const entry of fs.readdirSync(absoluteDirectory, {
    withFileTypes: true,
  })) {
    const relativePath = toRepoPath(path.join(relativeDirectory, entry.name));
    if (entry.isSymbolicLink()) {
      fail(
        `symbolic link is outside the static graph contract: ${relativePath}`,
      );
    }
    if (entry.isDirectory()) {
      walk(relativePath, output);
      continue;
    }
    if (scriptExtensions.has(path.extname(entry.name).toLowerCase())) {
      output.push(relativePath);
    }
  }
}

function collectScriptReferences(fromFile, source, availableScripts) {
  const references = new Set();
  for (const rawMatch of source.match(referencedScriptPattern) ?? []) {
    const match = toRepoPath(rawMatch);
    const candidate = match.startsWith("scripts/")
      ? path.posix.normalize(match)
      : path.posix.normalize(
          path.posix.join(path.posix.dirname(fromFile), match),
        );
    if (availableScripts.has(candidate) && candidate !== fromFile) {
      references.add(candidate);
    }
  }
  return [...references];
}

const fixtureScripts = new Set([
  "scripts/root.mjs",
  "scripts/nested/relative.mjs",
  "scripts/shared/check.ps1",
]);
const fixtureReferences = collectScriptReferences(
  "scripts/nested/root.mjs",
  'import "./relative.mjs"; spawn("../shared/check.ps1"); node scripts/root.mjs',
  fixtureScripts,
).sort();
if (
  JSON.stringify(fixtureReferences) !==
  JSON.stringify([
    "scripts/nested/relative.mjs",
    "scripts/root.mjs",
    "scripts/shared/check.ps1",
  ])
) {
  fail("relative, repository-root, or cross-shell reference fixture drifted");
}

const scripts = [];
walk("scripts", scripts);
scripts.sort();
const scriptSet = new Set(scripts);
const packageJson = JSON.parse(
  fs.readFileSync(path.join(root, "package.json"), "utf8"),
);
const packageRoots = new Set();

for (const [name, command] of Object.entries(packageJson.scripts ?? {})) {
  for (const target of command.match(packageTargetPattern) ?? []) {
    if (!scriptSet.has(target)) {
      fail(`package command ${name} names a missing script: ${target}`);
    }
    packageRoots.add(target);
  }
}

const edges = new Map();
for (const script of scripts) {
  const source = fs.readFileSync(path.join(root, script), "utf8");
  edges.set(
    script,
    script === reachabilityMetadataScript
      ? []
      : collectScriptReferences(script, source, scriptSet),
  );
}

for (const [script, importer] of runtimeOwnedScripts) {
  if (!scriptSet.has(script)) {
    fail(`runtime-owned inventory contains a missing script: ${script}`);
  }
  const absoluteImporter = path.join(root, importer);
  if (!fs.existsSync(absoluteImporter)) {
    fail(`runtime-owned importer is missing: ${importer}`);
  }
  const importerSource = fs.readFileSync(absoluteImporter, "utf8");
  if (!importerSource.includes(path.posix.basename(script))) {
    fail(`${importer} no longer references runtime-owned helper ${script}`);
  }
  if (packageRoots.has(script)) {
    fail(`${script} is now package-owned and must leave the runtime inventory`);
  }
}

for (const script of exactDeferredExclusions) {
  if (!scriptSet.has(script)) {
    fail(`exact deferred exclusion is missing: ${script}`);
  }
  if (packageRoots.has(script) || runtimeOwnedScripts.has(script)) {
    fail(`${script} is now maintained and must leave the deferred inventory`);
  }
}

const reachable = new Set();
const pending = [...packageRoots, ...runtimeOwnedScripts.keys()];
while (pending.length > 0) {
  const script = pending.pop();
  if (!script || reachable.has(script)) continue;
  reachable.add(script);
  for (const dependency of edges.get(script) ?? []) pending.push(dependency);
}

for (const script of exactDeferredExclusions) {
  if (reachable.has(script)) {
    fail(`${script} became reachable and must leave the deferred inventory`);
  }
}

const unreviewed = scripts.filter(
  (script) => !reachable.has(script) && !exactDeferredExclusions.has(script),
);
if (unreviewed.length > 0) {
  fail(
    `${unreviewed.length} unreviewed unreachable script(s):\n${unreviewed
      .map((script) => `- ${script}`)
      .join("\n")}`,
  );
}

console.log(
  `ok maintained-script-reachability (scripts=${scripts.length}; package-roots=${packageRoots.size}; runtime-owned=${runtimeOwnedScripts.size}; deferred-exclusions=${exactDeferredExclusions.size}; unreviewed=0)`,
);
