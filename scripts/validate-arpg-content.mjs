import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contentPath = path.join(repoRoot, "lib", "arpgProductionContent.json");
const prologuePath = path.join(repoRoot, "lib", "arpgPrologueContent.json");
const characterPath = path.join(repoRoot, "lib", "arpgCharacterContent.json");
const enemyTaxonomyPath = path.join(repoRoot, "lib", "arpgEnemyTaxonomyContent.json");
const armoryEconomyPath = path.join(repoRoot, "lib", "arpgArmoryEconomyContent.json");
const arsenalPath = path.join(repoRoot, "lib", "arpgArsenalContent.json");
const worldLoopPath = path.join(repoRoot, "lib", "arpgWorldLoopContent.json");
const endgamePath = path.join(repoRoot, "lib", "arpgEndgameContent.json");
const completionPath = path.join(repoRoot, "lib", "arpgCompletionContent.json");
const townServicesPath = path.join(repoRoot, "lib", "arpgTownServicesContent.json");
const gameContentPath = path.join(repoRoot, "lib", "arpgGameContent.ts");
const combatContentPath = path.join(repoRoot, "lib", "arpgCombatContent.ts");
const content = JSON.parse(fs.readFileSync(contentPath, "utf8"));
const prologueContent = fs.existsSync(prologuePath)
  ? JSON.parse(fs.readFileSync(prologuePath, "utf8"))
  : null;
const characterContent = fs.existsSync(characterPath)
  ? JSON.parse(fs.readFileSync(characterPath, "utf8"))
  : null;
const enemyTaxonomyContent = fs.existsSync(enemyTaxonomyPath)
  ? JSON.parse(fs.readFileSync(enemyTaxonomyPath, "utf8"))
  : null;
const armoryEconomyContent = fs.existsSync(armoryEconomyPath)
  ? JSON.parse(fs.readFileSync(armoryEconomyPath, "utf8"))
  : null;
const arsenalContent = fs.existsSync(arsenalPath)
  ? JSON.parse(fs.readFileSync(arsenalPath, "utf8"))
  : null;
const worldLoopContent = fs.existsSync(worldLoopPath)
  ? JSON.parse(fs.readFileSync(worldLoopPath, "utf8"))
  : null;
const endgameContent = fs.existsSync(endgamePath)
  ? JSON.parse(fs.readFileSync(endgamePath, "utf8"))
  : null;
const completionContent = fs.existsSync(completionPath)
  ? JSON.parse(fs.readFileSync(completionPath, "utf8"))
  : null;
const townServicesContent = fs.existsSync(townServicesPath)
  ? JSON.parse(fs.readFileSync(townServicesPath, "utf8"))
  : null;
const gameContentSource = fs.existsSync(gameContentPath)
  ? fs.readFileSync(gameContentPath, "utf8")
  : "";
const combatContentSource = fs.existsSync(combatContentPath)
  ? fs.readFileSync(combatContentPath, "utf8")
  : "";
const errors = [];

function fail(id, message) {
  errors.push(`${id || "unknown"}: ${message}`);
}

function requireString(owner, field, value) {
  if (typeof value !== "string" || !value.trim()) fail(owner, `missing ${field}`);
}

function requireStringArray(owner, field, value, min = 1) {
  if (!Array.isArray(value) || value.length < min || value.some((item) => typeof item !== "string" || !item.trim())) {
    fail(owner, `${field} must contain at least ${min} non-empty string value${min === 1 ? "" : "s"}`);
  }
}

function requireLevelRange(owner, value) {
  if (
    !Array.isArray(value) ||
    value.length !== 2 ||
    !Number.isInteger(value[0]) ||
    !Number.isInteger(value[1]) ||
    value[0] < 1 ||
    value[1] < value[0]
  ) {
    fail(owner, "levelRange must be [min, max] positive integers");
  }
}

function requireStats(owner, value) {
  const statKeys = ["might", "ward", "focus", "speed", "crit", "cooldown", "resonance"];
  if (!value || typeof value !== "object") {
    fail(owner, "baseStats/statBonus must be an object");
    return;
  }
  for (const key of statKeys) {
    if (!Number.isFinite(value[key])) fail(owner, `missing numeric stat ${key}`);
  }
}

function uniqueIds(owner, entries) {
  const ids = new Set();
  for (const entry of entries) {
    if (!entry?.id) continue;
    if (ids.has(entry.id)) fail(entry.id, `duplicate id in ${owner}`);
    ids.add(entry.id);
  }
  return ids;
}

function sourceSection(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) return "";
  return source.slice(start, end);
}

function quotedValues(source) {
  return [...source.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
}

function objectEntryIds(source) {
  return new Set([...source.matchAll(/^\s{2}"([^"]+)":\s*\{/gm)].map((match) => match[1]));
}

function normalizeId(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function entryIds(entries) {
  return new Set((Array.isArray(entries) ? entries : []).map((entry) => entry?.id).filter(Boolean));
}

function normalizedEntryIds(entries) {
  return new Set((Array.isArray(entries) ? entries : []).map((entry) => normalizeId(entry?.id)).filter(Boolean));
}

function requireCoverage(owner, requiredValues, actualValues, label = "id") {
  for (const requiredValue of requiredValues ?? []) {
    const normalizedRequired = normalizeId(requiredValue);
    if (!actualValues.has(normalizedRequired)) {
      fail(owner, `missing ${label} ${requiredValue}`);
    }
  }
}

if (content.schemaVersion !== "mw6-bible-foundation-v1") {
  fail("schemaVersion", "expected mw6-bible-foundation-v1");
}

if (content.gameTitle !== "Aether Reliquary") fail("gameTitle", "expected Aether Reliquary");
if (content.tone !== "heroic-adventure") fail("tone", "expected heroic-adventure");
if (content.combatModel !== "real-time-arpg") fail("combatModel", "expected real-time-arpg");

if (!prologueContent) {
  fail("prologueContent", "lib/arpgPrologueContent.json is required for MW6E prologue canon");
} else {
  if (prologueContent.schemaVersion !== "mw6-prologue-story-v1") {
    fail("prologueContent.schemaVersion", "expected mw6-prologue-story-v1");
  }
  const identity = prologueContent.protagonistIdentity ?? {};
  if (identity.noCanonicalName !== true) {
    fail("prologueContent.protagonistIdentity", "noCanonicalName must be true");
  }
  if (identity.noForcedGender !== true) {
    fail("prologueContent.protagonistIdentity", "noForcedGender must be true");
  }
  if (identity.playerCreatedName !== true) {
    fail("prologueContent.protagonistIdentity", "playerCreatedName must be true");
  }
  requireString("prologueContent.protagonistIdentity", "defaultRuntimeTitle", identity.defaultRuntimeTitle);
  requireStringArray(
    "prologueContent.protagonistIdentity",
    "runtimeCopyRules",
    identity.runtimeCopyRules,
    3,
  );
  if (/\bmain\b/i.test(JSON.stringify(prologueContent))) {
    fail("prologueContent", "do not use Main/main as a protagonist name or title");
  }

  const firstLocation = prologueContent.firstLocation ?? {};
  for (const field of ["id", "name", "parentZoneId", "cityId", "visualSummary", "openingSafetyRule"]) {
    requireString("prologueContent.firstLocation", field, firstLocation[field]);
  }
  requireStringArray("prologueContent.firstLocation", "setPieces", firstLocation.setPieces, 5);
  requireStringArray("prologueContent.firstLocation", "sensoryDetails", firstLocation.sensoryDetails, 4);

  const openingFlow = prologueContent.openingFlow ?? [];
  if (!Array.isArray(openingFlow) || openingFlow.length < 6) {
    fail("prologueContent.openingFlow", "at least 6 opening flow steps are required");
  }
  const openingFlags = new Set(openingFlow.map((step) => step?.storyFlag).filter(Boolean));
  for (const flag of [
    "lore:descent-ledger",
    "lore:oath-lamp-arcade",
    "npc:oracle-met",
    "lore:gate-monolith",
  ]) {
    if (!openingFlags.has(flag)) fail("prologueContent.openingFlow", `missing opening flag ${flag}`);
  }
  for (const step of openingFlow) {
    const owner = step?.id ?? "prologue-step";
    for (const field of ["id", "title", "mechanic", "storyFlag", "summary"]) {
      requireString(owner, field, step?.[field]);
    }
  }

  const firstQuest = prologueContent.firstQuest ?? {};
  if (firstQuest.id !== "awaken-the-reliquary") {
    fail("prologueContent.firstQuest", "firstQuest.id must remain awaken-the-reliquary");
  }
  requireString("prologueContent.firstQuest", "title", firstQuest.title);
  requireString("prologueContent.firstQuest", "summary", firstQuest.summary);
  requireStringArray("prologueContent.firstQuest", "steps", firstQuest.steps, 5);
  requireStringArray("prologueContent.firstQuest", "requiredFlags", firstQuest.requiredFlags, 5);
  for (const flag of firstQuest.requiredFlags ?? []) {
    if (!prologueContent.contentHooks?.storyFlags?.includes(flag)) {
      fail("prologueContent.firstQuest", `required flag ${flag} must appear in contentHooks.storyFlags`);
    }
  }
  requireStringArray("prologueContent.dialogueSamples", "dialogueSamples", prologueContent.dialogueSamples?.map((entry) => entry?.line), 3);
}

const cities = content.world?.cities ?? [];
if (!Array.isArray(cities) || cities.length !== 12) {
  fail("world.cities", "exactly 12 major cities are required");
}
const cityIds = uniqueIds("world.cities", cities);

let subCityCount = 0;
const subCityIds = new Set();
for (const city of cities) {
  const owner = city?.id ?? "city";
  for (const field of ["id", "name", "coreFantasy", "campaignRole", "rulerPressure", "visualTileset", "musicMood"]) {
    requireString(owner, field, city?.[field]);
  }
  requireLevelRange(owner, city?.levelRange);
  requireStringArray(owner, "factions", city?.factions, 2);
  requireStringArray(owner, "enemyBiomes", city?.enemyBiomes, 1);
  if (!Array.isArray(city?.subCities) || city.subCities.length !== 4) {
    fail(owner, "each major city must define exactly 4 sub-cities");
    continue;
  }
  subCityCount += city.subCities.length;
  for (const subCity of city.subCities) {
    const subOwner = subCity?.id ?? `${owner}:subcity`;
    if (subCityIds.has(subOwner)) fail(subOwner, "duplicate sub-city id");
    subCityIds.add(subOwner);
    for (const field of ["id", "name", "districtRole", "localStory", "miniBoss", "gearDrop"]) {
      requireString(subOwner, field, subCity?.[field]);
    }
    requireStringArray(subOwner, "microFactions", subCity?.microFactions, 1);
    requireStringArray(subOwner, "enemies", subCity?.enemies, 1);
  }
}

if (subCityCount !== 48) fail("world.subCities", "exactly 48 sub-cities are required");

const validRouteNodes = new Set(["first-reliquary", ...cityIds]);
for (const route of content.world?.routes ?? []) {
  const owner = `${route?.from ?? "route"}->${route?.to ?? "route"}`;
  if (!validRouteNodes.has(route?.from)) fail(owner, "route from must reference a city or first-reliquary");
  if (!validRouteNodes.has(route?.to)) fail(owner, "route to must reference a city or first-reliquary");
  requireString(owner, "unlockFlag", route?.unlockFlag);
}

const acts = content.campaign?.acts ?? [];
if (!Array.isArray(acts) || acts.length < 7) fail("campaign.acts", "at least 7 campaign acts are required");
if (!acts.some((act) => act?.boss === "The Hollow Regent")) {
  fail("campaign.acts", "final campaign must include The Hollow Regent");
}
for (const act of acts) {
  const owner = act?.id ?? "act";
  for (const field of ["id", "title", "summary", "boss"]) requireString(owner, field, act?.[field]);
  requireLevelRange(owner, act?.levelRange);
  requireStringArray(owner, "saveFlags", act?.saveFlags, 1);
  for (const cityId of act?.requiredCities ?? []) {
    if (!cityIds.has(cityId)) fail(owner, `requiredCities references unknown city ${cityId}`);
  }
}

const races = content.character?.races ?? [];
if (!Array.isArray(races) || races.length !== 8) fail("character.races", "exactly 8 races are required");
uniqueIds("character.races", races);
for (const race of races) {
  const owner = race?.id ?? "race";
  for (const field of ["id", "name", "passive", "questHook"]) requireString(owner, field, race?.[field]);
  requireStringArray(owner, "statBias", race?.statBias, 2);
  requireStringArray(owner, "cityHooks", race?.cityHooks, 1);
}

const classes = content.character?.classes ?? [];
if (!Array.isArray(classes) || classes.length !== 8) fail("character.classes", "exactly 8 classes are required");
uniqueIds("character.classes", classes);
for (const klass of classes) {
  const owner = klass?.id ?? "class";
  for (const field of ["id", "name", "resource", "role", "starterActive", "starterPassive"]) {
    requireString(owner, field, klass?.[field]);
  }
  requireStringArray(owner, "subclasses", klass?.subclasses, 2);
}

for (const [field, min] of [
  ["enemyFamilies", 16],
  ["traits", 16],
  ["buffs", 7],
  ["debuffs", 12],
  ["weaponFamilies", 20],
  ["gearQualities", 7],
  ["gearSlots", 12],
  ["damageTypes", 8],
  ["currencies", 5],
]) {
  requireStringArray(`systems.${field}`, field, content.systems?.[field], min);
}

const companions = content.companions ?? [];
if (!Array.isArray(companions) || companions.length < 8) {
  fail("companions", "at least 8 companions are required");
}
uniqueIds("companions", companions);
for (const companion of companions) {
  const owner = companion?.id ?? "companion";
  for (const field of ["id", "name", "role", "perk", "loyaltyQuest", "homeCity"]) {
    requireString(owner, field, companion?.[field]);
  }
  if (companion?.homeCity !== "first-reliquary" && !cityIds.has(companion?.homeCity)) {
    fail(owner, `homeCity references unknown city ${companion?.homeCity}`);
  }
}

if (!enemyTaxonomyContent) {
  fail("enemyTaxonomyContent", "lib/arpgEnemyTaxonomyContent.json is required for MW6I-S enemy systems");
} else {
  if (enemyTaxonomyContent.schemaVersion !== "mw6-enemy-taxonomy-v1") {
    fail("enemyTaxonomyContent.schemaVersion", "expected mw6-enemy-taxonomy-v1");
  }

  const familyIds = normalizedEntryIds(enemyTaxonomyContent.familyRules);
  const traitIds = normalizedEntryIds(enemyTaxonomyContent.traits);
  const buffIds = normalizedEntryIds(enemyTaxonomyContent.buffs);
  const debuffIds = normalizedEntryIds(enemyTaxonomyContent.debuffs);
  requireCoverage("enemyTaxonomyContent.familyRules", content.systems?.enemyFamilies, familyIds, "family");
  requireCoverage("enemyTaxonomyContent.traits", content.systems?.traits, traitIds, "trait");
  requireCoverage("enemyTaxonomyContent.buffs", content.systems?.buffs, buffIds, "buff");
  requireCoverage("enemyTaxonomyContent.debuffs", content.systems?.debuffs, debuffIds, "debuff");
  if ((enemyTaxonomyContent.archetypeTemplates ?? []).length < 6) {
    fail("enemyTaxonomyContent.archetypeTemplates", "at least 6 reusable archetype templates are required");
  }
  if ((enemyTaxonomyContent.actBosses ?? []).length < acts.length) {
    fail("enemyTaxonomyContent.actBosses", "at least one boss definition per campaign act is required");
  }
  if (!String(JSON.stringify(enemyTaxonomyContent.finalBossForms ?? [])).includes("The Hollow Regent")) {
    fail("enemyTaxonomyContent.finalBossForms", "The Hollow Regent final forms are required");
  }
  if ((enemyTaxonomyContent.finalBossForms ?? []).length < 3) {
    fail("enemyTaxonomyContent.finalBossForms", "at least 3 final boss forms are required");
  }
  if ((enemyTaxonomyContent.worldBosses ?? []).length < 4) {
    fail("enemyTaxonomyContent.worldBosses", "at least 4 postgame world bosses are required");
  }
  for (const city of cities) {
    for (const subCity of city.subCities ?? []) {
      for (const familyId of subCity.enemies ?? []) {
        if (!familyIds.has(normalizeId(familyId))) {
          fail(subCity.id, `sub-city enemy family ${familyId} is not covered by taxonomy`);
        }
      }
    }
  }
}

if (!armoryEconomyContent) {
  fail("armoryEconomyContent", "lib/arpgArmoryEconomyContent.json is required for MW6I-S armory/economy systems");
} else {
  if (armoryEconomyContent.schemaVersion !== "mw6-armory-economy-v1") {
    fail("armoryEconomyContent.schemaVersion", "expected mw6-armory-economy-v1");
  }

  requireCoverage(
    "armoryEconomyContent.weaponFamilies",
    content.systems?.weaponFamilies,
    normalizedEntryIds(armoryEconomyContent.weaponFamilies),
    "weapon family",
  );
  requireCoverage(
    "armoryEconomyContent.gearSlots",
    content.systems?.gearSlots,
    normalizedEntryIds(armoryEconomyContent.gearSlots),
    "gear slot",
  );
  requireCoverage(
    "armoryEconomyContent.qualities",
    content.systems?.gearQualities,
    normalizedEntryIds(armoryEconomyContent.qualities),
    "quality",
  );
  requireCoverage(
    "armoryEconomyContent.currencies",
    content.systems?.currencies,
    normalizedEntryIds(armoryEconomyContent.currencies),
    "currency",
  );
  if ((armoryEconomyContent.armorFamilies ?? []).length < 12) {
    fail("armoryEconomyContent.armorFamilies", "at least 12 armor material families are required");
  }
  if ((armoryEconomyContent.affixPools ?? []).length < 7) {
    fail("armoryEconomyContent.affixPools", "at least 7 affix pools are required");
  }
  if ((armoryEconomyContent.runes ?? []).length < 8) {
    fail("armoryEconomyContent.runes", "at least 8 socket/rune definitions are required");
  }
  if ((armoryEconomyContent.craftingRecipes ?? []).length < 8) {
    fail("armoryEconomyContent.craftingRecipes", "at least 8 crafting recipes are required");
  }
  if ((armoryEconomyContent.salvageRules ?? []).length < (content.systems?.gearQualities ?? []).length) {
    fail("armoryEconomyContent.salvageRules", "salvage rules must cover every quality tier");
  }
  if ((armoryEconomyContent.vendorArchetypes ?? []).length < 12) {
    fail("armoryEconomyContent.vendorArchetypes", "at least 12 vendor archetypes are required");
  }
}

if (!townServicesContent) {
  fail("townServicesContent", "lib/arpgTownServicesContent.json is required for the first town release slice");
} else {
  if (townServicesContent.schemaVersion !== "mw6-first-town-services-v1") {
    fail("townServicesContent.schemaVersion", "expected mw6-first-town-services-v1");
  }
  if (townServicesContent.cityId !== "veyrhold") {
    fail("townServicesContent.cityId", "first town services must target veyrhold");
  }
  requireString("townServicesContent", "title", townServicesContent.title);
  requireString("townServicesContent", "summary", townServicesContent.summary);
  requireStringArray("townServicesContent", "unlockPath", townServicesContent.unlockPath, 4);

  const itemSection = sourceSection(gameContentSource, "export const ARPG_ITEMS", "export const ARPG_STARTER_ITEM_IDS");
  const itemIds = objectEntryIds(itemSection);
  const gearSlotIds = normalizedEntryIds(armoryEconomyContent?.gearSlots ?? []);
  const veyrholdSubCityIds = new Set(
    (cities.find((city) => city.id === "veyrhold")?.subCities ?? []).map((entry) => entry.id),
  );
  const requiredServiceKinds = new Set(["blacksmith", "alchemy", "market", "inn", "quest-board"]);
  const serviceKinds = new Set((townServicesContent.services ?? []).map((service) => service?.kind));
  const serviceIds = new Set((townServicesContent.services ?? []).map((service) => service?.id));

  if ((townServicesContent.services ?? []).length < 5) {
    fail("townServicesContent.services", "at least five Veyrhold services are required");
  }
  for (const kind of requiredServiceKinds) {
    if (!serviceKinds.has(kind)) fail("townServicesContent.services", `missing service kind ${kind}`);
  }
  for (const service of townServicesContent.services ?? []) {
    const owner = service?.id ?? "townService";
    for (const field of ["id", "label", "kind", "districtId", "summary", "primaryAction"]) {
      requireString(owner, field, service?.[field]);
    }
    if (!veyrholdSubCityIds.has(service?.districtId)) {
      fail(owner, `districtId must reference a Veyrhold sub-city: ${service?.districtId}`);
    }
    requireStringArray(owner, "rewardItemIds", service?.rewardItemIds, 1);
    requireStringArray(owner, "unlocks", service?.unlocks, 1);
    for (const itemId of service?.rewardItemIds ?? []) {
      if (!itemIds.has(itemId)) fail(owner, `rewardItemId is not defined in ARPG_ITEMS: ${itemId}`);
    }
  }

  if ((townServicesContent.npcRoster ?? []).length < 5) {
    fail("townServicesContent.npcRoster", "at least five named Veyrhold NPCs are required");
  }
  const npcIds = new Set();
  for (const npc of townServicesContent.npcRoster ?? []) {
    const owner = npc?.id ?? "townNpc";
    for (const field of [
      "id",
      "name",
      "role",
      "districtId",
      "serviceId",
      "summary",
      "dialogueHook",
      "rewardItemId",
      "reputationFactionId",
      "visualCue",
    ]) {
      requireString(owner, field, npc?.[field]);
    }
    if (npcIds.has(npc?.id)) fail(owner, `duplicate NPC id ${npc?.id}`);
    npcIds.add(npc?.id);
    if (!veyrholdSubCityIds.has(npc?.districtId)) {
      fail(owner, `districtId must reference a Veyrhold sub-city: ${npc?.districtId}`);
    }
    if (!serviceIds.has(npc?.serviceId)) {
      fail(owner, `serviceId must reference a Veyrhold service: ${npc?.serviceId}`);
    }
    if (!itemIds.has(npc?.rewardItemId)) {
      fail(owner, `rewardItemId is not defined in ARPG_ITEMS: ${npc?.rewardItemId}`);
    }
  }

  if ((townServicesContent.miniQuests ?? []).length < 4) {
    fail("townServicesContent.miniQuests", "at least four district mini-quests are required");
  }
  const miniQuestIds = new Set();
  for (const quest of townServicesContent.miniQuests ?? []) {
    const owner = quest?.id ?? "townMiniQuest";
    for (const field of ["id", "title", "districtId", "npcId", "serviceId", "summary", "unlockCopy"]) {
      requireString(owner, field, quest?.[field]);
    }
    if (miniQuestIds.has(quest?.id)) fail(owner, `duplicate mini-quest id ${quest?.id}`);
    miniQuestIds.add(quest?.id);
    if (!veyrholdSubCityIds.has(quest?.districtId)) {
      fail(owner, `districtId must reference a Veyrhold sub-city: ${quest?.districtId}`);
    }
    if (!npcIds.has(quest?.npcId)) fail(owner, `npcId must reference a Veyrhold NPC: ${quest?.npcId}`);
    if (!serviceIds.has(quest?.serviceId)) {
      fail(owner, `serviceId must reference a Veyrhold service: ${quest?.serviceId}`);
    }
    requireStringArray(owner, "steps", quest?.steps, 3);
    requireStringArray(owner, "rewardItemIds", quest?.rewardItemIds, 1);
    requireStringArray(owner, "storyFlags", quest?.storyFlags, 2);
    if (!Number.isFinite(quest?.reputationDelta) || quest.reputationDelta < 1) {
      fail(owner, "reputationDelta must be a positive number");
    }
    for (const itemId of quest?.rewardItemIds ?? []) {
      if (!itemIds.has(itemId)) fail(owner, `rewardItemId is not defined in ARPG_ITEMS: ${itemId}`);
    }
  }

  if ((townServicesContent.serviceOutcomes ?? []).length < 5) {
    fail("townServicesContent.serviceOutcomes", "at least five service outcome cards are required");
  }
  const outcomeIds = new Set();
  for (const outcome of townServicesContent.serviceOutcomes ?? []) {
    const owner = outcome?.id ?? "townServiceOutcome";
    for (const field of ["id", "serviceId", "label", "result", "statusFlag"]) {
      requireString(owner, field, outcome?.[field]);
    }
    if (outcomeIds.has(outcome?.id)) fail(owner, `duplicate service outcome id ${outcome?.id}`);
    outcomeIds.add(outcome?.id);
    if (!serviceIds.has(outcome?.serviceId)) {
      fail(owner, `serviceId must reference a Veyrhold service: ${outcome?.serviceId}`);
    }
    requireStringArray(owner, "rewardItemIds", outcome?.rewardItemIds, 1);
    for (const itemId of outcome?.rewardItemIds ?? []) {
      if (!itemIds.has(itemId)) fail(owner, `rewardItemId is not defined in ARPG_ITEMS: ${itemId}`);
    }
  }

  if ((townServicesContent.districtMapNodes ?? []).length !== 4) {
    fail("townServicesContent.districtMapNodes", "exactly four Veyrhold district map nodes are required");
  }
  const mappedDistrictIds = new Set();
  for (const node of townServicesContent.districtMapNodes ?? []) {
    const owner = node?.id ?? "townDistrictMapNode";
    for (const field of [
      "id",
      "districtId",
      "label",
      "mapRole",
      "summary",
      "visualMood",
      "storyFlag",
      "releaseAction",
    ]) {
      requireString(owner, field, node?.[field]);
    }
    if (!veyrholdSubCityIds.has(node?.districtId)) {
      fail(owner, `districtId must reference a Veyrhold sub-city: ${node?.districtId}`);
    }
    if (mappedDistrictIds.has(node?.districtId)) fail(owner, `duplicate district node ${node?.districtId}`);
    mappedDistrictIds.add(node?.districtId);
    requireStringArray(owner, "primaryNpcIds", node?.primaryNpcIds, 1);
    requireStringArray(owner, "serviceIds", node?.serviceIds, 1);
    requireStringArray(owner, "miniQuestIds", node?.miniQuestIds, 1);
    requireStringArray(owner, "rewardItemIds", node?.rewardItemIds, 1);
    for (const npcId of node?.primaryNpcIds ?? []) {
      if (!npcIds.has(npcId)) fail(owner, `primaryNpcId must reference a Veyrhold NPC: ${npcId}`);
    }
    for (const serviceId of node?.serviceIds ?? []) {
      if (!serviceIds.has(serviceId)) fail(owner, `serviceId must reference a Veyrhold service: ${serviceId}`);
    }
    for (const miniQuestId of node?.miniQuestIds ?? []) {
      if (!miniQuestIds.has(miniQuestId)) {
        fail(owner, `miniQuestId must reference a Veyrhold mini-quest: ${miniQuestId}`);
      }
    }
    for (const itemId of node?.rewardItemIds ?? []) {
      if (!itemIds.has(itemId)) fail(owner, `rewardItemId is not defined in ARPG_ITEMS: ${itemId}`);
    }
  }
  for (const districtId of veyrholdSubCityIds) {
    if (!mappedDistrictIds.has(districtId)) {
      fail("townServicesContent.districtMapNodes", `missing Veyrhold district node ${districtId}`);
    }
  }

  if ((townServicesContent.oathmarketVendorWares ?? []).length < 4) {
    fail("townServicesContent.oathmarketVendorWares", "at least four Oathmarket starter wares are required");
  }
  const oathmarketWareIds = new Set();
  for (const ware of townServicesContent.oathmarketVendorWares ?? []) {
    const owner = ware?.id ?? "oathmarketVendorWare";
    for (const field of [
      "id",
      "label",
      "itemId",
      "priceCurrencyItemId",
      "slotHint",
      "qualityHint",
      "comparisonCopy",
      "storyFlag",
    ]) {
      requireString(owner, field, ware?.[field]);
    }
    if (oathmarketWareIds.has(ware?.id)) fail(owner, `duplicate Oathmarket ware id ${ware?.id}`);
    oathmarketWareIds.add(ware?.id);
    if (!itemIds.has(ware?.itemId)) fail(owner, `itemId is not defined in ARPG_ITEMS: ${ware?.itemId}`);
    if (!itemIds.has(ware?.priceCurrencyItemId)) {
      fail(owner, `priceCurrencyItemId is not defined in ARPG_ITEMS: ${ware?.priceCurrencyItemId}`);
    }
    if (!Number.isInteger(ware?.priceAmount) || ware.priceAmount < 1) {
      fail(owner, "priceAmount must be a positive integer");
    }
  }

  if ((townServicesContent.oathmarketLedgerChoices ?? []).length < 3) {
    fail("townServicesContent.oathmarketLedgerChoices", "at least three Oathmarket ledger choices are required");
  }
  const oathmarketChoiceIds = new Set();
  for (const choice of townServicesContent.oathmarketLedgerChoices ?? []) {
    const owner = choice?.id ?? "oathmarketLedgerChoice";
    for (const field of ["id", "label", "stance", "summary", "storyFlag", "outcomeCopy"]) {
      requireString(owner, field, choice?.[field]);
    }
    if (oathmarketChoiceIds.has(choice?.id)) fail(owner, `duplicate Oathmarket choice id ${choice?.id}`);
    oathmarketChoiceIds.add(choice?.id);
    requireStringArray(owner, "rewardItemIds", choice?.rewardItemIds, 1);
    if (!Number.isFinite(choice?.reputationDelta) || choice.reputationDelta < 1) {
      fail(owner, "reputationDelta must be a positive number");
    }
    for (const itemId of choice?.rewardItemIds ?? []) {
      if (!itemIds.has(itemId)) fail(owner, `rewardItemId is not defined in ARPG_ITEMS: ${itemId}`);
    }
  }

  const requiredArmorFittingSlots = ["helm", "armor", "gloves", "boots"];
  if ((townServicesContent.wardensStepsArmorFittings ?? []).length < requiredArmorFittingSlots.length) {
    fail("townServicesContent.wardensStepsArmorFittings", "Warden's Steps must define helm, armor, gloves, and boots fitting orders");
  }
  const armorFittingSlots = new Set();
  const armorFittingIds = new Set();
  for (const fitting of townServicesContent.wardensStepsArmorFittings ?? []) {
    const owner = fitting?.id ?? "wardensStepsArmorFitting";
    for (const field of [
      "id",
      "label",
      "slot",
      "serviceId",
      "npcId",
      "starterItemId",
      "visualUpgrade",
      "statLesson",
      "storyFlag",
      "comparisonCopy",
    ]) {
      requireString(owner, field, fitting?.[field]);
    }
    if (armorFittingIds.has(fitting?.id)) fail(owner, `duplicate Warden's Steps fitting id ${fitting?.id}`);
    armorFittingIds.add(fitting?.id);
    armorFittingSlots.add(fitting?.slot);
    if (!requiredArmorFittingSlots.includes(fitting?.slot)) {
      fail(owner, `slot must be one of ${requiredArmorFittingSlots.join(", ")}: ${fitting?.slot}`);
    }
    if (!serviceIds.has(fitting?.serviceId)) {
      fail(owner, `serviceId must reference a Veyrhold service: ${fitting?.serviceId}`);
    }
    if (!npcIds.has(fitting?.npcId)) fail(owner, `npcId must reference a Veyrhold NPC: ${fitting?.npcId}`);
    if (!itemIds.has(fitting?.starterItemId)) {
      fail(owner, `starterItemId is not defined in ARPG_ITEMS: ${fitting?.starterItemId}`);
    }
    requireStringArray(owner, "materialItemIds", fitting?.materialItemIds, 1);
    requireStringArray(owner, "rewardItemIds", fitting?.rewardItemIds, 1);
    requireStringArray(owner, "qualityPath", fitting?.qualityPath, 3);
    for (const itemId of [...(fitting?.materialItemIds ?? []), ...(fitting?.rewardItemIds ?? [])]) {
      if (!itemIds.has(itemId)) fail(owner, `itemId is not defined in ARPG_ITEMS: ${itemId}`);
    }
  }
  for (const slot of requiredArmorFittingSlots) {
    if (!armorFittingSlots.has(slot)) {
      fail("townServicesContent.wardensStepsArmorFittings", `missing Warden's Steps armor fitting slot ${slot}`);
    }
  }

  if ((townServicesContent.wardensStepsOathContracts ?? []).length < 3) {
    fail("townServicesContent.wardensStepsOathContracts", "at least three Warden's Steps civic oath contracts are required");
  }
  const oathContractIds = new Set();
  for (const contract of townServicesContent.wardensStepsOathContracts ?? []) {
    const owner = contract?.id ?? "wardensStepsOathContract";
    for (const field of ["id", "label", "sponsorNpcId", "serviceId", "stance", "summary", "storyFlag", "outcomeCopy"]) {
      requireString(owner, field, contract?.[field]);
    }
    if (oathContractIds.has(contract?.id)) fail(owner, `duplicate Warden's Steps contract id ${contract?.id}`);
    oathContractIds.add(contract?.id);
    if (!npcIds.has(contract?.sponsorNpcId)) {
      fail(owner, `sponsorNpcId must reference a Veyrhold NPC: ${contract?.sponsorNpcId}`);
    }
    if (!serviceIds.has(contract?.serviceId)) {
      fail(owner, `serviceId must reference a Veyrhold service: ${contract?.serviceId}`);
    }
    requireStringArray(owner, "rewardItemIds", contract?.rewardItemIds, 1);
    if (!Number.isFinite(contract?.reputationDelta) || contract.reputationDelta < 1) {
      fail(owner, "reputationDelta must be a positive number");
    }
    for (const itemId of contract?.rewardItemIds ?? []) {
      if (!itemIds.has(itemId)) fail(owner, `rewardItemId is not defined in ARPG_ITEMS: ${itemId}`);
    }
  }

  if ((townServicesContent.bellrootCommonsBrews ?? []).length < 3) {
    fail("townServicesContent.bellrootCommonsBrews", "at least three Bellroot Commons safe alchemy brews are required");
  }
  const bellrootBrewIds = new Set();
  for (const brew of townServicesContent.bellrootCommonsBrews ?? []) {
    const owner = brew?.id ?? "bellrootCommonsBrew";
    for (const field of ["id", "label", "serviceId", "npcId", "brewRole", "summary", "storyFlag", "outcomeCopy"]) {
      requireString(owner, field, brew?.[field]);
    }
    if (bellrootBrewIds.has(brew?.id)) fail(owner, `duplicate Bellroot brew id ${brew?.id}`);
    bellrootBrewIds.add(brew?.id);
    if (!serviceIds.has(brew?.serviceId)) fail(owner, `serviceId must reference a Veyrhold service: ${brew?.serviceId}`);
    if (!npcIds.has(brew?.npcId)) fail(owner, `npcId must reference a Veyrhold NPC: ${brew?.npcId}`);
    requireStringArray(owner, "ingredientItemIds", brew?.ingredientItemIds, 1);
    requireStringArray(owner, "rewardItemIds", brew?.rewardItemIds, 1);
    requireStringArray(owner, "conditionTags", brew?.conditionTags, 1);
    for (const itemId of [...(brew?.ingredientItemIds ?? []), ...(brew?.rewardItemIds ?? [])]) {
      if (!itemIds.has(itemId)) fail(owner, `itemId is not defined in ARPG_ITEMS: ${itemId}`);
    }
  }

  if ((townServicesContent.bellrootLampReadings ?? []).length < 3) {
    fail("townServicesContent.bellrootLampReadings", "at least three Bellroot Commons oath-lamp readings are required");
  }
  const bellrootReadingIds = new Set();
  for (const reading of townServicesContent.bellrootLampReadings ?? []) {
    const owner = reading?.id ?? "bellrootLampReading";
    for (const field of ["id", "label", "npcId", "districtId", "mysteryHook", "summary", "storyFlag", "outcomeCopy"]) {
      requireString(owner, field, reading?.[field]);
    }
    if (bellrootReadingIds.has(reading?.id)) fail(owner, `duplicate Bellroot lamp reading id ${reading?.id}`);
    bellrootReadingIds.add(reading?.id);
    if (!npcIds.has(reading?.npcId)) fail(owner, `npcId must reference a Veyrhold NPC: ${reading?.npcId}`);
    if (!veyrholdSubCityIds.has(reading?.districtId)) {
      fail(owner, `districtId must reference a Veyrhold sub-city: ${reading?.districtId}`);
    }
    requireStringArray(owner, "rewardItemIds", reading?.rewardItemIds, 1);
    if (!Number.isFinite(reading?.reputationDelta) || reading.reputationDelta < 1) {
      fail(owner, "reputationDelta must be a positive number");
    }
    for (const itemId of reading?.rewardItemIds ?? []) {
      if (!itemIds.has(itemId)) fail(owner, `rewardItemId is not defined in ARPG_ITEMS: ${itemId}`);
    }
  }

  if ((townServicesContent.pilgrimRowsRestOptions ?? []).length < 3) {
    fail("townServicesContent.pilgrimRowsRestOptions", "at least three Pilgrim Rows rest options are required");
  }
  const pilgrimRestIds = new Set();
  for (const rest of townServicesContent.pilgrimRowsRestOptions ?? []) {
    const owner = rest?.id ?? "pilgrimRowsRestOption";
    for (const field of ["id", "label", "serviceId", "npcId", "restRole", "summary", "storyFlag", "outcomeCopy"]) {
      requireString(owner, field, rest?.[field]);
    }
    if (pilgrimRestIds.has(rest?.id)) fail(owner, `duplicate Pilgrim Rows rest option id ${rest?.id}`);
    pilgrimRestIds.add(rest?.id);
    if (!serviceIds.has(rest?.serviceId)) fail(owner, `serviceId must reference a Veyrhold service: ${rest?.serviceId}`);
    if (!npcIds.has(rest?.npcId)) fail(owner, `npcId must reference a Veyrhold NPC: ${rest?.npcId}`);
    requireStringArray(owner, "rewardItemIds", rest?.rewardItemIds, 1);
    requireStringArray(owner, "roadPrepTags", rest?.roadPrepTags, 1);
    for (const itemId of rest?.rewardItemIds ?? []) {
      if (!itemIds.has(itemId)) fail(owner, `rewardItemId is not defined in ARPG_ITEMS: ${itemId}`);
    }
  }

  if ((townServicesContent.pilgrimRowsRoadRumors ?? []).length < 3) {
    fail("townServicesContent.pilgrimRowsRoadRumors", "at least three Pilgrim Rows road rumors are required");
  }
  const pilgrimRumorIds = new Set();
  for (const rumor of townServicesContent.pilgrimRowsRoadRumors ?? []) {
    const owner = rumor?.id ?? "pilgrimRowsRoadRumor";
    for (const field of ["id", "label", "npcId", "districtId", "rumorHook", "routeHint", "storyFlag", "outcomeCopy"]) {
      requireString(owner, field, rumor?.[field]);
    }
    if (pilgrimRumorIds.has(rumor?.id)) fail(owner, `duplicate Pilgrim Rows road rumor id ${rumor?.id}`);
    pilgrimRumorIds.add(rumor?.id);
    if (!npcIds.has(rumor?.npcId)) fail(owner, `npcId must reference a Veyrhold NPC: ${rumor?.npcId}`);
    if (!veyrholdSubCityIds.has(rumor?.districtId)) {
      fail(owner, `districtId must reference a Veyrhold sub-city: ${rumor?.districtId}`);
    }
    requireStringArray(owner, "rewardItemIds", rumor?.rewardItemIds, 1);
    if (!Number.isFinite(rumor?.reputationDelta) || rumor.reputationDelta < 1) {
      fail(owner, "reputationDelta must be a positive number");
    }
    for (const itemId of rumor?.rewardItemIds ?? []) {
      if (!itemIds.has(itemId)) fail(owner, `rewardItemId is not defined in ARPG_ITEMS: ${itemId}`);
    }
  }

  if ((townServicesContent.districtHooks ?? []).length !== 4) {
    fail("townServicesContent.districtHooks", "exactly four Veyrhold district hooks are required");
  }
  for (const hook of townServicesContent.districtHooks ?? []) {
    const owner = hook?.id ?? "townDistrictHook";
    for (const field of ["id", "districtId", "label", "releaseRole", "firstConflict"]) {
      requireString(owner, field, hook?.[field]);
    }
    if (!veyrholdSubCityIds.has(hook?.districtId)) {
      fail(owner, `districtId must reference a Veyrhold sub-city: ${hook?.districtId}`);
    }
  }

  const requiredStarterSlots = ["helm", "armor", "gloves", "boots", "ring-left", "ring-right", "amulet"];
  const starterSlots = new Set((townServicesContent.starterGearProgression ?? []).map((entry) => entry?.slot));
  for (const slot of requiredStarterSlots) {
    if (!starterSlots.has(slot)) fail("townServicesContent.starterGearProgression", `missing starter slot ${slot}`);
  }
  for (const entry of townServicesContent.starterGearProgression ?? []) {
    const owner = entry?.slot ?? "starterGearProgression";
    for (const field of ["slot", "starterItemId", "firstUpgradeTheme", "source", "visualRule"]) {
      requireString(owner, field, entry?.[field]);
    }
    if (!gearSlotIds.has(normalizeId(entry?.slot))) fail(owner, `slot is not a known gear slot: ${entry?.slot}`);
    if (!itemIds.has(entry?.starterItemId)) {
      fail(owner, `starterItemId is not defined in ARPG_ITEMS: ${entry?.starterItemId}`);
    }
    requireStringArray(owner, "qualityPath", entry?.qualityPath, 3);
  }
  requireStringArray("townServicesContent", "releaseAcceptance", townServicesContent.releaseAcceptance, 5);
}

if (!arsenalContent) {
  fail("arsenalContent", "lib/arpgArsenalContent.json is required for MW6V/W arsenal visual itemization");
} else {
  if (arsenalContent.schemaVersion !== "mw6-arsenal-visual-itemization-v1") {
    fail("arsenalContent.schemaVersion", "expected mw6-arsenal-visual-itemization-v1");
  }
  const weaponFamilyIds = normalizedEntryIds(armoryEconomyContent?.weaponFamilies ?? []);
  const qualityIds = normalizedEntryIds(armoryEconomyContent?.qualities ?? []);
  const damageTypeIds = new Set(content.systems?.damageTypes ?? []);
  const affixIds = new Set(["might", "ward", "focus", "speed", "crit", "cooldown", "resonance"]);
  const itemSection = sourceSection(gameContentSource, "export const ARPG_ITEMS", "export const ARPG_STARTER_ITEM_IDS");
  const itemIds = objectEntryIds(itemSection);

  if ((arsenalContent.weaponItemTemplates ?? []).length !== (armoryEconomyContent?.weaponFamilies ?? []).length) {
    fail("arsenalContent.weaponItemTemplates", "weapon templates must cover every weapon family exactly once");
  }
  if ((arsenalContent.qualityRules ?? []).length !== (armoryEconomyContent?.qualities ?? []).length) {
    fail("arsenalContent.qualityRules", "quality rules must cover every quality tier exactly once");
  }
  if ((arsenalContent.namedWeaponCards ?? []).length < 8) {
    fail("arsenalContent.namedWeaponCards", "at least 8 named weapon cards are required");
  }
  if ((arsenalContent.vfxFrames ?? []).length < 12) {
    fail("arsenalContent.vfxFrames", "at least 12 arsenal VFX/drop frames are required");
  }

  const templateFamilyIds = new Set();
  for (const template of arsenalContent.weaponItemTemplates ?? []) {
    const owner = template?.id ?? "arsenalWeaponTemplate";
    for (const field of ["id", "familyId", "name", "slot", "damageType", "upgradeTrack"]) {
      requireString(owner, field, template?.[field]);
    }
    if (!weaponFamilyIds.has(normalizeId(template?.familyId))) fail(owner, `unknown familyId ${template?.familyId}`);
    if (templateFamilyIds.has(template?.familyId)) fail(owner, `duplicate weapon family template ${template?.familyId}`);
    templateFamilyIds.add(template?.familyId);
    if (!damageTypeIds.has(template?.damageType)) fail(owner, `unknown damageType ${template?.damageType}`);
    if (!Number.isInteger(template?.iconFrame) || template.iconFrame < 0 || template.iconFrame > 20) {
      fail(owner, "iconFrame must fit the 21-frame arsenal weapon icon sheet");
    }
    if (!Number.isFinite(template?.basePower) || template.basePower <= 0) fail(owner, "basePower must be positive");
    requireStats(owner, template?.statWeights);
    requireStringArray(owner, "classAffinity", template?.classAffinity, 1);
    requireStringArray(owner, "dropSources", template?.dropSources, 1);
  }
  for (const familyId of weaponFamilyIds) {
    if (!new Set([...templateFamilyIds].map((id) => normalizeId(id))).has(familyId)) {
      fail("arsenalContent.weaponItemTemplates", `missing weapon template for ${familyId}`);
    }
  }

  for (const quality of arsenalContent.qualityRules ?? []) {
    const owner = quality?.id ?? "arsenalQualityRule";
    if (!qualityIds.has(normalizeId(quality?.id))) fail(owner, `unknown quality ${quality?.id}`);
    if (!Number.isInteger(quality?.overlayFrame) || quality.overlayFrame < 0 || quality.overlayFrame > 6) {
      fail(owner, "overlayFrame must fit the 7-frame quality overlay sheet");
    }
    for (const field of ["affixCount", "socketCount", "upgradeCap", "statBudget", "dropWeight"]) {
      if (!Number.isFinite(quality?.[field]) || quality[field] < 0) fail(owner, `${field} must be non-negative`);
    }
    if (!Array.isArray(quality?.salvageOutput) || quality.salvageOutput.length === 0) {
      fail(owner, "salvageOutput is required");
    }
  }

  for (const weapon of arsenalContent.namedWeaponCards ?? []) {
    const owner = weapon?.id ?? "namedWeaponCard";
    for (const field of ["id", "itemId", "name", "familyId", "quality", "damageType", "source", "lore"]) {
      requireString(owner, field, weapon?.[field]);
    }
    if (!itemIds.has(weapon?.itemId)) fail(owner, `itemId is not defined in ARPG_ITEMS: ${weapon?.itemId}`);
    if (!weaponFamilyIds.has(normalizeId(weapon?.familyId))) fail(owner, `unknown familyId ${weapon?.familyId}`);
    if (!qualityIds.has(normalizeId(weapon?.quality))) fail(owner, `unknown quality ${weapon?.quality}`);
    if (!damageTypeIds.has(weapon?.damageType)) fail(owner, `unknown damageType ${weapon?.damageType}`);
    if (!Number.isInteger(weapon?.cardFrame) || weapon.cardFrame < 0 || weapon.cardFrame > 7) {
      fail(owner, "cardFrame must fit the 8-frame named weapon card sheet");
    }
    for (const affixId of weapon?.affixes ?? []) {
      if (!affixIds.has(affixId)) fail(owner, `unknown affix ${affixId}`);
    }
  }

  for (const effect of arsenalContent.vfxFrames ?? []) {
    const owner = effect?.id ?? "arsenalVfxFrame";
    for (const field of ["id", "label", "kind", "color"]) requireString(owner, field, effect?.[field]);
    for (const field of ["frame", "reducedMotionFrame"]) {
      if (!Number.isInteger(effect?.[field]) || effect[field] < 0 || effect[field] > 11) {
        fail(owner, `${field} must fit the 12-frame arsenal VFX sheet`);
      }
    }
  }
}

if (!worldLoopContent) {
  fail("worldLoopContent", "lib/arpgWorldLoopContent.json is required for MW6I-S world-loop systems");
} else {
  if (worldLoopContent.schemaVersion !== "mw6-world-loop-v1") {
    fail("worldLoopContent.schemaVersion", "expected mw6-world-loop-v1");
  }
  if ((worldLoopContent.campaignPhases ?? []).length < 7) {
    fail("worldLoopContent.campaignPhases", "at least 7 campaign phases are required");
  }
  if (!String(JSON.stringify(worldLoopContent.campaignPhases ?? [])).includes("The Hollow Regent")) {
    fail("worldLoopContent.campaignPhases", "campaign finale must reference The Hollow Regent");
  }
  if ((worldLoopContent.routeEventTypes ?? []).length < 10) {
    fail("worldLoopContent.routeEventTypes", "at least 10 route event types are required");
  }
  if ((worldLoopContent.npcRoles ?? []).length < 12) {
    fail("worldLoopContent.npcRoles", "at least 12 NPC roles are required");
  }
  if ((worldLoopContent.companionArcTemplates ?? []).length < companions.length) {
    fail("worldLoopContent.companionArcTemplates", "at least one arc template per companion is required");
  }
  const companionArcIds = entryIds(worldLoopContent.companionArcTemplates);
  for (const companion of companions) {
    if (!companionArcIds.has(companion.id)) {
      fail("worldLoopContent.companionArcTemplates", `missing companion arc ${companion.id}`);
    }
  }
}

if (!endgameContent) {
  fail("endgameContent", "lib/arpgEndgameContent.json is required for MW6T dungeons/endgame systems");
} else {
  if (endgameContent.schemaVersion !== "mw6-endgame-foundation-v1") {
    fail("endgameContent.schemaVersion", "expected mw6-endgame-foundation-v1");
  }

  const difficultyIds = entryIds(endgameContent.difficultyTiers);
  const dungeonArchetypeIds = entryIds(endgameContent.dungeonArchetypes);
  const affixRotationIds = entryIds(endgameContent.eliteAffixRotations);
  const relicTrialRuleIds = entryIds(endgameContent.relicTrialRules);
  const bossRematchRuleIds = entryIds(endgameContent.bossRematchRules);
  const treasureMapRuleIds = entryIds(endgameContent.treasureMapRules);
  const rewardTrackIds = entryIds(endgameContent.rewardTracks);
  const goalIds = entryIds(endgameContent.collectionGoals);
  const productionClassIds = new Set(classes.map((klass) => klass.id));
  const traitIds = normalizedEntryIds(enemyTaxonomyContent?.traits ?? []);
  const buffIds = normalizedEntryIds(enemyTaxonomyContent?.buffs ?? []);
  const debuffIds = normalizedEntryIds(enemyTaxonomyContent?.debuffs ?? []);
  const currencyIds = normalizedEntryIds(armoryEconomyContent?.currencies ?? []);
  const damageTypeIds = new Set(content.systems?.damageTypes ?? []);

  if ((endgameContent.difficultyTiers ?? []).length < 5) {
    fail("endgameContent.difficultyTiers", "at least 5 difficulty tiers are required");
  }
  if (!difficultyIds.has(endgameContent.defaultDifficultyTierId)) {
    fail("endgameContent.defaultDifficultyTierId", "default difficulty must reference a difficulty tier");
  }
  if ((endgameContent.dungeonArchetypes ?? []).length < 6) {
    fail("endgameContent.dungeonArchetypes", "at least 6 repeatable dungeon archetypes are required");
  }
  if ((endgameContent.eliteAffixRotations ?? []).length < 8) {
    fail("endgameContent.eliteAffixRotations", "at least 8 elite affix rotations are required");
  }
  if ((endgameContent.relicTrialRules ?? []).length < 6) {
    fail("endgameContent.relicTrialRules", "at least 6 relic trial rules are required");
  }
  if ((endgameContent.bossRematchRules ?? []).length < 4) {
    fail("endgameContent.bossRematchRules", "at least 4 boss rematch rules are required");
  }
  if ((endgameContent.treasureMapRules ?? []).length < 4) {
    fail("endgameContent.treasureMapRules", "at least 4 treasure map rules are required");
  }
  if ((endgameContent.arenaChallenges ?? []).length !== classes.length) {
    fail("endgameContent.arenaChallenges", "exactly one arena challenge per class is required");
  }
  if ((endgameContent.collectionGoals ?? []).length < 7) {
    fail("endgameContent.collectionGoals", "at least 7 endgame collection goals are required");
  }
  if ((endgameContent.cosmeticRewards ?? []).length < 8) {
    fail("endgameContent.cosmeticRewards", "at least 8 cosmetic rewards are required");
  }
  if ((endgameContent.rewardTracks ?? []).length < 5) {
    fail("endgameContent.rewardTracks", "at least 5 reward tracks are required");
  }

  for (const archetype of endgameContent.dungeonArchetypes ?? []) {
    const owner = archetype?.id ?? "dungeonArchetype";
    for (const field of ["id", "name", "objective", "rewardTrackId"]) {
      requireString(owner, field, archetype?.[field]);
    }
    if (!Number.isInteger(archetype?.roomCount) || archetype.roomCount < 3) {
      fail(owner, "roomCount must be an integer >= 3");
    }
    if (!rewardTrackIds.has(archetype?.rewardTrackId)) {
      fail(owner, `unknown rewardTrackId ${archetype?.rewardTrackId}`);
    }
  }
  for (const rotation of endgameContent.eliteAffixRotations ?? []) {
    const owner = rotation?.id ?? "eliteAffixRotation";
    requireString(owner, "id", rotation?.id);
    requireString(owner, "label", rotation?.label);
    for (const traitId of rotation?.traitIds ?? []) {
      if (!traitIds.has(normalizeId(traitId))) fail(owner, `unknown trait ${traitId}`);
    }
    for (const buffId of rotation?.buffIds ?? []) {
      if (!buffIds.has(normalizeId(buffId))) fail(owner, `unknown buff ${buffId}`);
    }
    for (const debuffId of rotation?.debuffIds ?? []) {
      if (!debuffIds.has(normalizeId(debuffId))) fail(owner, `unknown debuff ${debuffId}`);
    }
    if (!Number.isFinite(rotation?.rewardMultiplier) || rotation.rewardMultiplier <= 1) {
      fail(owner, "rewardMultiplier must be > 1");
    }
  }
  for (const rule of endgameContent.relicTrialRules ?? []) {
    const owner = rule?.id ?? "relicTrialRule";
    for (const field of ["id", "label", "statFocus", "damageType", "mechanic"]) {
      requireString(owner, field, rule?.[field]);
    }
    if (!damageTypeIds.has(rule?.damageType)) fail(owner, `unknown damageType ${rule?.damageType}`);
  }
  for (const rule of [...(endgameContent.bossRematchRules ?? []), ...(endgameContent.treasureMapRules ?? [])]) {
    const owner = rule?.id ?? "endgameRule";
    requireString(owner, "id", rule?.id);
    if (!rewardTrackIds.has(rule?.rewardTrackId)) fail(owner, `unknown rewardTrackId ${rule?.rewardTrackId}`);
  }
  for (const challenge of endgameContent.arenaChallenges ?? []) {
    const owner = challenge?.id ?? "arenaChallenge";
    for (const field of ["id", "classId", "label", "objective"]) requireString(owner, field, challenge?.[field]);
    if (!productionClassIds.has(challenge?.classId)) fail(owner, `unknown classId ${challenge?.classId}`);
  }
  for (const reward of endgameContent.cosmeticRewards ?? []) {
    const owner = reward?.id ?? "cosmeticReward";
    for (const field of ["id", "label", "sourceGoalId", "paletteAccent"]) requireString(owner, field, reward?.[field]);
    if (!goalIds.has(reward?.sourceGoalId)) fail(owner, `unknown sourceGoalId ${reward?.sourceGoalId}`);
  }
  for (const track of endgameContent.rewardTracks ?? []) {
    const owner = track?.id ?? "rewardTrack";
    requireString(owner, "id", track?.id);
    if (!currencyIds.has(normalizeId(track?.currencyId))) fail(owner, `unknown currencyId ${track?.currencyId}`);
    if (!Number.isInteger(track?.quantity) || track.quantity < 1) fail(owner, "quantity must be a positive integer");
  }

  if (cities.length !== 12) fail("endgameContent.derivedDungeons", "MW6T expects 12 derived city dungeons");
  if (subCityCount !== 48) fail("endgameContent.derivedTreasureMaps", "MW6T expects 48 derived treasure maps/timed rooms");
  if (!goalIds.has("city-reputation-completion")) fail("endgameContent.collectionGoals", "city reputation completion goal is required");
  if (!goalIds.has("postgame-codex-completion")) fail("endgameContent.collectionGoals", "postgame codex completion goal is required");
  if (!String(JSON.stringify(endgameContent.postgameUnlockFlags ?? [])).includes("postgame:relic-trials-unlocked")) {
    fail("endgameContent.postgameUnlockFlags", "postgame relic-trials unlock flag is required");
  }
}

if (!characterContent) {
  fail("characterContent", "lib/arpgCharacterContent.json is required for MW6F-H character foundation");
} else {
  if (characterContent.schemaVersion !== "mw6-character-foundation-v1") {
    fail("characterContent.schemaVersion", "expected mw6-character-foundation-v1");
  }

  const productionRaceIds = new Set(races.map((race) => race.id));
  const productionClassIds = new Set(classes.map((klass) => klass.id));
  const cityOrStartIds = new Set(["first-reliquary", ...cityIds]);
  const defaults = characterContent.defaults ?? {};

  for (const field of ["characterName", "raceId", "originId", "classPathId", "subclassId", "portraitId", "paletteId"]) {
    requireString("characterContent.defaults", field, defaults[field]);
  }

  const palettes = characterContent.palettes ?? [];
  if (!Array.isArray(palettes) || palettes.length < 8) fail("characterContent.palettes", "at least 8 palettes are required");
  const paletteIds = uniqueIds("characterContent.palettes", palettes);
  for (const palette of palettes) {
    const owner = palette?.id ?? "palette";
    for (const field of ["id", "label", "primary", "secondary", "accent", "lineageId"]) {
      requireString(owner, field, palette?.[field]);
    }
  }

  const portraits = characterContent.portraits ?? [];
  if (!Array.isArray(portraits) || portraits.length < 8) fail("characterContent.portraits", "at least 8 portraits are required");
  const portraitIds = uniqueIds("characterContent.portraits", portraits);
  for (const portrait of portraits) {
    const owner = portrait?.id ?? "portrait";
    for (const field of ["id", "label", "lineageId", "paletteId"]) requireString(owner, field, portrait?.[field]);
    if (!paletteIds.has(portrait?.paletteId)) fail(owner, `unknown paletteId ${portrait?.paletteId}`);
  }

  const lineages = characterContent.lineages ?? [];
  if (!Array.isArray(lineages) || lineages.length !== 8) {
    fail("characterContent.lineages", "exactly 8 playable lineages are required");
  }
  const lineageIds = uniqueIds("characterContent.lineages", lineages);
  for (const lineage of lineages) {
    const owner = lineage?.id ?? "lineage";
    if (!productionRaceIds.has(lineage?.id)) fail(owner, "lineage id must match production race id");
    for (const field of ["id", "name", "summary", "spritePaletteNotes", "originText", "questHook"]) {
      requireString(owner, field, lineage?.[field]);
    }
    requireStats(owner, lineage?.baseStats);
    requireStringArray(owner, "dialogueTags", lineage?.dialogueTags, 2);
    requireStringArray(owner, "paletteIds", lineage?.paletteIds, 1);
    if (!lineage?.passive || typeof lineage.passive !== "object") fail(owner, "passive is required");
    for (const field of ["id", "name", "summary"]) requireString(`${owner}.passive`, field, lineage?.passive?.[field]);
    requireStats(`${owner}.passive`, lineage?.passive?.statBonus);
    for (const hook of lineage?.cityReputationHooks ?? []) {
      if (!cityOrStartIds.has(hook?.cityId)) fail(owner, `unknown city hook ${hook?.cityId}`);
      if (!Number.isFinite(hook?.delta)) fail(owner, "city hook delta must be numeric");
      requireString(owner, "city hook summary", hook?.summary);
    }
    for (const paletteId of lineage?.paletteIds ?? []) {
      if (!paletteIds.has(paletteId)) fail(owner, `unknown paletteId ${paletteId}`);
    }
  }

  const classTrees = characterContent.classTrees ?? [];
  if (!Array.isArray(classTrees) || classTrees.length !== 8) {
    fail("characterContent.classTrees", "exactly 8 class trees are required");
  }
  const classTreeIds = uniqueIds("characterContent.classTrees", classTrees);
  const skillIds = new Set();
  for (const tree of classTrees) {
    const owner = tree?.id ?? "classTree";
    if (!productionClassIds.has(tree?.id)) fail(owner, "class tree id must match production class id");
    for (const field of ["id", "name", "resource", "role", "accent"]) requireString(owner, field, tree?.[field]);
    if (!Array.isArray(tree?.subclasses) || tree.subclasses.length !== 2) fail(owner, "exactly 2 subclasses are required");
    const subclassIds = new Set();
    for (const subclass of tree?.subclasses ?? []) {
      const subclassOwner = subclass?.id ?? `${owner}.subclass`;
      if (subclassIds.has(subclassOwner)) fail(subclassOwner, "duplicate subclass id");
      subclassIds.add(subclassOwner);
      for (const field of ["id", "name", "summary", "starterSkillId", "perk", "statusEffect"]) {
        requireString(subclassOwner, field, subclass?.[field]);
      }
      requireStats(subclassOwner, subclass?.statBonus);
    }
    if (!subclassIds.has(tree?.starterBuild?.subclassId)) fail(owner, "starterBuild subclassId must reference a subclass");
    for (const field of ["name", "subclassId", "activeSkillId", "passiveSkillId"]) {
      requireString(`${owner}.starterBuild`, field, tree?.starterBuild?.[field]);
    }
    requireStringArray(`${owner}.starterBuild`, "hotbarSkillIds", tree?.starterBuild?.hotbarSkillIds, 1);
    if (!Array.isArray(tree?.skillNodes) || tree.skillNodes.length < 2) fail(owner, "at least 2 skill nodes are required");
    for (const skill of tree?.skillNodes ?? []) {
      const skillOwner = skill?.id ?? `${owner}.skill`;
      if (skillIds.has(skillOwner)) fail(skillOwner, "duplicate skill id");
      skillIds.add(skillOwner);
      for (const field of ["id", "name", "kind", "summary", "accent"]) requireString(skillOwner, field, skill?.[field]);
      if (skill?.pathId !== tree?.id) fail(skillOwner, "pathId must match class tree id");
      if (!Number.isInteger(skill?.tier) || skill.tier < 1) fail(skillOwner, "tier must be a positive integer");
      if (!Number.isInteger(skill?.rankMax) || skill.rankMax < 1) fail(skillOwner, "rankMax must be a positive integer");
      if (!Number.isInteger(skill?.unlockLevel) || skill.unlockLevel < 1) fail(skillOwner, "unlockLevel must be a positive integer");
      if (!Number.isFinite(skill?.cooldownMs) || skill.cooldownMs < 0) fail(skillOwner, "cooldownMs must be non-negative");
      if (!Number.isFinite(skill?.resourceCost) || skill.resourceCost < 0) fail(skillOwner, "resourceCost must be non-negative");
      requireStats(skillOwner, skill?.statBonus);
      if (!Array.isArray(skill?.prerequisiteIds)) fail(skillOwner, "prerequisiteIds must be an array");
      if (!Array.isArray(skill?.statusEffects)) fail(skillOwner, "statusEffects must be an array");
    }
  }

  if (!lineageIds.has(defaults.raceId)) fail("characterContent.defaults", "raceId must reference a lineage");
  if (!classTreeIds.has(defaults.classPathId)) fail("characterContent.defaults", "classPathId must reference a class tree");
  if (!paletteIds.has(defaults.paletteId)) fail("characterContent.defaults", "paletteId must reference a palette");
  if (!portraitIds.has(defaults.portraitId)) fail("characterContent.defaults", "portraitId must reference a portrait");
  if (!skillIds.size) fail("characterContent.skillNodes", "skill nodes are required");

  for (const tree of classTrees) {
    const owner = tree?.id ?? "classTree";
    const localSkillIds = new Set((tree?.skillNodes ?? []).map((skill) => skill.id));
    for (const skillId of [
      tree?.starterBuild?.activeSkillId,
      tree?.starterBuild?.passiveSkillId,
      ...(tree?.starterBuild?.hotbarSkillIds ?? []),
      ...(tree?.subclasses ?? []).map((subclass) => subclass.starterSkillId),
    ]) {
      if (!localSkillIds.has(skillId)) fail(owner, `starter skill ${skillId} must reference this class tree`);
    }
    for (const skill of tree?.skillNodes ?? []) {
      for (const prerequisiteId of skill?.prerequisiteIds ?? []) {
        if (!localSkillIds.has(prerequisiteId)) fail(skill.id, `unknown prerequisite ${prerequisiteId}`);
      }
    }
  }
}

if (!completionContent) {
  fail("completionContent", "lib/arpgCompletionContent.json is required for MW6 full-game completion tracking");
} else {
  if (completionContent.schemaVersion !== "mw6-completion-program-v1") {
    fail("completionContent.schemaVersion", "expected mw6-completion-program-v1");
  }
  if (completionContent.parentId !== "MW6-ARPG-FULL-GAME-PRODUCTION") {
    fail("completionContent.parentId", "expected MW6-ARPG-FULL-GAME-PRODUCTION");
  }
  requireString("completionContent", "title", completionContent.title);
  requireString("completionContent", "completionDefinition", completionContent.completionDefinition);
  requireString("completionContent", "resourcesTarget", completionContent.resourcesTarget);
  const tracks = completionContent.tracks ?? [];
  if (!Array.isArray(tracks) || tracks.length < 13) {
    fail("completionContent.tracks", "MW6 completion program must cover shipped slices plus MW6U-AA remaining tracks");
  }
  const trackIds = uniqueIds("completionContent.tracks", tracks);
  const requiredCompletionTrackIds = [
    "MW6A-E-BIBLE-FOUNDATION",
    "MW6F-H-CHARACTER-FOUNDATION",
    "MW6I-S-SYSTEMS-WORLD-FOUNDATION",
    "MW6T-DUNGEONS-ENDGAME",
    "MW6W-IMAGE-DRIVEN-RPG-SHELL",
    "MW6U-ARPG-ASSET-PIPELINE",
    "MW6U/V-GENERATOR-ASSISTED-GAME-ART",
    "MW6V-REAL-ASSET-INTAKE",
    "MW6V-ARPG-ART-AUDIO-VFX",
    "MW6W-ARPG-HUD-MENUS-CODEX",
    "MW6X-ARPG-SAVE-MIGRATION",
    "MW6Y-ARPG-CONTENT-TOOLS",
    "MW6Z-ARPG-BALANCE-PLAYTEST",
    "MW6AA-ARPG-TESTING-RELEASE-GATES",
  ];
  for (const trackId of requiredCompletionTrackIds) {
    if (!trackIds.has(trackId)) fail("completionContent.tracks", `missing completion track ${trackId}`);
  }
  const statusSet = new Set(["done", "current", "next", "blocked"]);
  const categorySet = new Set(["assets", "balance", "canon", "endgame", "player", "presentation", "release", "save", "systems", "tools", "ui"]);
  for (const track of tracks) {
    const owner = track?.id ?? "completionTrack";
    for (const field of ["id", "label", "status", "category", "summary", "docPath", "runtimeSurface"]) {
      requireString(owner, field, track?.[field]);
    }
    if (!statusSet.has(track?.status)) fail(owner, `unknown status ${track?.status}`);
    if (!categorySet.has(track?.category)) fail(owner, `unknown category ${track?.category}`);
    requireStringArray(owner, "requiredGates", track?.requiredGates, 1);
    requireStringArray(owner, "acceptance", track?.acceptance, 1);
    const docPath = String(track?.docPath ?? "");
    if (docPath.startsWith("/") || docPath.includes("..")) {
      fail(owner, "docPath must be a repo-relative safe path");
    } else if (!fs.existsSync(path.join(repoRoot, docPath))) {
      fail(owner, `docPath does not exist: ${docPath}`);
    }
  }
  if (!tracks.some((track) => track.status === "blocked" && track.id === "MW6V-REAL-ASSET-INTAKE")) {
    fail("completionContent.tracks", "real asset intake must remain blocked until official assets exist");
  }
  if (!tracks.some((track) => track.status === "current" && track.id === "MW6U-ARPG-ASSET-PIPELINE")) {
    fail("completionContent.tracks", "asset pipeline must be the current completion track");
  }
}

const combatSectionsPresent =
  gameContentSource.length > 0 &&
  combatContentSource.includes("ARPG_ENEMY_COMBAT_PROFILES") &&
  combatContentSource.includes("ARPG_STATUS_EFFECTS") &&
  combatContentSource.includes("ARPG_ENEMY_SPRITE_FRAMES") &&
  combatContentSource.includes("ARPG_ITEM_ICON_FRAMES") &&
  combatContentSource.includes("ARPG_STATUS_ICON_FRAMES");
if (!combatSectionsPresent) {
  fail("combatContent", "MW6I-L/V combat registry sections are required");
} else {
  const enemySection = sourceSection(gameContentSource, "export const ARPG_ENEMIES", "export const ARPG_LORE_NODES");
  const itemSection = sourceSection(gameContentSource, "export const ARPG_ITEMS", "export const ARPG_STARTER_ITEM_IDS");
  const enemyIds = objectEntryIds(enemySection);
  const itemIds = objectEntryIds(itemSection);
  const profileEnemyIds = new Set(
    [...combatContentSource.matchAll(/enemyId:\s*"([^"]+)"/g)].map((match) => match[1]),
  );
  const requiredStatusIds = [
    "exposed",
    "staggered",
    "burn",
    "bleed",
    "chill",
    "poison",
    "guard",
    "haste",
    "ward-bloom",
    "rooted",
    "fear",
    "slow",
    "cracked-armor",
    "mana-drain",
    "cursed",
    "relic-fury",
  ];
  const damageTypes = new Set(["physical", "ember", "frost", "poison", "bleed", "curse", "holy", "void"]);
  const expectedEnemyFrames = new Set([
    "hollow-sentry",
    "ashling-scout",
    "rune-husk",
    "brass-warden",
    "ember-mote",
    "glass-gnawer",
  ]);

  if (enemyIds.size < 6) fail("ARPG_ENEMIES", "first-zone combat slice requires at least 6 enemies");
  for (const enemyId of expectedEnemyFrames) {
    if (!enemyIds.has(enemyId)) fail(enemyId, "enemy definition is required for combat-art slice");
    if (!profileEnemyIds.has(enemyId)) fail(enemyId, "enemy combat profile is required");
    if (!combatContentSource.includes(`"${enemyId}"`)) fail(enemyId, "enemy sprite frame reference is required");
  }
  for (const enemyId of profileEnemyIds) {
    if (!enemyIds.has(enemyId)) fail(enemyId, "combat profile references unknown enemy");
  }

  for (const statusId of requiredStatusIds) {
    if (!combatContentSource.includes(`id: "${statusId}"`)) fail(statusId, "status definition is required");
    if (!combatContentSource.includes(`"${statusId}"`)) fail(statusId, "status icon/reference is required");
  }

  for (const statusList of combatContentSource.matchAll(/appliesStatuses:\s*\[([^\]]*)\]/g)) {
    for (const statusId of quotedValues(statusList[1])) {
      if (!requiredStatusIds.includes(statusId)) fail(statusId, "appliesStatuses references unknown status");
    }
  }

  for (const typeList of combatContentSource.matchAll(/(?:weaknesses|resistances|defaultWeaknesses|defaultResistances):\s*\[([^\]]*)\]/g)) {
    for (const damageType of quotedValues(typeList[1])) {
      if (!damageTypes.has(damageType)) fail(damageType, "combat registry references unknown damage type");
    }
  }

  const itemFrameSection = sourceSection(
    combatContentSource,
    "export const ARPG_ITEM_ICON_FRAMES",
    "export const ARPG_STATUS_ICON_FRAMES",
  );
  for (const itemId of itemFrameSection.matchAll(/"([^"]+)":\s*\{/g)) {
    if (!itemIds.has(itemId[1])) fail(itemId[1], "item icon frame references unknown item");
  }
  for (const requiredItemId of ["health-vial", "focus-draught", "upgrade-shard", "relic-dust", "gate-key-fragment"]) {
    if (!itemFrameSection.includes(`"${requiredItemId}"`)) fail(requiredItemId, "starter combat item icon frame is required");
  }

  const spriteFrames = [...combatContentSource.matchAll(/spriteFrame:\s*(\d+)/g)].map((match) => Number(match[1]));
  if (spriteFrames.some((frame) => frame < 0 || frame > 5)) {
    fail("ARPG_ENEMY_COMBAT_PROFILES", "enemy spriteFrame must fit the 6-frame source sheet");
  }
  const statusIconFrames = [...combatContentSource.matchAll(/iconFrame:\s*(\d+)/g)].map((match) => Number(match[1]));
  if (statusIconFrames.some((frame) => frame < 0 || frame > 15)) {
    fail("ARPG_STATUS_EFFECTS", "status iconFrame must fit the 16-frame source sheet");
  }
}

if (errors.length > 0) {
  console.error("ARPG production content validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `ARPG production content OK (${cities.length} cities, ${subCityCount} sub-cities, ${races.length} races, ${classes.length} classes).`,
);
