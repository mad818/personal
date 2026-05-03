import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readiness = JSON.parse(fs.readFileSync(path.join(repoRoot, "lib", "arpgProductionReadinessContent.json"), "utf8"));
const production = JSON.parse(fs.readFileSync(path.join(repoRoot, "lib", "arpgProductionContent.json"), "utf8"));
const character = JSON.parse(fs.readFileSync(path.join(repoRoot, "lib", "arpgCharacterContent.json"), "utf8"));
const endgame = JSON.parse(fs.readFileSync(path.join(repoRoot, "lib", "arpgEndgameContent.json"), "utf8"));
const balancePlaytestPath = path.join(repoRoot, "lib", "arpgBalancePlaytestContent.json");
const errors = [];

let balancePlaytest = null;

function fail(owner, message) {
  errors.push(`${owner}: ${message}`);
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

if (!fs.existsSync(balancePlaytestPath)) {
  fail("lib/arpgBalancePlaytestContent.json", "MW6Z balance/playtest content registry is required");
} else {
  balancePlaytest = JSON.parse(fs.readFileSync(balancePlaytestPath, "utf8"));
}

const balance = readiness.balanceTargets ?? {};
const xpCurve = Array.isArray(balance.xpCurve) ? balance.xpCurve : [];
if (xpCurve.length < 6) fail("balanceTargets.xpCurve", "at least six anchors are required");
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
if (!xpCurve.some((point) => point.level === 1 && point.totalXp === 0)) {
  fail("balanceTargets.xpCurve", "level 1 must start at zero XP");
}
if (!xpCurve.some((point) => point.level === balance.levelCap)) {
  fail("balanceTargets.xpCurve", "curve must include the level cap anchor");
}

if (!Number.isInteger(balance.levelCap) || balance.levelCap < 50) {
  fail("balanceTargets.levelCap", "full-game target requires level cap >= 50");
}

for (const [key, range] of Object.entries(balance.sessionLengthMinutes ?? {})) {
  requireRange(`balanceTargets.sessionLengthMinutes.${key}`, range);
}
for (const [key, range] of Object.entries(balance.combatBudgets ?? {})) {
  requireRange(`balanceTargets.combatBudgets.${key}`, range);
}
for (const [key, budget] of Object.entries(balance.browserBudgets ?? {})) {
  if (!Number.isFinite(budget) || budget <= 0) fail(`balanceTargets.browserBudgets.${key}`, "must be positive");
}

const fixtureSuites = Array.isArray(balance.fixtureSuites) ? balance.fixtureSuites : [];
const requiredSuites = [
  "xp-curve",
  "loot-cadence",
  "boss-time-to-kill",
  "potion-pressure",
  "class-viability",
  "upgrade-economy",
  "browser-performance",
  "city-playtest",
];
for (const suiteId of requiredSuites) {
  const suite = fixtureSuites.find((entry) => entry?.id === suiteId);
  if (!suite) fail("balanceTargets.fixtureSuites", `missing ${suiteId}`);
  if (suite && (typeof suite.target !== "string" || !suite.target.trim())) {
    fail(`balanceTargets.fixtureSuites.${suiteId}`, "target is required");
  }
}

const classNames = new Set((character.classTrees ?? []).map((entry) => entry.name));
const classTargets = Array.isArray(balance.classViabilityTargets) ? balance.classViabilityTargets : [];
if (classTargets.length !== 8) fail("balanceTargets.classViabilityTargets", "exactly eight class targets are required");
for (const className of classTargets) {
  if (!classNames.has(className)) fail("balanceTargets.classViabilityTargets", `unknown class ${className}`);
}

const cityIds = new Set((production.world?.cities ?? []).map((city) => city.id));
if (cityIds.size !== 12) fail("production.world.cities", "expected 12 major cities");
for (const cityId of readiness.cityPlaytestMatrix ?? []) {
  if (!cityIds.has(cityId)) fail("cityPlaytestMatrix", `unknown city ${cityId}`);
}
if ((readiness.cityPlaytestMatrix ?? []).length !== 12) {
  fail("cityPlaytestMatrix", "expected 12 city playtest checkpoints");
}

if ((endgame.difficultyTiers ?? []).length < 5) {
  fail("endgame.difficultyTiers", "at least five difficulty tiers are required for balance coverage");
}
if ((endgame.eliteAffixRotations ?? []).length < 8) {
  fail("endgame.eliteAffixRotations", "elite affix rotations must support balance fixtures");
}
if ((endgame.dungeonArchetypes ?? []).length < 6) {
  fail("endgame.dungeonArchetypes", "dungeon archetypes must support city challenge balance targets");
}
if ((endgame.relicTrialRules ?? []).length < 4) {
  fail("endgame.relicTrialRules", "relic trial rules must support postgame balance targets");
}

if (balancePlaytest) {
  if (balancePlaytest.schemaVersion !== "mw6-balance-playtest-v1") {
    fail("balancePlaytest.schemaVersion", "expected mw6-balance-playtest-v1");
  }

  const sessionTargets = Array.isArray(balancePlaytest.sessionTargets)
    ? balancePlaytest.sessionTargets
    : [];
  if (sessionTargets.length < 7) {
    fail("balancePlaytest.sessionTargets", "at least seven session targets are required");
  }
  for (const target of sessionTargets) {
    requireRange(`balancePlaytest.sessionTargets.${target?.id ?? "unknown"}.minutes`, target?.minutes);
    if (typeof target?.playerPromise !== "string" || !target.playerPromise.trim()) {
      fail(`balancePlaytest.sessionTargets.${target?.id ?? "unknown"}`, "playerPromise is required");
    }
  }

  const xpAnchors = Array.isArray(balancePlaytest.xpCurveAnchors)
    ? balancePlaytest.xpCurveAnchors
    : [];
  if (xpAnchors.length < 8) fail("balancePlaytest.xpCurveAnchors", "at least eight XP anchors are required");
  let lastLevel = 0;
  let lastXp = -1;
  for (const anchor of xpAnchors) {
    if (!Number.isInteger(anchor?.level) || anchor.level <= lastLevel) {
      fail("balancePlaytest.xpCurveAnchors", "levels must be strictly increasing");
    }
    if (!Number.isInteger(anchor?.totalXp) || anchor.totalXp <= lastXp) {
      fail("balancePlaytest.xpCurveAnchors", "totalXp must be strictly increasing");
    }
    if (typeof anchor?.phase !== "string" || !anchor.phase.trim()) {
      fail(`balancePlaytest.xpCurveAnchors.${anchor?.level ?? "unknown"}`, "phase is required");
    }
    lastLevel = anchor.level;
    lastXp = anchor.totalXp;
  }
  if (!xpAnchors.some((anchor) => anchor.level === 1 && anchor.totalXp === 0)) {
    fail("balancePlaytest.xpCurveAnchors", "level 1 must start at zero XP");
  }
  if (!xpAnchors.some((anchor) => anchor.level === balance.levelCap)) {
    fail("balancePlaytest.xpCurveAnchors", "must include the level cap");
  }

  const levelBands = Array.isArray(balancePlaytest.levelBands) ? balancePlaytest.levelBands : [];
  if (levelBands.length < 7) fail("balancePlaytest.levelBands", "prologue, five acts, and postgame bands are required");
  for (const band of levelBands) {
    requireRange(`balancePlaytest.levelBands.${band?.id ?? "unknown"}.levels`, band?.levels);
    if (!Array.isArray(band?.requiredRegions) || band.requiredRegions.length < 1) {
      fail(`balancePlaytest.levelBands.${band?.id ?? "unknown"}`, "requiredRegions are required");
    }
  }

  const lootCadence = Array.isArray(balancePlaytest.lootCadence) ? balancePlaytest.lootCadence : [];
  if (lootCadence.length < 7) fail("balancePlaytest.lootCadence", "at least seven loot cadence rows are required");
  for (const row of lootCadence) {
    requireRange(`balancePlaytest.lootCadence.${row?.id ?? "unknown"}.expectedDrops`, row?.expectedDrops);
    if (!Array.isArray(row?.qualityTargets) || row.qualityTargets.length < 2) {
      fail(`balancePlaytest.lootCadence.${row?.id ?? "unknown"}`, "qualityTargets need at least two entries");
    }
  }

  const bossTargets = Array.isArray(balancePlaytest.bossTargets) ? balancePlaytest.bossTargets : [];
  if (bossTargets.length < 8) fail("balancePlaytest.bossTargets", "at least eight boss targets are required");
  if (!bossTargets.some((boss) => boss.id === "the-hollow-regent-final")) {
    fail("balancePlaytest.bossTargets", "final Hollow Regent target is required");
  }
  for (const boss of bossTargets) {
    requireRange(`balancePlaytest.bossTargets.${boss?.id ?? "unknown"}.timeToKillSeconds`, boss?.timeToKillSeconds);
    requireRange(`balancePlaytest.bossTargets.${boss?.id ?? "unknown"}.potionUse`, boss?.potionUse);
    if (!Number.isInteger(boss?.phaseCount) || boss.phaseCount < 1) {
      fail(`balancePlaytest.bossTargets.${boss?.id ?? "unknown"}`, "phaseCount must be positive");
    }
  }

  const classIds = new Set((character.classTrees ?? []).map((entry) => entry.id));
  const classViability = Array.isArray(balancePlaytest.classViability)
    ? balancePlaytest.classViability
    : [];
  if (classViability.length !== classIds.size) {
    fail("balancePlaytest.classViability", "must cover every playable class");
  }
  for (const entry of classViability) {
    if (!classIds.has(entry?.classId)) fail("balancePlaytest.classViability", `unknown class ${entry?.classId}`);
    if (!Array.isArray(entry?.subclassCoverage) || entry.subclassCoverage.length < 2) {
      fail(`balancePlaytest.classViability.${entry?.classId ?? "unknown"}`, "both subclasses need coverage");
    }
    for (const key of ["survivability", "damage", "mobility", "control"]) {
      requireRange(`balancePlaytest.classViability.${entry?.classId ?? "unknown"}.${key}`, entry?.[key]);
    }
  }

  const lineageIds = new Set((character.lineages ?? []).map((entry) => entry.id));
  const lineageViability = Array.isArray(balancePlaytest.lineageViability)
    ? balancePlaytest.lineageViability
    : [];
  if (lineageViability.length !== lineageIds.size) {
    fail("balancePlaytest.lineageViability", "must cover every playable lineage");
  }
  for (const entry of lineageViability) {
    if (!lineageIds.has(entry?.lineageId)) fail("balancePlaytest.lineageViability", `unknown lineage ${entry?.lineageId}`);
    requireRange(`balancePlaytest.lineageViability.${entry?.lineageId ?? "unknown"}.varianceBudgetPercent`, entry?.varianceBudgetPercent);
  }

  const upgradeEconomy = Array.isArray(balancePlaytest.upgradeEconomy)
    ? balancePlaytest.upgradeEconomy
    : [];
  if (upgradeEconomy.length < 5) fail("balancePlaytest.upgradeEconomy", "upgrade ranks +1 through +5 are required");
  for (const row of upgradeEconomy) {
    if (!Number.isInteger(row?.rank) || row.rank < 1 || row.rank > 5) {
      fail("balancePlaytest.upgradeEconomy", "rank must be between 1 and 5");
    }
    if (!Array.isArray(row?.materials) || row.materials.length < 1) {
      fail(`balancePlaytest.upgradeEconomy.${row?.rank ?? "unknown"}`, "materials are required");
    }
  }

  const browserBudgets = balancePlaytest.browserPerformanceBudgets ?? {};
  for (const key of ["initialInteractiveMs", "drawerOpenMs", "combatInputLatencyMs", "playfieldFpsFloor"]) {
    if (!Number.isFinite(browserBudgets[key]) || browserBudgets[key] <= 0) {
      fail(`balancePlaytest.browserPerformanceBudgets.${key}`, "must be positive");
    }
  }

  const cityIdsForChecklist = new Set((production.world?.cities ?? []).map((city) => city.id));
  const playtestChecklist = Array.isArray(balancePlaytest.playtestChecklist)
    ? balancePlaytest.playtestChecklist
    : [];
  const requiredChecklistIds = [
    "prologue-first-reliquary",
    "act-i-awakening",
    "act-ii-city-pilgrimage",
    "act-iii-faction-war",
    "act-iv-citadel-breach",
    "act-v-world-scar",
    "final-hollow-regent",
    "postgame-relic-trials",
  ];
  for (const requiredId of requiredChecklistIds) {
    if (!playtestChecklist.some((entry) => entry.id === requiredId)) {
      fail("balancePlaytest.playtestChecklist", `missing ${requiredId}`);
    }
  }
  const cityChecklistEntries = playtestChecklist.filter((entry) => entry.type === "city-hub");
  if (cityChecklistEntries.length !== cityIdsForChecklist.size) {
    fail("balancePlaytest.playtestChecklist", "must include one city-hub checklist per major city");
  }
  for (const entry of cityChecklistEntries) {
    if (!cityIdsForChecklist.has(entry.regionId)) {
      fail("balancePlaytest.playtestChecklist", `unknown city checklist region ${entry.regionId}`);
    }
  }
  for (const entry of playtestChecklist) {
    if (!Array.isArray(entry?.assertions) || entry.assertions.length < 3) {
      fail(`balancePlaytest.playtestChecklist.${entry?.id ?? "unknown"}`, "at least three assertions are required");
    }
  }
}

if (errors.length > 0) {
  console.error("ARPG balance readiness validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `ARPG balance readiness OK (${fixtureSuites.length} fixture suites, ${classTargets.length} class targets, ${readiness.cityPlaytestMatrix.length} city checkpoints, ${balancePlaytest?.playtestChecklist?.length ?? 0} playtest rows).`,
);
