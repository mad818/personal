import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readinessPath = path.join(repoRoot, "lib", "arpgProductionReadinessContent.json");
const productionPath = path.join(repoRoot, "lib", "arpgProductionContent.json");
const completionPath = path.join(repoRoot, "lib", "arpgCompletionContent.json");
const packagePath = path.join(repoRoot, "package.json");

const readiness = JSON.parse(fs.readFileSync(readinessPath, "utf8"));
const production = JSON.parse(fs.readFileSync(productionPath, "utf8"));
const completion = JSON.parse(fs.readFileSync(completionPath, "utf8"));
const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
const errors = [];

function fail(owner, message) {
  errors.push(`${owner}: ${message}`);
}

function requireString(owner, field, value) {
  if (typeof value !== "string" || !value.trim()) fail(owner, `missing ${field}`);
}

function requireStringArray(owner, field, value, min = 1) {
  if (!Array.isArray(value) || value.length < min || value.some((item) => typeof item !== "string" || !item.trim())) {
    fail(owner, `${field} must contain at least ${min} non-empty string value${min === 1 ? "" : "s"}`);
  }
}

function requireObjectArray(owner, field, value, min = 1) {
  if (!Array.isArray(value) || value.length < min || value.some((item) => !item || typeof item !== "object" || Array.isArray(item))) {
    fail(owner, `${field} must contain at least ${min} object entr${min === 1 ? "y" : "ies"}`);
    return [];
  }
  return value;
}

function requireRange(owner, value) {
  if (
    !Array.isArray(value) ||
    value.length !== 2 ||
    !Number.isFinite(value[0]) ||
    !Number.isFinite(value[1]) ||
    value[0] < 0 ||
    value[1] < value[0]
  ) {
    fail(owner, "must be [min, max] with numeric min <= max");
  }
}

if (readiness.schemaVersion !== "mw6-production-readiness-v1") {
  fail("schemaVersion", "expected mw6-production-readiness-v1");
}

requireString("readiness", "title", readiness.title);

const acceptedLicenses = new Set(readiness.assetPipeline?.acceptedLicenses ?? []);
for (const license of ["project-original", "CC0-1.0", "CC-BY-4.0", "commercial-license"]) {
  if (!acceptedLicenses.has(license)) fail("assetPipeline.acceptedLicenses", `missing ${license}`);
}
requireStringArray("assetPipeline", "disallowedSources", readiness.assetPipeline?.disallowedSources, 5);
requireStringArray("assetPipeline", "requiredMetadata", readiness.assetPipeline?.requiredMetadata, 10);
requireString("assetPipeline", "commercialProofRule", readiness.assetPipeline?.commercialProofRule);
requireString("assetPipeline", "generatorRule", readiness.assetPipeline?.generatorRule);
if (!/no forced paid dependency/i.test(readiness.assetPipeline?.generatorRule ?? "")) {
  fail("assetPipeline.generatorRule", "generator rule must explicitly forbid forced paid dependency");
}

requireString("menuSurface", "compactModeRule", readiness.menuSurface?.compactModeRule);
const menuPanels = requireObjectArray("menuSurface", "requiredPanels", readiness.menuSurface?.requiredPanels, 14);
const allowedDrawerTargets = new Set([
  "adventure",
  "inventory",
  "hero",
  "skills",
  "map",
  "armory",
  "journal",
  "people",
  "endgame",
  "production",
  "credits",
  "settings",
]);
const menuIds = new Set();
const menuTestIds = new Set();
const requiredPanelIds = [
  "start",
  "character-sheet",
  "inventory-grid",
  "armory-comparison",
  "skill-tree",
  "quest-journal",
  "codex",
  "world-map",
  "city-map",
  "reputation",
  "companions",
  "settings-controls",
  "credits",
  "save-recovery",
];
for (const panelId of requiredPanelIds) {
  if (!menuPanels.some((panel) => panel.id === panelId)) {
    fail("menuSurface.requiredPanels", `missing ${panelId}`);
  }
}
for (const panel of menuPanels) {
  if (menuIds.has(panel?.id)) fail("menuSurface.requiredPanels", `duplicate id ${panel.id}`);
  menuIds.add(panel?.id);
  if (menuTestIds.has(panel?.testId)) fail("menuSurface.requiredPanels", `duplicate testId ${panel.testId}`);
  menuTestIds.add(panel?.testId);
  for (const field of ["id", "label", "surface", "coverage", "drawerTarget", "testId", "emptyState", "reducedMotion"]) {
    requireString(`menuSurface.requiredPanels.${panel?.id ?? "unknown"}`, field, panel?.[field]);
  }
  if (typeof panel?.drawerTarget === "string" && !allowedDrawerTargets.has(panel.drawerTarget)) {
    fail(`menuSurface.requiredPanels.${panel?.id ?? "unknown"}`, `unknown drawerTarget ${panel.drawerTarget}`);
  }
  if (panel.keyboardSafe !== true) {
    fail(`menuSurface.requiredPanels.${panel?.id ?? "unknown"}`, "keyboardSafe must be true");
  }
  if (typeof panel?.testId === "string" && !panel.testId.startsWith("arpg-production-menu-panel-")) {
    fail(`menuSurface.requiredPanels.${panel?.id ?? "unknown"}`, "testId must use arpg-production-menu-panel-*");
  }
}

if (readiness.saveHardening?.envelopeVersion !== "aether-reliquary-save-envelope-v1") {
  fail("saveHardening.envelopeVersion", "expected aether-reliquary-save-envelope-v1");
}
if (readiness.saveHardening?.activeSaveVersion !== 3) {
  fail("saveHardening.activeSaveVersion", "expected current v3 save payload");
}
requireStringArray("saveHardening", "slotKinds", readiness.saveHardening?.slotKinds, 3);
const slotPolicies = requireObjectArray("saveHardening", "slotPolicies", readiness.saveHardening?.slotPolicies, 3);
for (const policy of slotPolicies) {
  if (!readiness.saveHardening?.slotKinds?.includes(policy.kind)) {
    fail("saveHardening.slotPolicies", `unknown slot kind ${policy.kind}`);
  }
  requireString(`saveHardening.slotPolicies.${policy.kind ?? "unknown"}`, "cadence", policy.cadence);
  requireString(`saveHardening.slotPolicies.${policy.kind ?? "unknown"}`, "recoveryUse", policy.recoveryUse);
}
requireStringArray("saveHardening", "migrationSources", readiness.saveHardening?.migrationSources, 3);
requireStringArray("saveHardening", "recoveryScenarios", readiness.saveHardening?.recoveryScenarios, 5);
for (const fixtureKey of ["legacyV2", "rawV3", "envelopeV1", "corrupted"]) {
  requireString("saveHardening.fixturePaths", fixtureKey, readiness.saveHardening?.fixturePaths?.[fixtureKey]);
  const fixturePath = readiness.saveHardening?.fixturePaths?.[fixtureKey];
  if (typeof fixturePath === "string" && !fs.existsSync(path.join(repoRoot, fixturePath))) {
    fail("saveHardening.fixturePaths", `missing fixture ${fixturePath}`);
  }
}
for (const requiredSource of ["mw5-v2", "mw6-v3-raw-save", "mw6-envelope-v1"]) {
  if (!readiness.saveHardening?.migrationSources?.includes(requiredSource)) {
    fail("saveHardening.migrationSources", `missing ${requiredSource}`);
  }
}

requireStringArray("contentTooling", "fixtureGroups", readiness.contentTooling?.fixtureGroups, 10);
requireStringArray("contentTooling", "validationScripts", readiness.contentTooling?.validationScripts, 7);
requireStringArray("contentTooling", "developerTools", readiness.contentTooling?.developerTools, 4);

const xpCurve = readiness.balanceTargets?.xpCurve ?? [];
if (!Array.isArray(xpCurve) || xpCurve.length < 6) {
  fail("balanceTargets.xpCurve", "at least six level anchors are required");
} else {
  let previousLevel = 0;
  let previousXp = -1;
  for (const point of xpCurve) {
    if (!Number.isInteger(point?.level) || point.level <= previousLevel) {
      fail("balanceTargets.xpCurve", "levels must be strictly increasing");
    }
    if (!Number.isInteger(point?.totalXp) || point.totalXp <= previousXp) {
      fail("balanceTargets.xpCurve", "totalXp must be strictly increasing");
    }
    previousLevel = point.level;
    previousXp = point.totalXp;
  }
}
if (!Number.isInteger(readiness.balanceTargets?.levelCap) || readiness.balanceTargets.levelCap < 50) {
  fail("balanceTargets.levelCap", "levelCap must be at least 50 for full-game completion");
}
const balanceSuites = requireObjectArray("balanceTargets", "fixtureSuites", readiness.balanceTargets?.fixtureSuites, 8);
for (const suite of balanceSuites) {
  requireString(`balanceTargets.fixtureSuites.${suite?.id ?? "unknown"}`, "id", suite?.id);
  requireString(`balanceTargets.fixtureSuites.${suite?.id ?? "unknown"}`, "target", suite?.target);
}
requireStringArray("balanceTargets", "classViabilityTargets", readiness.balanceTargets?.classViabilityTargets, 8);
for (const [key, range] of Object.entries(readiness.balanceTargets?.sessionLengthMinutes ?? {})) {
  requireRange(`balanceTargets.sessionLengthMinutes.${key}`, range);
}
for (const [key, range] of Object.entries(readiness.balanceTargets?.combatBudgets ?? {})) {
  requireRange(`balanceTargets.combatBudgets.${key}`, range);
}
for (const [key, budget] of Object.entries(readiness.balanceTargets?.browserBudgets ?? {})) {
  if (!Number.isFinite(budget) || budget <= 0) fail(`balanceTargets.browserBudgets.${key}`, "must be positive");
}

const cityIds = new Set((production.world?.cities ?? []).map((city) => city.id));
if ((production.world?.cities ?? []).length !== 12) fail("production.world.cities", "expected 12 cities");
if ((readiness.cityPlaytestMatrix ?? []).length !== 12) fail("cityPlaytestMatrix", "expected exactly 12 city entries");
for (const cityId of readiness.cityPlaytestMatrix ?? []) {
  if (!cityIds.has(cityId)) fail("cityPlaytestMatrix", `unknown city ${cityId}`);
}

const scripts = packageJson.scripts ?? {};
for (const scriptName of readiness.releaseGates?.requiredScripts ?? []) {
  if (!scripts[scriptName]) fail("releaseGates.requiredScripts", `package.json is missing ${scriptName}`);
}
requireStringArray("releaseGates", "staticGates", readiness.releaseGates?.staticGates, 5);
requireStringArray("releaseGates", "e2eFlows", readiness.releaseGates?.e2eFlows, 19);
for (const route of readiness.releaseGates?.browserRoutes ?? []) {
  if (typeof route !== "string" || !route.startsWith("/")) fail("releaseGates.browserRoutes", `invalid route ${route}`);
}
requireStringArray("releaseGates", "closureRules", readiness.releaseGates?.closureRules, 4);

const trackIds = new Set((completion.tracks ?? []).map((track) => track.id));
for (const trackId of [
  "MW6U-ARPG-ASSET-PIPELINE",
  "MW6U/V-GENERATOR-ASSISTED-GAME-ART",
  "MW6V-REAL-ASSET-INTAKE",
  "MW6W-ARPG-HUD-MENUS-CODEX",
  "MW6X-ARPG-SAVE-MIGRATION",
  "MW6Y-ARPG-CONTENT-TOOLS",
  "MW6Z-ARPG-BALANCE-PLAYTEST",
  "MW6AA-ARPG-TESTING-RELEASE-GATES",
]) {
  if (!trackIds.has(trackId)) fail("completion.tracks", `missing ${trackId}`);
}

if (errors.length > 0) {
  console.error("ARPG production readiness validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `ARPG production readiness OK (${readiness.cityPlaytestMatrix.length} cities, ${readiness.releaseGates.requiredScripts.length} release gates).`,
);
