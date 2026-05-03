import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const toolsPath = path.join(repoRoot, "lib", "arpgContentToolsContent.json");
const productionPath = path.join(repoRoot, "lib", "arpgProductionContent.json");
const completionPath = path.join(repoRoot, "lib", "arpgCompletionContent.json");
const packagePath = path.join(repoRoot, "package.json");
const errors = [];

function fail(owner, message) {
  errors.push(`${owner}: ${message}`);
}

function readJson(filePath, owner) {
  if (!fs.existsSync(filePath)) {
    fail(owner, `missing ${path.relative(repoRoot, filePath)}`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    fail(owner, `invalid JSON: ${error.message}`);
    return null;
  }
}

function requireString(owner, field, value) {
  if (typeof value !== "string" || !value.trim()) fail(owner, `missing ${field}`);
}

function requireArray(owner, field, value, min = 1) {
  if (!Array.isArray(value) || value.length < min) {
    fail(owner, `${field} must contain at least ${min} item${min === 1 ? "" : "s"}`);
    return [];
  }
  return value;
}

const tools = readJson(toolsPath, "contentTools");
const production = readJson(productionPath, "productionContent");
const completion = readJson(completionPath, "completionContent");
const packageJson = readJson(packagePath, "packageJson");

if (tools) {
  if (tools.schemaVersion !== "mw6-content-tools-v1") {
    fail("contentTools.schemaVersion", "expected mw6-content-tools-v1");
  }
  requireString("contentTools", "title", tools.title);
  requireString("contentTools", "purpose", tools.purpose);

  const registries = requireArray("contentTools", "registries", tools.registries, 10);
  const registryIds = new Set();
  for (const registry of registries) {
    const owner = `contentTools.registries.${registry?.id ?? "unknown"}`;
    for (const field of ["id", "label", "sourcePath", "validator", "coverage", "addWorkflow"]) {
      requireString(owner, field, registry?.[field]);
    }
    if (registryIds.has(registry?.id)) fail("contentTools.registries", `duplicate ${registry.id}`);
    registryIds.add(registry?.id);
    if (typeof registry?.sourcePath === "string" && !fs.existsSync(path.join(repoRoot, registry.sourcePath))) {
      fail(owner, `missing sourcePath ${registry.sourcePath}`);
    }
  }

  const requiredRegistryIds = [
    "cities",
    "sub-cities",
    "quests",
    "enemies",
    "bosses",
    "items",
    "vendors",
    "recipes",
    "companions",
    "dialogue",
    "maps",
    "flags",
  ];
  for (const registryId of requiredRegistryIds) {
    if (!registryIds.has(registryId)) fail("contentTools.registries", `missing ${registryId}`);
  }

  const helpers = requireArray("contentTools", "helpers", tools.helpers, 8);
  const helperIds = new Set();
  for (const helper of helpers) {
    const owner = `contentTools.helpers.${helper?.id ?? "unknown"}`;
    for (const field of ["id", "label", "kind", "command", "safeUse", "output"]) {
      requireString(owner, field, helper?.[field]);
    }
    if (helperIds.has(helper?.id)) fail("contentTools.helpers", `duplicate ${helper.id}`);
    helperIds.add(helper?.id);
  }

  for (const helperId of [
    "zone-scaffold",
    "quest-chain-check",
    "map-coordinate-helper",
    "dialogue-flag-audit",
    "fixture-save-writer",
    "debug-overlay",
  ]) {
    if (!helperIds.has(helperId)) fail("contentTools.helpers", `missing ${helperId}`);
  }

  const fixtureSaves = requireArray("contentTools", "fixtureSaves", tools.fixtureSaves, 6);
  for (const fixture of fixtureSaves) {
    const owner = `contentTools.fixtureSaves.${fixture?.id ?? "unknown"}`;
    for (const field of ["id", "label", "path", "coverage"]) {
      requireString(owner, field, fixture?.[field]);
    }
    if (typeof fixture?.path === "string" && !fs.existsSync(path.join(repoRoot, fixture.path))) {
      fail(owner, `missing fixture ${fixture.path}`);
    }
  }

  const progressionChecks = requireArray("contentTools", "progressionChecks", tools.progressionChecks, 8);
  for (const check of progressionChecks) {
    const owner = `contentTools.progressionChecks.${check?.id ?? "unknown"}`;
    for (const field of ["id", "label", "guards", "failureMode"]) {
      requireString(owner, field, check?.[field]);
    }
  }

  const authoringRules = requireArray("contentTools", "authoringRules", tools.authoringRules, 8);
  for (const rule of authoringRules) requireString("contentTools.authoringRules", "rule", rule);

  if (production) {
    const cityCount = production.world?.cities?.length ?? 0;
    const subCityCount = production.world?.cities?.reduce(
      (count, city) => count + (city.subCities?.length ?? 0),
      0,
    );
    if (cityCount !== 12) fail("productionContent.world.cities", "expected 12 cities for tooling coverage");
    if (subCityCount !== 48) fail("productionContent.world.subCities", "expected 48 sub-cities for tooling coverage");
  }

  const scripts = packageJson?.scripts ?? {};
  if (!scripts["arpg:tools:check"]) fail("packageJson.scripts", "missing arpg:tools:check");
  if (!String(scripts.verify ?? "").includes("arpg:tools:check")) {
    fail("packageJson.verify", "verify must include arpg:tools:check");
  }
}

if (completion) {
  const mw6y = (completion.tracks ?? []).find((track) => track.id === "MW6Y-ARPG-CONTENT-TOOLS");
  if (!mw6y) fail("completionContent.tracks", "missing MW6Y-ARPG-CONTENT-TOOLS");
  if (mw6y && mw6y.status !== "done") fail("completionContent.tracks.MW6Y", "MW6Y must be done after tooling ships");
}

if (errors.length > 0) {
  console.error("ARPG content tooling validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `ARPG content tooling OK (${tools.registries.length} registries, ${tools.helpers.length} helpers, ${tools.fixtureSaves.length} fixtures).`,
);
