import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readiness = JSON.parse(fs.readFileSync(path.join(repoRoot, "lib", "arpgProductionReadinessContent.json"), "utf8"));
const completion = JSON.parse(fs.readFileSync(path.join(repoRoot, "lib", "arpgCompletionContent.json"), "utf8"));
const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));
const hqSpec = fs.readFileSync(path.join(repoRoot, "tests", "e2e", "hq-shell.spec.ts"), "utf8");
const errors = [];

function fail(owner, message) {
  errors.push(`${owner}: ${message}`);
}

function requireStringArray(owner, value, min = 1) {
  if (!Array.isArray(value) || value.length < min || value.some((item) => typeof item !== "string" || !item.trim())) {
    fail(owner, `must contain at least ${min} non-empty string value${min === 1 ? "" : "s"}`);
  }
}

const scripts = packageJson.scripts ?? {};
const releaseGates = readiness.releaseGates ?? {};
const requiredScripts = releaseGates.requiredScripts ?? [];
for (const scriptName of requiredScripts) {
  if (!scripts[scriptName]) fail("releaseGates.requiredScripts", `package.json is missing ${scriptName}`);
}

for (const gate of ["arpg:tools:check", "arpg:save:check", "arpg:balance:check", "arpg:release:check"]) {
  if (!scripts[gate]) fail("package.json.scripts", `missing dedicated ${gate}`);
  if (!String(scripts.verify ?? "").includes(gate)) {
    fail("package.json.verify", `verify must include ${gate}`);
  }
  if (!requiredScripts.includes(gate)) fail("releaseGates.requiredScripts", `missing ${gate}`);
}

requireStringArray("releaseGates.staticGates", releaseGates.staticGates, 5);
requireStringArray("releaseGates.browserRoutes", releaseGates.browserRoutes, 3);
requireStringArray("releaseGates.closureRules", releaseGates.closureRules, 4);
if (!Array.isArray(releaseGates.fallbackProofMatrix) || releaseGates.fallbackProofMatrix.length < 4) {
  fail("releaseGates.fallbackProofMatrix", "must contain the ARPG fallback proof matrix");
}
for (const row of releaseGates.fallbackProofMatrix ?? []) {
  const owner = `releaseGates.fallbackProofMatrix.${row?.id ?? "unknown"}`;
  if (typeof row?.id !== "string" || !row.id.trim()) fail(owner, "missing id");
  if (typeof row?.label !== "string" || !row.label.trim()) fail(owner, "missing label");
  requireStringArray(`${owner}.proof`, row?.proof, 1);
  if (typeof row?.acceptance !== "string" || !row.acceptance.trim()) fail(owner, "missing acceptance");
}
for (const proofId of ["static-release-gates", "save-combat-item-city-quest", "browser-fallback-route-proof", "arpg-isolation"]) {
  if (!releaseGates.fallbackProofMatrix?.some((row) => row.id === proofId)) {
    fail("releaseGates.fallbackProofMatrix", `missing ${proofId}`);
  }
}

const requiredFlows = [
  "start-continue-reset",
  "movement",
  "combat",
  "loot",
  "equip",
  "upgrade",
  "craft",
  "salvage",
  "vendor",
  "quest",
  "map-travel",
  "city-unlock",
  "companion",
  "reputation",
  "codex",
  "save-migration",
  "reduced-motion",
  "command-input",
  "command-room-fallback",
];
for (const flow of requiredFlows) {
  if (!releaseGates.e2eFlows?.includes(flow)) fail("releaseGates.e2eFlows", `missing ${flow}`);
}

for (const route of ["/hq", "/hq?focus=hq-chronicle", "/resources?view=impact&impactMode=graph"]) {
  if (!releaseGates.browserRoutes?.includes(route)) fail("releaseGates.browserRoutes", `missing ${route}`);
}

const requiredSpecSignals = [
  "arpg-phaser-canvas",
  "arpg-position",
  "arpg-basic-attack",
  "arpg-claim-loot",
  "arpg-equip-loomshard-charm",
  "arpg-upgrade-selected",
  "arpg-craft-first-temper",
  "arpg-salvage-selected",
  "arpg-companion-caravan-scout",
  "arpg-faction-reputation",
  "arpg-combat-codex",
  "arpg-map-toggle",
  "arpg-menu-index",
  "arpg-menu-launch-start",
  "arpg-menu-launch-character-sheet",
  "arpg-menu-launch-inventory-grid",
  "arpg-menu-launch-armory-comparison",
  "arpg-menu-launch-skill-tree",
  "arpg-menu-launch-quest-journal",
  "arpg-menu-launch-codex",
  "arpg-menu-launch-world-map",
  "arpg-menu-launch-city-map",
  "arpg-menu-launch-reputation",
  "arpg-menu-launch-companions",
  "arpg-menu-launch-settings-controls",
  "arpg-menu-launch-credits",
  "arpg-menu-launch-save-recovery",
  "arpg-active-menu-panel",
  "arpg-production-menu-panel-start",
  "arpg-production-menu-panel-city-map",
  "arpg-illustrated-asset-bench",
  "arpg-illustrated-preview-grid",
  "arpg-illustrated-batch-illustrated-character-portrait-seeds",
  "arpg-illustrated-batch-illustrated-enemy-card-seeds",
  "arpg-illustrated-batch-illustrated-location-card-seeds",
  "arpg-illustrated-batch-illustrated-gear-icon-seeds",
  "arpg-illustrated-batch-illustrated-skill-vfx-icon-seeds",
  "arpg-illustrated-batch-hero-kit-character-portraits",
  "arpg-illustrated-batch-hero-kit-class-outfits",
  "arpg-illustrated-batch-hero-kit-weapons-items",
  "arpg-illustrated-batch-hero-kit-armor-equipment",
  "arpg-hero-kit-preview",
  "arpg-hero-kit-inventory-art",
  "arpg-hero-kit-armory-art",
  "arpg-tutorial-panel",
  "arpg-content-tools",
  "arpg-content-tool-registry-cities",
  "arpg-content-tool-helper-zone-scaffold",
  "arpg-balance-playtest",
  "arpg-balance-session-prologue",
  "arpg-balance-class-wardbreaker",
  "arpg-balance-city-veyrhold",
  "arpg-balance-final-boss",
  "arpg-save-slot-summary",
  "arpg-save-manual",
  "arpg-save-checkpoint",
  "arpg-load-slot-manual",
  "arpg-reset-confirm-message",
  "arpg-save-import",
  "arpg-command-room-toggle",
];
for (const signal of requiredSpecSignals) {
  if (!hqSpec.includes(signal)) fail("tests/e2e/hq-shell.spec.ts", `missing ${signal}`);
}

const trackIds = new Set((completion.tracks ?? []).map((track) => track.id));
for (const trackId of [
  "MW6U-ARPG-ASSET-PIPELINE",
  "MW6V-REAL-ASSET-INTAKE",
  "MW6V-ARPG-ART-AUDIO-VFX",
  "MW6W-ARPG-HUD-MENUS-CODEX",
  "MW6X-ARPG-SAVE-MIGRATION",
  "MW6Y-ARPG-CONTENT-TOOLS",
  "MW6Z-ARPG-BALANCE-PLAYTEST",
  "MW6AA-ARPG-TESTING-RELEASE-GATES",
]) {
  if (!trackIds.has(trackId)) fail("completion.tracks", `missing ${trackId}`);
}
if (!(completion.tracks ?? []).some((track) => track.id === "MW6V-REAL-ASSET-INTAKE" && track.status === "blocked")) {
  fail("completion.tracks", "real asset intake must remain blocked until real assets exist");
}
if (!(completion.tracks ?? []).some((track) => track.id === "MW6U-ARPG-ASSET-PIPELINE" && track.status === "current")) {
  fail("completion.tracks", "asset pipeline must remain current while asset intake is blocked");
}

if (errors.length > 0) {
  console.error("ARPG release readiness validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `ARPG release readiness OK (${requiredScripts.length} scripts, ${releaseGates.e2eFlows.length} flows, ${releaseGates.browserRoutes.length} browser routes).`,
);
