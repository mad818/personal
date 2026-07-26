#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const graphRoots = ["app", "components", "hooks", "lib", "store"];
const codeExtensions = new Set([".ts", ".tsx", ".js", ".jsx"]);
const resolvedExtensions = [".ts", ".tsx", ".js", ".jsx", ".css", ".json"];

const reviewedDetachedComponents = new Set([
  // Intentionally empty: current component source must be reachable or retired.
]);

const exactScopeExclusions = new Set([]);

const scriptOnlyRuntimeFiles = new Map([
  [
    "lib/localAccelerationAcceptance.ts",
    "scripts/check-local-acceleration-acceptance.mjs",
  ],
  ["lib/nexusMotionTaste.ts", "scripts/validate-nexus-motion-taste.mjs"],
]);

function fail(message) {
  console.error(`x active-component-reachability: ${message}`);
  process.exit(1);
}

function toRepoPath(value) {
  return value.replaceAll("\\", "/");
}

function walk(relativeDirectory, output) {
  const absoluteDirectory = path.join(root, relativeDirectory);
  if (!fs.existsSync(absoluteDirectory)) return;

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
    if (resolvedExtensions.includes(path.extname(entry.name))) {
      output.push(relativePath);
    }
  }
}

const files = [];
for (const directory of graphRoots) walk(directory, files);
const fileSet = new Set(files);
const edges = new Map(files.map((file) => [file, []]));

function resolveLocalSpecifier(fromFile, specifier, availableFiles = fileSet) {
  if (!specifier.startsWith("@/") && !specifier.startsWith(".")) return null;

  const base = specifier.startsWith("@/")
    ? specifier.slice(2)
    : path.posix.normalize(
        path.posix.join(path.posix.dirname(fromFile), specifier),
      );
  const candidates = [
    base,
    ...resolvedExtensions.map((extension) => `${base}${extension}`),
    ...resolvedExtensions.map((extension) => `${base}/index${extension}`),
  ];
  return candidates.find((candidate) => availableFiles.has(candidate)) ?? null;
}

function collectImportSpecifiers(file, source) {
  const specifiers = [];
  const sourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  function visit(node) {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      specifiers.push(node.moduleSpecifier.text);
    }
    if (
      ts.isCallExpression(node) &&
      node.arguments.length > 0 &&
      ts.isStringLiteral(node.arguments[0]) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) &&
          node.expression.text === "require"))
    ) {
      specifiers.push(node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return specifiers;
}

const importFixture = collectImportSpecifiers(
  "components/fixture/Fixture.tsx",
  `
    import Alpha from "@/components/alpha/Alpha";
    export { Beta } from "./Beta";
    const Gamma = require("../Gamma");
    const Delta = import("./Delta");
  `,
);
const expectedImportFixture = [
  "@/components/alpha/Alpha",
  "./Beta",
  "../Gamma",
  "./Delta",
];
if (JSON.stringify(importFixture) !== JSON.stringify(expectedImportFixture)) {
  fail(
    "static, re-export, require, and literal dynamic-import fixture drifted",
  );
}
const resolutionFixture = new Set([
  "components/alpha/Alpha.tsx",
  "components/fixture/Beta/index.ts",
]);
if (
  resolveLocalSpecifier(
    "components/fixture/Fixture.tsx",
    "@/components/alpha/Alpha",
    resolutionFixture,
  ) !== "components/alpha/Alpha.tsx" ||
  resolveLocalSpecifier(
    "components/fixture/Fixture.tsx",
    "./Beta",
    resolutionFixture,
  ) !== "components/fixture/Beta/index.ts"
) {
  fail(
    "alias, relative, extension, or directory-index resolution fixture drifted",
  );
}

for (const file of files) {
  if (!codeExtensions.has(path.extname(file))) continue;
  const source = fs.readFileSync(path.join(root, file), "utf8");
  for (const specifier of collectImportSpecifiers(file, source)) {
    const resolved = resolveLocalSpecifier(file, specifier);
    if (resolved) edges.get(file).push(resolved);
  }
}

const reachable = new Set();
const pending = files.filter(
  (file) => file.startsWith("app/") && codeExtensions.has(path.extname(file)),
);
while (pending.length > 0) {
  const file = pending.pop();
  if (!file || reachable.has(file)) continue;
  reachable.add(file);
  for (const dependency of edges.get(file) ?? []) pending.push(dependency);
}

const componentFiles = files.filter((file) => file.startsWith("components/"));
const inScopeComponents = componentFiles.filter(
  (file) => !exactScopeExclusions.has(file),
);

for (const reviewed of reviewedDetachedComponents) {
  if (!fileSet.has(reviewed)) {
    fail(`reviewed-detached inventory contains a missing path: ${reviewed}`);
  }
  if (reachable.has(reviewed)) {
    fail(
      `reviewed-detached path is now reachable and must leave the inventory: ${reviewed}`,
    );
  }
}

for (const excluded of exactScopeExclusions) {
  if (!fileSet.has(excluded)) {
    fail(`exact source exclusion is missing: ${excluded}`);
  }
}

const unreviewed = inScopeComponents.filter(
  (file) => !reachable.has(file) && !reviewedDetachedComponents.has(file),
);
if (unreviewed.length > 0) {
  fail(
    `${unreviewed.length} unreviewed unreachable component file(s):\n${unreviewed
      .sort()
      .map((file) => `- ${file}`)
      .join("\n")}`,
  );
}

const reachableComponentCount = inScopeComponents.filter((file) =>
  reachable.has(file),
).length;

const packageSource = fs.readFileSync(path.join(root, "package.json"), "utf8");
for (const [runtimeFile, importer] of scriptOnlyRuntimeFiles) {
  if (!fileSet.has(runtimeFile)) {
    fail(
      `script-only runtime inventory contains a missing path: ${runtimeFile}`,
    );
  }
  if (reachable.has(runtimeFile)) {
    fail(
      `script-only runtime path is now application-reachable and must leave the inventory: ${runtimeFile}`,
    );
  }

  const absoluteImporter = path.join(root, importer);
  if (!fs.existsSync(absoluteImporter)) {
    fail(`script-only importer is missing: ${importer}`);
  }
  const importedRuntimeFiles = collectImportSpecifiers(
    importer,
    fs.readFileSync(absoluteImporter, "utf8"),
  )
    .map((specifier) => resolveLocalSpecifier(importer, specifier))
    .filter(Boolean);
  if (!importedRuntimeFiles.includes(runtimeFile)) {
    fail(
      `${importer} no longer imports script-only runtime path ${runtimeFile}`,
    );
  }
  if (!packageSource.includes(importer)) {
    fail(`${importer} is not reachable from a maintained package command`);
  }
}

const runtimeHelperFiles = files.filter(
  (file) =>
    codeExtensions.has(path.extname(file)) &&
    (file.startsWith("hooks/") || file.startsWith("lib/")),
);
const unreviewedRuntimeHelpers = runtimeHelperFiles.filter(
  (file) => !reachable.has(file) && !scriptOnlyRuntimeFiles.has(file),
);
if (unreviewedRuntimeHelpers.length > 0) {
  fail(
    `${unreviewedRuntimeHelpers.length} unreviewed unreachable hook/library file(s):\n${unreviewedRuntimeHelpers
      .sort()
      .map((file) => `- ${file}`)
      .join("\n")}`,
  );
}

const reachableHookCount = runtimeHelperFiles.filter(
  (file) => file.startsWith("hooks/") && reachable.has(file),
).length;
const reachableLibraryCount = runtimeHelperFiles.filter(
  (file) => file.startsWith("lib/") && reachable.has(file),
).length;
console.log(
  `ok active-source-reachability (components=${reachableComponentCount}; hooks=${reachableHookCount}; libraries=${reachableLibraryCount}; script-only=${scriptOnlyRuntimeFiles.size}; exact-exclusions=${exactScopeExclusions.size}; unreviewed=0)`,
);
