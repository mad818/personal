#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (...parts) => {
  const relativePath = parts.join("/");
  const filePath = path.join(root, ...parts);
  if (!fs.existsSync(filePath)) {
    console.error(`x document-design: missing ${relativePath}`);
    process.exit(1);
  }
  return fs.readFileSync(filePath, "utf8");
};
const fail = (message) => {
  console.error(`x document-design: ${message}`);
  process.exit(1);
};

const ids = [
  "documenso-documenso",
  "docusealco-docuseal",
  "frontend-slides",
  "penpot-penpot",
];
const matrices = ids.map((id) =>
  JSON.parse(read("docs", "ideas", "source-parity", `${id}.json`)),
);
for (const matrix of matrices) {
  if (matrix.status !== "complete") fail(`${matrix.id} must be complete`);
  if (matrix.source.reviewedAt !== "2026-07-27") {
    fail(`${matrix.id} source review is stale`);
  }
  if (
    matrix.capabilities.some(
      (capability) => capability.disposition === "pending",
    )
  ) {
    fail(`${matrix.id} still has pending capabilities`);
  }
}

const decision = (matrixId, capabilityId) =>
  matrices
    .find((matrix) => matrix.id === matrixId)
    ?.capabilities.find((capability) => capability.id === capabilityId)
    ?.disposition;
if (
  decision("documenso-documenso", "next-js-app-router-patterns") !== "excluded"
) {
  fail("stale Documenso App Router claim must be excluded");
}
if (decision("penpot-penpot", "svg-native-format") !== "adapted") {
  fail("SVG-native asset pattern must be adapted");
}
if (decision("penpot-penpot", "design-token-export") !== "implemented") {
  fail("design token export must be implemented");
}

const svg = read("public", "icon.svg");
if (!/<svg[\s>]/i.test(svg) || !/<\/svg>/i.test(svg)) {
  fail("public/icon.svg is not a readable SVG document");
}
const exporter = read("scripts", "export-design-tokens.mjs");
for (const needle of [
  "app/design-md.generated.css",
  "design-tokens.json",
  "schemaVersion: 1",
  "--motion-fast",
  "Object.keys(tokens).length < 100",
]) {
  if (!exporter.includes(needle)) fail(`token exporter missing ${needle}`);
}
const spec = read("specs", "features", "document-design-source-closure.md");
if (!spec.includes("phone/PWA work is deferred")) {
  fail("phone/PWA boundary is missing");
}

const packageJson = JSON.parse(read("package.json"));
if (
  packageJson.scripts?.["design:tokens:export"] !==
  "node scripts/export-design-tokens.mjs"
) {
  fail("design token export command is missing");
}
if (
  packageJson.scripts?.["design:tokens:check"] !==
  "node scripts/export-design-tokens.mjs --check"
) {
  fail("design token check command is missing");
}
if (
  packageJson.scripts?.["document-design:check"] !==
  "node scripts/validate-document-design-source-closure.mjs && npm run design:tokens:check"
) {
  fail("document-design focused command is missing");
}
if (
  !String(packageJson.scripts?.verify ?? "").includes(
    "npm run document-design:check",
  )
) {
  fail("canonical verify wiring is missing");
}

console.log(
  `ok document-design (matrices=${matrices.length}; readable-svg=true; token-export=true; presentation-runtime=false)`,
);
