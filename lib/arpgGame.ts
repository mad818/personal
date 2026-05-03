import {
  ARPG_CHARACTER_DEFAULTS,
  ARPG_CHARACTER_SKILL_NODES,
  ARPG_CLASS_TREES,
  ARPG_LINEAGES,
  ARPG_PALETTES,
  ARPG_PORTRAITS,
  type ArpgCharacterSkillNode,
  type ArpgClassTreeDefinition,
  type ArpgLineageDefinition,
  type ArpgPaletteDefinition,
  type ArpgPortraitDefinition,
  type ArpgSubclassDefinition,
} from "@/lib/arpgCharacterContent";
import {
  ARPG_DAMAGE_TYPES,
  ARPG_ELITE_MODIFIERS,
  ARPG_ENEMY_COMBAT_PROFILES,
  ARPG_ENEMY_FAMILIES,
  ARPG_ENEMY_TRAITS,
  ARPG_STATUS_EFFECTS,
  type ArpgDamageType,
  type ArpgEnemyIntent,
} from "@/lib/arpgCombatContent";
import {
  ARPG_ARSENAL_CONTENT,
  ARPG_ARSENAL_SUMMARY,
  getArpgArsenalAffixCount,
  getArpgArsenalComparison,
  getArpgArsenalUpgradeCap,
} from "@/lib/arpgArsenalContent";
import {
  ARPG_ARMORY_ECONOMY_CONTENT,
  ARPG_ARMORY_ECONOMY_SUMMARY,
  ARPG_CITY_ARMOR_SETS,
  ARPG_CITY_GEAR_REWARDS,
  getArpgCraftingRecipe,
  getArpgSalvageRule,
} from "@/lib/arpgArmoryEconomyContent";
import {
  ARPG_CITY_BOSSES,
  ARPG_ENEMY_TAXONOMY_SUMMARY,
  ARPG_REGIONAL_ENEMY_ARCHETYPES,
  ARPG_SUBCITY_CHAMPIONS,
} from "@/lib/arpgEnemyTaxonomyContent";
import {
  ARPG_CLASS_PATHS,
  ARPG_ENEMIES,
  ARPG_EQUIPMENT_SLOTS,
  ARPG_FIRST_ZONE,
  ARPG_ITEMS,
  ARPG_ITEM_QUALITIES,
  ARPG_LOOT_PEDESTAL_ITEM_ID,
  ARPG_LOOT_NODES,
  ARPG_LORE_NODES,
  ARPG_ORIGINS,
  ARPG_QUESTS,
  ARPG_SKILLS,
  ARPG_STARTER_EQUIPMENT,
  ARPG_STARTER_ITEM_IDS,
  ARPG_WORLD_BOUNDS,
  ARPG_ZONE_ID,
} from "@/lib/arpgGameContent";
import {
  ARPG_PROLOGUE_CONTENT,
  ARPG_PROLOGUE_FLOW_BY_FLAG,
} from "@/lib/arpgPrologueContent";
import { ARPG_PRODUCTION_CONTENT } from "@/lib/arpgProductionContent";
import {
  ARPG_CITY_STORYLINES,
  ARPG_COMPANION_ARCS,
  ARPG_MAJOR_NPCS,
  ARPG_ROUTE_EVENTS,
  ARPG_SUBCITY_SIDE_ARCS,
  ARPG_WORLD_LOOP_SUMMARY,
  arpgRouteId,
  getArpgRouteEvent,
  getArpgTravelEvent,
} from "@/lib/arpgWorldLoopContent";
import {
  ARPG_BOSS_REMATCHES,
  ARPG_CITY_CHALLENGE_DUNGEONS,
  ARPG_ENDGAME_CONTENT,
  ARPG_ENDGAME_SUMMARY,
  ARPG_RELIC_TRIALS,
  ARPG_TIMED_TREASURE_ROOMS,
  ARPG_TREASURE_MAPS,
  getArpgArenaChallenge,
  getArpgBossRematch,
  getArpgChallengeDungeon,
  getArpgEndgameRewardTrack,
  getArpgRelicTrial,
  getArpgTreasureMap,
} from "@/lib/arpgEndgameContent";

export type ArpgRoomMode = "arpg" | "command-room";
export type ArpgEquipmentSlot =
  | "weapon"
  | "offhand"
  | "helm"
  | "armor"
  | "gloves"
  | "boots"
  | "relic"
  | "sigil"
  | "charm"
  | "ring-left"
  | "ring-right"
  | "amulet";
export type ArpgItemQuality =
  | "common"
  | "uncommon"
  | "rare"
  | "epic"
  | "relic"
  | "ancient"
  | "mythic";
export type ArpgItemRarity = ArpgItemQuality;
export type ArpgItemType = "equipment" | "consumable" | "material" | "quest";
export type ArpgSkillKind = "active" | "passive";

export interface ArpgStats {
  might: number;
  ward: number;
  focus: number;
  speed: number;
  crit: number;
  cooldown: number;
  resonance: number;
}

export interface ArpgOriginDefinition {
  id: string;
  name: string;
  summary: string;
  baseStats: ArpgStats;
}

export interface ArpgClassDefinition {
  id: string;
  name: string;
  summary: string;
  accent: string;
  starterSkillId: string;
}

export interface ArpgSkillDefinition {
  id: string;
  pathId: string;
  name: string;
  kind: ArpgSkillKind;
  unlockLevel: number;
  summary: string;
  statBonus: Partial<ArpgStats>;
  cooldownMs: number;
  accent: string;
}

export interface ArpgItemDefinition {
  id: string;
  name: string;
  type: ArpgItemType;
  slot?: ArpgEquipmentSlot;
  quality: ArpgItemQuality;
  rarity: ArpgItemRarity;
  maxStack?: number;
  summary: string;
  lore: string;
  stats: Partial<ArpgStats>;
  effect?: {
    hp?: number;
    mana?: number;
  };
  accent: string;
}

export interface ArpgEnemyDefinition {
  id: string;
  name: string;
  summary: string;
  familyId?: string;
  spriteFrameId?: string;
  maxHp: number;
  xp: number;
  gold: number;
  level: number;
  position: {
    x: number;
    z: number;
  };
  drops: Array<{
    itemId: string;
    chance: number;
    quantity: number;
  }>;
  requiresStoryFlags?: string[];
  requiresUpgradedItem?: boolean;
}

export interface ArpgLoreNode {
  id: string;
  title: string;
  summary: string;
  position: {
    x: number;
    z: number;
  };
  storyFlag: string;
}

export interface ArpgLootNodeDefinition {
  id: string;
  title: string;
  itemId: string;
  quantity: number;
  summary: string;
  position: {
    x: number;
    z: number;
  };
}

export interface ArpgQuestDefinition {
  id: string;
  title: string;
  summary: string;
  steps: string[];
  requiredFlags: string[];
  rewardItemIds: string[];
}

export interface ArpgZoneDefinition {
  id: string;
  name: string;
  summary: string;
  spawn: {
    x: number;
    z: number;
  };
  rooms: Array<{
    id: string;
    label: string;
    center: {
      x: number;
      z: number;
    };
    radius: number;
  }>;
  obstacles: Array<{
    id: string;
    label: string;
    x: number;
    z: number;
    width: number;
    depth: number;
  }>;
}

export interface ArpgScenePropSlot {
  id: string;
  assetId: string;
  role: "architecture" | "light" | "cover" | "set-dressing" | "portal";
  label: string;
  position: {
    x: number;
    z: number;
  };
  rotationY?: number;
  scale?: number;
}

export interface ArpgMoveVector {
  x: number;
  z: number;
  label?: string;
}

export type ArpgInteractionKind = "lore" | "loot" | "enemy" | "travel";

export interface ArpgInteractionPrompt {
  id: string;
  kind: ArpgInteractionKind;
  label: string;
  actionLabel: string;
  hint: string;
  distance: number;
  inRange: boolean;
  complete: boolean;
  accent: string;
}

export interface ArpgEnemyState {
  id: string;
  hp: number;
  defeated: boolean;
  lastStruckAt?: number;
  intent?: ArpgEnemyIntent;
  nextIntentAt?: number;
  phase?: number;
  statuses?: ArpgAppliedStatus[];
  lastDamage?: number;
}

export interface ArpgAppliedStatus {
  id: string;
  sourceId: string;
  appliedAt: number;
  expiresAt: number;
  stacks: number;
}

export interface ArpgCombatEvent {
  id: string;
  kind: "damage" | "status" | "dodge" | "defeat" | "codex" | "cooldown";
  label: string;
  enemyId?: string;
  skillId?: string;
  statusId?: string;
  damageType?: ArpgDamageType;
  amount?: number;
  createdAt: number;
}

export interface ArpgCombatState {
  playerStatuses: ArpgAppliedStatus[];
  cooldowns: Record<string, number>;
  targetEnemyId: string | null;
  latestEvents: ArpgCombatEvent[];
  discoveredEnemyCodexIds: string[];
  reducedMotionVfx: boolean;
  lastDodgedAt?: number;
}

export interface ArpgInventoryItem {
  instanceId: string;
  itemId: string;
  quantity: number;
  quality: ArpgItemQuality;
  level: number;
  upgradeRank: number;
  affixes: Array<keyof ArpgStats>;
  source: string;
  bound: boolean;
}

export interface ArpgInventoryItemView extends ArpgItemDefinition {
  instanceId: string;
  quantity: number;
  quality: ArpgItemQuality;
  rarity: ArpgItemRarity;
  level: number;
  upgradeRank: number;
  affixes: Array<keyof ArpgStats>;
  source: string;
  bound: boolean;
  equipped: boolean;
  displayName: string;
}

export interface ArpgWorldState {
  zoneId: string;
  discoveredMarkers: string[];
  openedChests: string[];
  defeatedEnemyIds: string[];
  npcDialogueFlags: string[];
  checkpointId: string;
}

export interface ArpgLegacySaveState {
  version: 2;
  player: {
    x: number;
    z: number;
    hp: number;
    maxHp: number;
    mana: number;
    maxMana: number;
    xp: number;
    level: number;
    originId: string;
    classPathId: string;
    gold: number;
    unlockedSkills: string[];
    equippedSkillIds: string[];
    activeQuestId: string;
    respawnMarker: string;
  };
  inventory: ArpgInventoryItem[];
  equipped: Record<ArpgEquipmentSlot, string | null>;
  collectedItemIds: string[];
  storyFlags: string[];
  enemies: Record<string, ArpgEnemyState>;
  world: ArpgWorldState;
  selectedItemId: string | null;
  selectedItemInstanceId: string | null;
  lastEvent: string;
  lastSavedAt: number;
}

export type ArpgProductionSaveVersion = 3;

export interface ArpgProductionCharacterIdentity {
  characterName: string;
  raceId: string;
  originId: string;
  classPathId: string;
  subclassId: string;
  portraitId: string;
  spritePaletteId: string;
  cosmeticAccent: string;
  respecCount: number;
}

export interface ArpgProductionQuestLogEntry {
  questId: string;
  status: "available" | "active" | "complete" | "failed";
  stepIndex: number;
  cityId?: string;
  subCityId?: string;
}

export interface ArpgProductionCompanionState {
  companionId: string;
  recruited: boolean;
  loyalty: number;
  loyaltyQuestStatus: "locked" | "active" | "complete";
  perkUnlocked: boolean;
}

export interface ArpgProductionCodexState {
  discoveredEnemyFamilies: string[];
  discoveredEnemyIds: string[];
  revealedWeaknessEnemyIds: string[];
  loreEntryIds: string[];
}

export interface ArpgProductionCraftingState {
  unlockedRecipeIds: string[];
  knownMaterialIds: string[];
  cityDiscounts: Record<string, number>;
}

export interface ArpgJourneyState {
  selectedCityId: string;
  selectedSubCityId: string | null;
  activeRouteId: string | null;
  activeTravelEventId: string | null;
  resolvedTravelEventIds: string[];
  unlockedRouteIds: string[];
}

export interface ArpgEndgameState {
  unlocked: boolean;
  difficultyTierId: string;
  eliteAffixRotationId: string;
  activeDungeonId: string | null;
  activeTrialId: string | null;
  activeBossRematchId: string | null;
  activeArenaChallengeId: string | null;
  completedDungeonIds: string[];
  completedTrialIds: string[];
  completedBossRematchIds: string[];
  discoveredTreasureMapIds: string[];
  completedTreasureMapIds: string[];
  completedArenaChallengeIds: string[];
  collectionGoalIds: string[];
  cosmeticRewardIds: string[];
  lastCompletedAt: number | null;
}

export interface ArpgSaveState extends Omit<ArpgLegacySaveState, "version"> {
  version: ArpgProductionSaveVersion;
  character: ArpgProductionCharacterIdentity;
  activeZoneId: string;
  discoveredCityIds: string[];
  discoveredSubCityIds: string[];
  reputations: Record<string, number>;
  questLog: ArpgProductionQuestLogEntry[];
  companions: Record<string, ArpgProductionCompanionState>;
  mapFlags: string[];
  codex: ArpgProductionCodexState;
  crafting: ArpgProductionCraftingState;
  journey: ArpgJourneyState;
  endgame: ArpgEndgameState;
  combat: ArpgCombatState;
}

export type ArpgProductionSaveState = ArpgSaveState;

export interface ArpgCharacterSelection {
  characterName?: string;
  raceId?: string;
  originId?: string;
  classPathId?: string;
  subclassId?: string;
  portraitId?: string;
  paletteId?: string;
}

const DEFAULT_RACE_ID = ARPG_CHARACTER_DEFAULTS.raceId;
const DEFAULT_ORIGIN_ID = ARPG_CHARACTER_DEFAULTS.originId;
const DEFAULT_CLASS_PATH_ID = ARPG_CHARACTER_DEFAULTS.classPathId;
const DEFAULT_SUBCLASS_ID = ARPG_CHARACTER_DEFAULTS.subclassId;
const DEFAULT_PALETTE_ID = ARPG_CHARACTER_DEFAULTS.paletteId;
const DEFAULT_PORTRAIT_ID = ARPG_CHARACTER_DEFAULTS.portraitId;
const ATTACK_REACH = 2.35;
const INTERACTION_REACH = 1.05;
const DISCOVERY_REACH = 1.9;
const MAX_UPGRADE_RANK = 5;
const COMBAT_EVENT_LIMIT = 6;
const DODGE_COOLDOWN_MS = 900;
const ARPG_STAT_KEYS: Array<keyof ArpgStats> = [
  "might",
  "ward",
  "focus",
  "speed",
  "crit",
  "cooldown",
  "resonance",
];

function now() {
  return Date.now();
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function stableInstanceId(itemId: string, source: string) {
  return `${source}:${itemId}`.replace(/[^a-zA-Z0-9:-]/g, "-");
}

function isKnownItem(itemId: unknown): itemId is string {
  return typeof itemId === "string" && Boolean(ARPG_ITEMS[itemId]);
}

function uniqueStrings(values: unknown[]): string[] {
  return Array.from(
    new Set(values.filter((value): value is string => typeof value === "string" && value.length > 0)),
  );
}

function addStats(target: ArpgStats, bonus: Partial<ArpgStats> | undefined) {
  if (!bonus) return;
  for (const key of ARPG_STAT_KEYS) {
    target[key] += bonus[key] ?? 0;
  }
}

function knownLineageId(value: unknown): string {
  return typeof value === "string" && ARPG_LINEAGES[value] ? value : DEFAULT_RACE_ID;
}

function knownClassPathId(value: unknown): string {
  return typeof value === "string" && ARPG_CLASS_TREES[value] ? value : DEFAULT_CLASS_PATH_ID;
}

function getClassTree(classPathId: string): ArpgClassTreeDefinition {
  return ARPG_CLASS_TREES[classPathId] ?? ARPG_CLASS_TREES[DEFAULT_CLASS_PATH_ID];
}

function getSubclass(classPathId: string, subclassId: unknown): ArpgSubclassDefinition {
  const classTree = getClassTree(classPathId);
  return (
    classTree.subclasses.find((subclass) => subclass.id === subclassId) ??
    classTree.subclasses.find((subclass) => subclass.id === classTree.starterBuild.subclassId) ??
    classTree.subclasses[0]
  );
}

function getPalette(lineageId: string, paletteId: unknown): ArpgPaletteDefinition {
  const lineage = ARPG_LINEAGES[lineageId] ?? ARPG_LINEAGES[DEFAULT_RACE_ID];
  const preferred =
    typeof paletteId === "string" && ARPG_PALETTES[paletteId]
      ? ARPG_PALETTES[paletteId]
      : null;
  if (preferred && (preferred.lineageId === lineage.id || lineage.paletteIds.includes(preferred.id))) {
    return preferred;
  }
  const fallbackPaletteId = lineage.paletteIds.find((id) => ARPG_PALETTES[id]) ?? DEFAULT_PALETTE_ID;
  return ARPG_PALETTES[fallbackPaletteId] ?? ARPG_PALETTES[DEFAULT_PALETTE_ID];
}

function getPortrait(lineageId: string, portraitId: unknown): ArpgPortraitDefinition {
  const preferred =
    typeof portraitId === "string" && ARPG_PORTRAITS[portraitId]
      ? ARPG_PORTRAITS[portraitId]
      : null;
  if (preferred && preferred.lineageId === lineageId) return preferred;
  return (
    Object.values(ARPG_PORTRAITS).find((portrait) => portrait.lineageId === lineageId) ??
    ARPG_PORTRAITS[DEFAULT_PORTRAIT_ID]
  );
}

function getSkillNode(skillId: string): ArpgCharacterSkillNode | null {
  return ARPG_CHARACTER_SKILL_NODES[skillId] ?? null;
}

function isKnownSkill(skillId: string) {
  return Boolean(getSkillNode(skillId) || ARPG_SKILLS[skillId]);
}

function getSkillDefinition(skillId: string): ArpgSkillDefinition | null {
  const node = getSkillNode(skillId);
  if (node) {
    return {
      id: node.id,
      pathId: node.pathId,
      name: node.name,
      kind: node.kind,
      unlockLevel: node.unlockLevel,
      summary: node.summary,
      statBonus: node.statBonus,
      cooldownMs: node.cooldownMs,
      accent: node.accent,
    };
  }
  return ARPG_SKILLS[skillId] ?? null;
}

function getSkillPathId(skillId: string): string | null {
  return getSkillNode(skillId)?.pathId ?? ARPG_SKILLS[skillId]?.pathId ?? null;
}

function getStarterSkillIds(classPathId: string) {
  const classTree = getClassTree(classPathId);
  return [
    classTree.starterBuild.activeSkillId,
    classTree.starterBuild.passiveSkillId,
    ...classTree.starterBuild.hotbarSkillIds,
  ].filter(Boolean);
}

function normalizeCharacterIdentity(
  rawCharacter: Partial<ArpgProductionCharacterIdentity> | undefined,
  player: Partial<ArpgSaveState["player"]> | undefined,
): ArpgProductionCharacterIdentity {
  const raceId = knownLineageId(rawCharacter?.raceId);
  const classPathId = knownClassPathId(rawCharacter?.classPathId ?? player?.classPathId);
  const subclass = getSubclass(classPathId, rawCharacter?.subclassId);
  const palette = getPalette(raceId, rawCharacter?.spritePaletteId);
  const portrait = getPortrait(raceId, rawCharacter?.portraitId);

  return {
    characterName:
      typeof rawCharacter?.characterName === "string" && rawCharacter.characterName.trim()
        ? rawCharacter.characterName.trim().slice(0, 40)
        : ARPG_CHARACTER_DEFAULTS.characterName,
    raceId,
    originId:
      typeof rawCharacter?.originId === "string" && ARPG_ORIGINS[rawCharacter.originId]
        ? rawCharacter.originId
        : DEFAULT_ORIGIN_ID,
    classPathId,
    subclassId: subclass.id,
    portraitId: portrait.id,
    spritePaletteId: palette.id,
    cosmeticAccent:
      typeof rawCharacter?.cosmeticAccent === "string" && rawCharacter.cosmeticAccent.trim()
        ? rawCharacter.cosmeticAccent
        : palette.accent,
    respecCount: Math.max(0, Math.floor(rawCharacter?.respecCount ?? 0)),
  };
}

function createDefaultQuestLog(): ArpgProductionQuestLogEntry[] {
  return [
    {
      questId: "awaken-the-reliquary",
      status: "active",
      stepIndex: 0,
      cityId: "first-reliquary",
    },
  ];
}

function createDefaultCompanions(): Record<string, ArpgProductionCompanionState> {
  return {
    "oracle-guide": {
      companionId: "oracle-guide",
      recruited: true,
      loyalty: 1,
      loyaltyQuestStatus: "locked",
      perkUnlocked: true,
    },
  };
}

function createDefaultCodex(storyFlags: string[]): ArpgProductionCodexState {
  return {
    discoveredEnemyFamilies: ["hollow-sentries"],
    discoveredEnemyIds: [],
    revealedWeaknessEnemyIds: [],
    loreEntryIds: storyFlags.filter((flag) => flag.startsWith("lore:")),
  };
}

function createDefaultCrafting(): ArpgProductionCraftingState {
  return {
    unlockedRecipeIds: ["first-temper"],
    knownMaterialIds: ["upgrade-shard", "relic-dust"],
    cityDiscounts: {},
  };
}

function routeIdsUnlockedByFlags(storyFlags: string[]) {
  const flagSet = new Set(storyFlags);
  return ARPG_ROUTE_EVENTS.filter((event) => flagSet.has(event.unlockFlag)).map(
    (event) => event.routeId,
  );
}

function createDefaultJourney(storyFlags: string[] = []): ArpgJourneyState {
  return {
    selectedCityId: "first-reliquary",
    selectedSubCityId: null,
    activeRouteId: null,
    activeTravelEventId: null,
    resolvedTravelEventIds: [],
    unlockedRouteIds: routeIdsUnlockedByFlags(storyFlags),
  };
}

function normalizeJourney(rawJourney: unknown, storyFlags: string[]): ArpgJourneyState {
  const raw =
    rawJourney && typeof rawJourney === "object"
      ? (rawJourney as Partial<ArpgJourneyState>)
      : {};
  const cityIds = new Set(["first-reliquary", ...ARPG_PRODUCTION_CONTENT.world.cities.map((city) => city.id)]);
  const subCityIds = new Set(
    ARPG_PRODUCTION_CONTENT.world.cities.flatMap((city) => city.subCities.map((subCity) => subCity.id)),
  );
  const routeIds = new Set(ARPG_ROUTE_EVENTS.map((event) => event.routeId));
  const eventIds = new Set(ARPG_ROUTE_EVENTS.map((event) => event.id));
  const selectedCityId =
    typeof raw.selectedCityId === "string" && cityIds.has(raw.selectedCityId)
      ? raw.selectedCityId
      : "first-reliquary";
  const selectedSubCityId =
    typeof raw.selectedSubCityId === "string" && subCityIds.has(raw.selectedSubCityId)
      ? raw.selectedSubCityId
      : null;

  return {
    selectedCityId,
    selectedSubCityId,
    activeRouteId:
      typeof raw.activeRouteId === "string" && routeIds.has(raw.activeRouteId)
        ? raw.activeRouteId
        : null,
    activeTravelEventId:
      typeof raw.activeTravelEventId === "string" && eventIds.has(raw.activeTravelEventId)
        ? raw.activeTravelEventId
        : null,
    resolvedTravelEventIds: uniqueStrings(raw.resolvedTravelEventIds ?? []).filter((eventId) =>
      eventIds.has(eventId),
    ),
    unlockedRouteIds: uniqueStrings([
      ...routeIdsUnlockedByFlags(storyFlags),
      ...(Array.isArray(raw.unlockedRouteIds) ? raw.unlockedRouteIds : []),
    ]).filter((routeId) => routeIds.has(routeId)),
  };
}

function hasEndgameAccessFromFlags(storyFlags: string[]) {
  return [...ARPG_ENDGAME_CONTENT.postgameUnlockFlags, ...ARPG_ENDGAME_CONTENT.previewUnlockFlags].some((flag) =>
    storyFlags.includes(flag),
  );
}

function createDefaultEndgame(storyFlags: string[] = []): ArpgEndgameState {
  return {
    unlocked: hasEndgameAccessFromFlags(storyFlags),
    difficultyTierId: ARPG_ENDGAME_CONTENT.defaultDifficultyTierId,
    eliteAffixRotationId: ARPG_ENDGAME_CONTENT.eliteAffixRotations[0]?.id ?? "iron-vow",
    activeDungeonId: null,
    activeTrialId: null,
    activeBossRematchId: null,
    activeArenaChallengeId: null,
    completedDungeonIds: [],
    completedTrialIds: [],
    completedBossRematchIds: [],
    discoveredTreasureMapIds: [],
    completedTreasureMapIds: [],
    completedArenaChallengeIds: [],
    collectionGoalIds: [],
    cosmeticRewardIds: [],
    lastCompletedAt: null,
  };
}

function normalizeEndgame(rawEndgame: unknown, storyFlags: string[]): ArpgEndgameState {
  const raw =
    rawEndgame && typeof rawEndgame === "object"
      ? (rawEndgame as Partial<ArpgEndgameState>)
      : {};
  const fallback = createDefaultEndgame(storyFlags);
  const difficultyIds = new Set(ARPG_ENDGAME_CONTENT.difficultyTiers.map((tier) => tier.id));
  const affixIds = new Set(ARPG_ENDGAME_CONTENT.eliteAffixRotations.map((rotation) => rotation.id));
  const dungeonIds = new Set(ARPG_CITY_CHALLENGE_DUNGEONS.map((dungeon) => dungeon.id));
  const trialIds = new Set(ARPG_RELIC_TRIALS.map((trial) => trial.id));
  const bossIds = new Set(ARPG_BOSS_REMATCHES.map((boss) => boss.id));
  const mapIds = new Set(ARPG_TREASURE_MAPS.map((map) => map.id));
  const arenaIds = new Set(ARPG_ENDGAME_CONTENT.arenaChallenges.map((challenge) => challenge.id));
  const goalIds = new Set(ARPG_ENDGAME_CONTENT.collectionGoals.map((goal) => goal.id));
  const cosmeticIds = new Set(ARPG_ENDGAME_CONTENT.cosmeticRewards.map((reward) => reward.id));

  return {
    unlocked: Boolean(raw.unlocked) || fallback.unlocked,
    difficultyTierId:
      typeof raw.difficultyTierId === "string" && difficultyIds.has(raw.difficultyTierId)
        ? raw.difficultyTierId
        : fallback.difficultyTierId,
    eliteAffixRotationId:
      typeof raw.eliteAffixRotationId === "string" && affixIds.has(raw.eliteAffixRotationId)
        ? raw.eliteAffixRotationId
        : fallback.eliteAffixRotationId,
    activeDungeonId:
      typeof raw.activeDungeonId === "string" && dungeonIds.has(raw.activeDungeonId)
        ? raw.activeDungeonId
        : null,
    activeTrialId:
      typeof raw.activeTrialId === "string" && trialIds.has(raw.activeTrialId)
        ? raw.activeTrialId
        : null,
    activeBossRematchId:
      typeof raw.activeBossRematchId === "string" && bossIds.has(raw.activeBossRematchId)
        ? raw.activeBossRematchId
        : null,
    activeArenaChallengeId:
      typeof raw.activeArenaChallengeId === "string" && arenaIds.has(raw.activeArenaChallengeId)
        ? raw.activeArenaChallengeId
        : null,
    completedDungeonIds: uniqueStrings(raw.completedDungeonIds ?? []).filter((id) => dungeonIds.has(id)),
    completedTrialIds: uniqueStrings(raw.completedTrialIds ?? []).filter((id) => trialIds.has(id)),
    completedBossRematchIds: uniqueStrings(raw.completedBossRematchIds ?? []).filter((id) => bossIds.has(id)),
    discoveredTreasureMapIds: uniqueStrings(raw.discoveredTreasureMapIds ?? []).filter((id) => mapIds.has(id)),
    completedTreasureMapIds: uniqueStrings(raw.completedTreasureMapIds ?? []).filter((id) => mapIds.has(id)),
    completedArenaChallengeIds: uniqueStrings(raw.completedArenaChallengeIds ?? []).filter((id) => arenaIds.has(id)),
    collectionGoalIds: uniqueStrings(raw.collectionGoalIds ?? []).filter((id) => goalIds.has(id)),
    cosmeticRewardIds: uniqueStrings(raw.cosmeticRewardIds ?? []).filter((id) => cosmeticIds.has(id)),
    lastCompletedAt:
      typeof raw.lastCompletedAt === "number" && raw.lastCompletedAt > 0
        ? raw.lastCompletedAt
        : null,
  };
}

function createInventoryEntry(
  itemId: string,
  source: string,
  overrides: Partial<ArpgInventoryItem> = {},
): ArpgInventoryItem {
  const item = ARPG_ITEMS[itemId];
  const quality = overrides.quality ?? item?.quality ?? "common";
  const upgradeCap = getArpgArsenalUpgradeCap(quality);
  return {
    instanceId: overrides.instanceId ?? stableInstanceId(itemId, source),
    itemId,
    quantity: Math.max(1, Math.floor(overrides.quantity ?? 1)),
    quality,
    level: Math.max(1, Math.floor(overrides.level ?? 1)),
    upgradeRank: clamp(Math.floor(overrides.upgradeRank ?? 0), 0, upgradeCap),
    affixes: Array.isArray(overrides.affixes) ? overrides.affixes : [],
    source,
    bound: Boolean(overrides.bound),
  };
}

function isStackable(item: ArpgItemDefinition | undefined) {
  return Boolean(item?.maxStack && item.maxStack > 1);
}

function createStarterInventory() {
  return ARPG_STARTER_ITEM_IDS.map((itemId) =>
    createInventoryEntry(itemId, "starter", {
      quantity:
        itemId === "health-vial"
          ? 2
          : itemId === "focus-draught"
            ? 1
            : itemId === "upgrade-shard"
              ? 2
              : 1,
      bound: ARPG_ITEMS[itemId]?.type === "equipment",
    }),
  );
}

function normalizeInventory(rawInventory: unknown): ArpgInventoryItem[] {
  const starter = createStarterInventory();
  const entries = new Map<string, ArpgInventoryItem>();

  for (const entry of starter) {
    entries.set(entry.instanceId, entry);
  }

  if (Array.isArray(rawInventory)) {
    rawInventory.forEach((raw, index) => {
      if (typeof raw === "string") {
        if (!ARPG_ITEMS[raw]) return;
        const source = index < ARPG_STARTER_ITEM_IDS.length ? "starter" : "legacy";
        const item = ARPG_ITEMS[raw];
        const existingStack = Array.from(entries.values()).find(
          (candidate) => candidate.itemId === raw && isStackable(item),
        );
        if (existingStack) {
          entries.set(existingStack.instanceId, {
            ...existingStack,
            quantity: Math.min(item.maxStack ?? 99, existingStack.quantity + 1),
          });
          return;
        }
        const entry = createInventoryEntry(raw, source, {
          instanceId: stableInstanceId(raw, `${source}-${index}`),
        });
        entries.set(entry.instanceId, entry);
        return;
      }

      if (!raw || typeof raw !== "object") return;
      const candidate = raw as Partial<ArpgInventoryItem>;
      if (!isKnownItem(candidate.itemId)) return;
      const item = ARPG_ITEMS[candidate.itemId];
      const normalized = createInventoryEntry(candidate.itemId, candidate.source ?? "save", {
        ...candidate,
        quantity: isStackable(item)
          ? clamp(Math.floor(candidate.quantity ?? 1), 1, item.maxStack ?? 99)
          : 1,
        quality: candidate.quality && ARPG_ITEM_QUALITIES[candidate.quality]
          ? candidate.quality
          : item.quality,
      });
      entries.set(normalized.instanceId, normalized);
    });
  }

  return Array.from(entries.values());
}

function findInventoryEntry(
  inventory: ArpgInventoryItem[],
  itemOrInstanceId: string | null | undefined,
) {
  if (!itemOrInstanceId) return null;
  return (
    inventory.find((entry) => entry.instanceId === itemOrInstanceId) ??
    inventory.find((entry) => entry.itemId === itemOrInstanceId) ??
    null
  );
}

function normalizeEquipped(
  equipped: Partial<Record<ArpgEquipmentSlot, string | null>> | undefined,
  inventory: ArpgInventoryItem[],
): Record<ArpgEquipmentSlot, string | null> {
  return ARPG_EQUIPMENT_SLOTS.reduce<Record<ArpgEquipmentSlot, string | null>>(
    (acc, slot) => {
      const rawCandidate = equipped?.[slot] ?? ARPG_STARTER_EQUIPMENT[slot] ?? null;
      const candidate = findInventoryEntry(inventory, rawCandidate);
      const item = candidate ? ARPG_ITEMS[candidate.itemId] : null;
      acc[slot] =
        candidate && item?.type === "equipment" && item.slot === slot
          ? candidate.instanceId
          : null;
      return acc;
    },
    {
      weapon: null,
      offhand: null,
      helm: null,
      armor: null,
      gloves: null,
      boots: null,
      relic: null,
      sigil: null,
      charm: null,
      "ring-left": null,
      "ring-right": null,
      amulet: null,
    },
  );
}

function createEnemyState(): Record<string, ArpgEnemyState> {
  return Object.fromEntries(
    Object.values(ARPG_ENEMIES).map((enemy) => [
      enemy.id,
      {
        id: enemy.id,
        hp: enemy.maxHp,
        defeated: false,
        intent: "idle",
        phase: 1,
        statuses: [],
      },
    ]),
  );
}

function normalizeEnemies(rawEnemies: unknown): Record<string, ArpgEnemyState> {
  const defaults = createEnemyState();
  if (!rawEnemies || typeof rawEnemies !== "object") return defaults;
  const saved = rawEnemies as Record<string, Partial<ArpgEnemyState>>;
  for (const enemy of Object.values(ARPG_ENEMIES)) {
    const previous = saved[enemy.id];
    if (!previous) continue;
    defaults[enemy.id] = {
      id: enemy.id,
      hp: clamp(
        Number.isFinite(previous.hp) ? Number(previous.hp) : enemy.maxHp,
        0,
        enemy.maxHp,
      ),
      defeated: Boolean(previous.defeated),
      lastStruckAt:
        typeof previous.lastStruckAt === "number" ? previous.lastStruckAt : undefined,
      intent: previous.defeated ? "defeated" : previous.intent ?? "idle",
      nextIntentAt:
        typeof previous.nextIntentAt === "number" ? previous.nextIntentAt : undefined,
      phase: Number.isFinite(previous.phase) ? Number(previous.phase) : 1,
      statuses: normalizeStatuses(previous.statuses),
      lastDamage: Number.isFinite(previous.lastDamage) ? Number(previous.lastDamage) : undefined,
    };
  }
  return defaults;
}

function normalizeWorld(rawWorld: unknown, storyFlags: string[]): ArpgWorldState {
  const raw = rawWorld && typeof rawWorld === "object" ? (rawWorld as Partial<ArpgWorldState>) : {};
  return {
    zoneId: typeof raw.zoneId === "string" ? raw.zoneId : ARPG_ZONE_ID,
    discoveredMarkers: uniqueStrings(raw.discoveredMarkers ?? []),
    openedChests: uniqueStrings([
      ...(raw.openedChests ?? []),
      ...storyFlags
        .filter((flag) => flag.startsWith("opened:"))
        .map((flag) => flag.replace("opened:", "")),
    ]),
    defeatedEnemyIds: uniqueStrings([
      ...(raw.defeatedEnemyIds ?? []),
      ...storyFlags
        .filter((flag) => flag.startsWith("defeated:"))
        .map((flag) => flag.replace("defeated:", "")),
    ]),
    npcDialogueFlags: uniqueStrings(raw.npcDialogueFlags ?? []),
    checkpointId: typeof raw.checkpointId === "string" ? raw.checkpointId : "gate-room",
  };
}

function hasAnyUpgradedEquipment(save: ArpgSaveState) {
  return Object.values(save.equipped).some((instanceId) => {
    const entry = findInventoryEntry(save.inventory, instanceId);
    return Boolean(entry && entry.upgradeRank > 0);
  });
}

function hasItem(save: ArpgSaveState, itemId: string) {
  return save.inventory.some((entry) => entry.itemId === itemId && entry.quantity > 0);
}

function hasNorthGateAccess(save: ArpgSaveState) {
  return Boolean(save.enemies["brass-warden"]?.defeated && hasItem(save, "gate-key-fragment"));
}

function hasEndgameAccess(save: ArpgSaveState) {
  return Boolean(save.endgame.unlocked || hasEndgameAccessFromFlags(save.storyFlags) || hasNorthGateAccess(save));
}

function nearestLiveEnemyId(save: ArpgSaveState) {
  return Object.values(ARPG_ENEMIES)
    .filter((enemy) => !save.enemies[enemy.id]?.defeated)
    .map((enemy) => ({
      enemyId: enemy.id,
      distance: Math.hypot(save.player.x - enemy.position.x, save.player.z - enemy.position.z),
    }))
    .sort((a, b) => a.distance - b.distance)[0]?.enemyId ?? null;
}

function addStoryFlags(save: ArpgSaveState, flags: string[]) {
  return Array.from(new Set([...save.storyFlags, ...flags]));
}

function combatEvent(
  kind: ArpgCombatEvent["kind"],
  label: string,
  patch: Partial<Omit<ArpgCombatEvent, "id" | "kind" | "label" | "createdAt">> = {},
): ArpgCombatEvent {
  const createdAt = now();
  return {
    id: `${kind}:${createdAt}:${Math.random().toString(36).slice(2, 7)}`,
    kind,
    label,
    createdAt,
    ...patch,
  };
}

function normalizeStatuses(rawStatuses: unknown): ArpgAppliedStatus[] {
  if (!Array.isArray(rawStatuses)) return [];
  const timestamp = now();
  return rawStatuses
    .map((status): ArpgAppliedStatus | null => {
      if (!status || typeof status !== "object") return null;
      const raw = status as Partial<ArpgAppliedStatus>;
      if (typeof raw.id !== "string" || !ARPG_STATUS_EFFECTS[raw.id]) return null;
      const expiresAt = Number.isFinite(raw.expiresAt) ? Number(raw.expiresAt) : timestamp;
      if (expiresAt <= timestamp) return null;
      return {
        id: raw.id,
        sourceId: typeof raw.sourceId === "string" ? raw.sourceId : "unknown",
        appliedAt: Number.isFinite(raw.appliedAt) ? Number(raw.appliedAt) : timestamp,
        expiresAt,
        stacks: clamp(Number.isFinite(raw.stacks) ? Number(raw.stacks) : 1, 1, 5),
      };
    })
    .filter((status): status is ArpgAppliedStatus => Boolean(status));
}

function applyStatus(
  statuses: ArpgAppliedStatus[] | undefined,
  statusId: string | undefined,
  sourceId: string,
): ArpgAppliedStatus[] {
  if (!statusId || !ARPG_STATUS_EFFECTS[statusId]) return normalizeStatuses(statuses);
  const timestamp = now();
  const definition = ARPG_STATUS_EFFECTS[statusId];
  const existing = normalizeStatuses(statuses);
  const without = existing.filter((status) => status.id !== statusId);
  const previous = existing.find((status) => status.id === statusId);
  return [
    ...without,
    {
      id: statusId,
      sourceId,
      appliedAt: timestamp,
      expiresAt: timestamp + definition.durationMs,
      stacks: clamp((previous?.stacks ?? 0) + 1, 1, 5),
    },
  ];
}

function activeStatuses(statuses: ArpgAppliedStatus[] | undefined) {
  return normalizeStatuses(statuses);
}

function createDefaultCombatState(storyFlags: string[] = []): ArpgCombatState {
  return {
    playerStatuses: [],
    cooldowns: {},
    targetEnemyId: null,
    latestEvents: [],
    discoveredEnemyCodexIds: storyFlags
      .filter((flag) => flag.startsWith("codex:enemy:"))
      .map((flag) => flag.replace("codex:enemy:", "")),
    reducedMotionVfx: false,
  };
}

function normalizeCombat(rawCombat: unknown, storyFlags: string[]): ArpgCombatState {
  const raw = rawCombat && typeof rawCombat === "object" ? (rawCombat as Partial<ArpgCombatState>) : {};
  const timestamp = now();
  const cooldowns =
    raw.cooldowns && typeof raw.cooldowns === "object"
      ? Object.fromEntries(
          Object.entries(raw.cooldowns)
            .filter(([skillId, readyAt]) => isKnownSkill(skillId) && Number.isFinite(readyAt))
            .map(([skillId, readyAt]) => [skillId, Math.max(timestamp, Number(readyAt))]),
        )
      : {};
  return {
    playerStatuses: normalizeStatuses(raw.playerStatuses),
    cooldowns,
    targetEnemyId:
      typeof raw.targetEnemyId === "string" && ARPG_ENEMIES[raw.targetEnemyId]
        ? raw.targetEnemyId
        : null,
    latestEvents: Array.isArray(raw.latestEvents)
      ? raw.latestEvents
          .filter((event): event is ArpgCombatEvent => Boolean(event && typeof event.label === "string"))
          .slice(0, COMBAT_EVENT_LIMIT)
      : [],
    discoveredEnemyCodexIds: uniqueStrings([
      ...storyFlags
        .filter((flag) => flag.startsWith("codex:enemy:"))
        .map((flag) => flag.replace("codex:enemy:", "")),
      ...(Array.isArray(raw.discoveredEnemyCodexIds) ? raw.discoveredEnemyCodexIds : []),
    ]).filter((enemyId) => Boolean(ARPG_ENEMIES[enemyId])),
    reducedMotionVfx: Boolean(raw.reducedMotionVfx),
    lastDodgedAt:
      typeof raw.lastDodgedAt === "number" && raw.lastDodgedAt > 0
        ? raw.lastDodgedAt
        : undefined,
  };
}

function pushCombatEvents(save: ArpgSaveState, events: ArpgCombatEvent[]): ArpgCombatState {
  return {
    ...save.combat,
    latestEvents: [...events, ...save.combat.latestEvents].slice(0, COMBAT_EVENT_LIMIT),
  };
}

function getEnemyProfile(enemyId: string) {
  return ARPG_ENEMY_COMBAT_PROFILES[enemyId] ?? null;
}

function discoverEnemy(save: ArpgSaveState, enemyId: string): ArpgSaveState {
  if (!ARPG_ENEMIES[enemyId]) return save;
  if (save.combat.discoveredEnemyCodexIds.includes(enemyId)) return save;
  return {
    ...save,
    combat: {
      ...pushCombatEvents(save, [
        combatEvent("codex", `Codex updated: ${ARPG_ENEMIES[enemyId].name}.`, { enemyId }),
      ]),
      discoveredEnemyCodexIds: [...save.combat.discoveredEnemyCodexIds, enemyId],
    },
    storyFlags: addStoryFlags(save, [`codex:enemy:${enemyId}`]),
  };
}

function setEnemyIntentForDistance(
  enemy: ArpgEnemyState,
  enemyId: string,
  distance: number,
): ArpgEnemyState {
  if (enemy.defeated) return { ...enemy, intent: "defeated" };
  const profile = getEnemyProfile(enemyId);
  if (!profile) return { ...enemy, intent: distance <= ATTACK_REACH ? "aggro" : "idle" };
  if (distance <= profile.attackReach) {
    return {
      ...enemy,
      intent: "telegraph",
      nextIntentAt: now() + profile.telegraphMs,
    };
  }
  return {
    ...enemy,
    intent: distance <= ATTACK_REACH ? "aggro" : "idle",
  };
}

function damageMultiplier(profile: ReturnType<typeof getEnemyProfile>, damageType: ArpgDamageType) {
  if (!profile) return 1;
  let multiplier = 1;
  if (profile.weaknesses.includes(damageType)) multiplier += 0.22;
  if (profile.resistances.includes(damageType)) multiplier -= 0.18;
  return Math.max(0.55, multiplier);
}

function firstActiveSkill(save: ArpgSaveState) {
  return save.player.equippedSkillIds
    .map((skillId) => getSkillDefinition(skillId))
    .find((skill) => skill?.kind === "active") ?? null;
}

function resolveAttackDamage(
  save: ArpgSaveState,
  enemyId: string,
  skillId: string | null,
): { amount: number; damageType: ArpgDamageType; skillName: string | null; statusId?: string } {
  const stats = deriveArpgStats(save);
  const profile = getEnemyProfile(enemyId);
  const skill = skillId ? getSkillDefinition(skillId) : firstActiveSkill(save);
  const skillBonus = skill
    ? (skill.statBonus.might ?? 0) +
      Math.floor((skill.statBonus.focus ?? 0) * 0.8) +
      Math.floor((skill.statBonus.resonance ?? 0) * 0.7) +
      Math.floor((skill.statBonus.speed ?? 0) * 0.45)
    : 0;
  const damageType =
    skill?.id.includes("ashrunner") || skill?.id.includes("marked")
      ? "bleed"
      : skill?.id.includes("relic") || skill?.id.includes("loom")
        ? "void"
        : skill?.id.includes("ember") || skill?.id.includes("cinder")
          ? "ember"
          : "physical";
  const base = Math.round(
    stats.might * 1.12 +
      stats.focus * 0.28 +
      stats.resonance * 0.18 +
      stats.crit * 0.22 +
      skillBonus,
  );
  const statusBonus = activeStatuses(save.enemies[enemyId]?.statuses).some(
    (status) => status.id === "exposed" || status.id === "cracked-armor",
  )
    ? 4
    : 0;
  return {
    amount: Math.max(7, Math.round((base + statusBonus) * damageMultiplier(profile, damageType))),
    damageType,
    skillName: skill?.name ?? null,
    statusId: profile?.appliesStatuses[0],
  };
}

function consumeStack(save: ArpgSaveState, itemId: string, quantity: number) {
  if (itemId === "gold") {
    const consumed = Math.min(save.player.gold, quantity);
    return {
      inventory: save.inventory,
      consumed,
      player: {
        ...save.player,
        gold: save.player.gold - consumed,
      },
    };
  }

  let remaining = quantity;
  const inventory = save.inventory
    .map((entry) => {
      if (entry.itemId !== itemId || remaining <= 0) return entry;
      const consumed = Math.min(entry.quantity, remaining);
      remaining -= consumed;
      return { ...entry, quantity: entry.quantity - consumed };
    })
    .filter((entry) => {
      if (entry.quantity > 0) return true;
      const item = ARPG_ITEMS[entry.itemId];
      return item?.type === "equipment";
    });

  return { inventory, consumed: quantity - remaining, player: save.player };
}

function addRewardOutputs(save: ArpgSaveState, outputs: Array<{ id: string; quantity: number }>) {
  let next = save;
  for (const output of outputs) {
    if (output.id === "gold") {
      next = {
        ...next,
        player: {
          ...next.player,
          gold: next.player.gold + output.quantity,
        },
      };
      continue;
    }
    if (!ARPG_ITEMS[output.id]) continue;
    const existingStack = next.inventory.find(
      (entry) => entry.itemId === output.id && isStackable(ARPG_ITEMS[output.id]),
    );
    if (existingStack) {
      next = {
        ...next,
        inventory: next.inventory.map((entry) =>
          entry.instanceId === existingStack.instanceId
            ? {
                ...entry,
                quantity: clamp(
                  entry.quantity + output.quantity,
                  1,
                  ARPG_ITEMS[output.id].maxStack ?? 99,
                ),
              }
            : entry,
        ),
      };
      continue;
    }
    next = {
      ...next,
      inventory: [
        ...next.inventory,
        createInventoryEntry(output.id, "mw6-system", {
          quantity: output.quantity,
          instanceId: stableInstanceId(output.id, `mw6-${now()}-${next.inventory.length}`),
        }),
      ],
    };
  }
  return next;
}

export function createDefaultArpgSave(): ArpgSaveState {
  const inventory = createStarterInventory();
  const equipped = normalizeEquipped(ARPG_STARTER_EQUIPMENT, inventory);
  const character = normalizeCharacterIdentity(undefined, {
    classPathId: DEFAULT_CLASS_PATH_ID,
    originId: DEFAULT_ORIGIN_ID,
  });
  const starterSkillIds = getStarterSkillIds(character.classPathId);
  const equippedSkillIds = [getClassTree(character.classPathId).starterBuild.activeSkillId];
  const storyFlags = [
    `origin:${character.originId}`,
    `race:${character.raceId}`,
    `class:${character.classPathId}`,
    `subclass:${character.subclassId}`,
    `palette:${character.spritePaletteId}`,
  ];

  return {
    version: 3,
    character,
    player: {
      x: ARPG_FIRST_ZONE.spawn.x,
      z: ARPG_FIRST_ZONE.spawn.z,
      hp: 100,
      maxHp: 100,
      mana: 50,
      maxMana: 50,
      xp: 0,
      level: 1,
      originId: character.originId,
      classPathId: character.classPathId,
      gold: 0,
      unlockedSkills: starterSkillIds,
      equippedSkillIds,
      activeQuestId: "awaken-the-reliquary",
      respawnMarker: "gate-room",
    },
    inventory,
    equipped,
    collectedItemIds: [...ARPG_STARTER_ITEM_IDS],
    storyFlags,
    enemies: createEnemyState(),
    world: normalizeWorld(null, []),
    activeZoneId: ARPG_ZONE_ID,
    discoveredCityIds: ["first-reliquary"],
    discoveredSubCityIds: [],
    reputations: {
      [character.raceId]: 1,
      "first-reliquary": 1,
    },
    questLog: createDefaultQuestLog(),
    companions: createDefaultCompanions(),
    mapFlags: ["map:first-reliquary"],
    codex: createDefaultCodex(storyFlags),
    crafting: createDefaultCrafting(),
    journey: createDefaultJourney(storyFlags),
    endgame: createDefaultEndgame(storyFlags),
    combat: createDefaultCombatState(storyFlags),
    selectedItemId: "cinder-glaive",
    selectedItemInstanceId: equipped.weapon,
    lastEvent: `${ARPG_PROLOGUE_CONTENT.openingChapter.title}: sign the Descent Ledger and wake the oath-lamps before danger begins.`,
    lastSavedAt: now(),
  };
}

export function normalizeArpgSave(
  save: (Partial<ArpgSaveState> & { version?: number }) | null | undefined,
): ArpgSaveState {
  const fallback = createDefaultArpgSave();
  if (!save || typeof save !== "object") return fallback;

  const legacySave = save as Partial<ArpgSaveState> & {
    player?: Partial<ArpgSaveState["player"]>;
    character?: Partial<ArpgProductionCharacterIdentity>;
    inventory?: unknown;
    equipped?: Partial<Record<ArpgEquipmentSlot, string | null>>;
    journey?: unknown;
    endgame?: unknown;
  };
  const inventory = normalizeInventory(legacySave.inventory);
  const equipped = normalizeEquipped(legacySave.equipped, inventory);
  const character = normalizeCharacterIdentity(legacySave.character, legacySave.player);
  const originId =
    legacySave.player?.originId && ARPG_ORIGINS[legacySave.player.originId]
      ? legacySave.player.originId
      : character.originId;
  const classPathId = knownClassPathId(legacySave.player?.classPathId ?? character.classPathId);
  const normalizedCharacter = normalizeCharacterIdentity(
    {
      ...character,
      originId,
      classPathId,
    },
    legacySave.player,
  );
  const starterSkillIds = getStarterSkillIds(normalizedCharacter.classPathId);
  const rawStoryFlags = uniqueStrings([
    ...(Array.isArray(legacySave.storyFlags) ? legacySave.storyFlags : fallback.storyFlags),
    `origin:${originId}`,
    `race:${normalizedCharacter.raceId}`,
    `class:${normalizedCharacter.classPathId}`,
    `subclass:${normalizedCharacter.subclassId}`,
    `palette:${normalizedCharacter.spritePaletteId}`,
  ]);
  const hasProgressedPastPrologueIntro = rawStoryFlags.some(
    (flag) =>
      flag === "lore:gate-monolith" ||
      flag === "loot:loomshard-charm" ||
      flag === "equipped:loomshard-charm" ||
      flag === "lore:forge-echo" ||
      flag.startsWith("defeated:") ||
      flag.startsWith("upgraded:"),
  );
  const storyFlags = uniqueStrings([
    ...rawStoryFlags,
    ...(hasProgressedPastPrologueIntro
      ? ["lore:descent-ledger", "lore:oath-lamp-arcade", "npc:oracle-met"]
      : []),
  ]);
  const enemies = normalizeEnemies(legacySave.enemies);
  const world = normalizeWorld(legacySave.world, storyFlags);
  const combat = normalizeCombat(legacySave.combat, storyFlags);
  const journey = normalizeJourney(legacySave.journey, storyFlags);
  const endgame = normalizeEndgame(legacySave.endgame, storyFlags);
  const level = clamp(
    Math.floor(Number.isFinite(legacySave.player?.level) ? Number(legacySave.player?.level) : 1),
    1,
    3,
  );
  const maxHp = clamp(
    Math.floor(
      Number.isFinite(legacySave.player?.maxHp) ? Number(legacySave.player?.maxHp) : 100,
    ),
    60,
    180,
  );
  const maxMana = clamp(
    Math.floor(
      Number.isFinite(legacySave.player?.maxMana) ? Number(legacySave.player?.maxMana) : 50,
    ),
    30,
    140,
  );
  const selectedEntry = findInventoryEntry(
    inventory,
    legacySave.selectedItemInstanceId ?? legacySave.selectedItemId ?? equipped.weapon,
  );

  return {
    version: 3 as const,
    character: normalizedCharacter,
    player: {
      x: clamp(
        Number.isFinite(legacySave.player?.x) ? Number(legacySave.player?.x) : fallback.player.x,
        ARPG_WORLD_BOUNDS.minX,
        ARPG_WORLD_BOUNDS.maxX,
      ),
      z: clamp(
        Number.isFinite(legacySave.player?.z) ? Number(legacySave.player?.z) : fallback.player.z,
        ARPG_WORLD_BOUNDS.minZ,
        ARPG_WORLD_BOUNDS.maxZ,
      ),
      hp: clamp(
        Number.isFinite(legacySave.player?.hp) ? Number(legacySave.player?.hp) : fallback.player.hp,
        1,
        maxHp,
      ),
      maxHp,
      mana: clamp(
        Number.isFinite(legacySave.player?.mana)
          ? Number(legacySave.player?.mana)
          : fallback.player.mana,
        0,
        maxMana,
      ),
      maxMana,
      xp: Math.max(0, Number.isFinite(legacySave.player?.xp) ? Number(legacySave.player?.xp) : 0),
      level,
      originId,
      classPathId: normalizedCharacter.classPathId,
      gold: Math.max(
        0,
        Number.isFinite(legacySave.player?.gold) ? Number(legacySave.player?.gold) : 0,
      ),
      unlockedSkills: uniqueStrings([
        ...starterSkillIds,
        ...(Array.isArray(legacySave.player?.unlockedSkills)
          ? legacySave.player?.unlockedSkills
          : []),
      ]).filter((skillId) => isKnownSkill(skillId)),
      equippedSkillIds: uniqueStrings([
        getClassTree(normalizedCharacter.classPathId).starterBuild.activeSkillId,
        ...(Array.isArray(legacySave.player?.equippedSkillIds)
          ? legacySave.player?.equippedSkillIds
          : []),
      ])
        .filter((skillId) => isKnownSkill(skillId))
        .slice(0, 2),
      activeQuestId:
        legacySave.player?.activeQuestId && ARPG_QUESTS[legacySave.player.activeQuestId]
          ? legacySave.player.activeQuestId
          : "awaken-the-reliquary",
      respawnMarker:
        typeof legacySave.player?.respawnMarker === "string"
          ? legacySave.player.respawnMarker
          : "gate-room",
    },
    inventory,
    equipped,
    collectedItemIds: uniqueStrings([
      ...ARPG_STARTER_ITEM_IDS,
      ...(Array.isArray(legacySave.collectedItemIds) ? legacySave.collectedItemIds : []),
    ]).filter((id) => Boolean(ARPG_ITEMS[id])),
    storyFlags,
    enemies,
    world: {
      ...world,
      defeatedEnemyIds: uniqueStrings([
        ...world.defeatedEnemyIds,
        ...Object.values(enemies)
          .filter((enemy) => enemy.defeated)
          .map((enemy) => enemy.id),
      ]),
    },
    activeZoneId:
      typeof legacySave.activeZoneId === "string" && legacySave.activeZoneId
        ? legacySave.activeZoneId
        : world.zoneId,
    discoveredCityIds: uniqueStrings([
      "first-reliquary",
      ...(Array.isArray(legacySave.discoveredCityIds) ? legacySave.discoveredCityIds : []),
    ]),
    discoveredSubCityIds: uniqueStrings(
      Array.isArray(legacySave.discoveredSubCityIds) ? legacySave.discoveredSubCityIds : [],
    ),
    reputations: {
      ...(legacySave.reputations && typeof legacySave.reputations === "object"
        ? legacySave.reputations
        : {}),
      [normalizedCharacter.raceId]:
        (legacySave.reputations && typeof legacySave.reputations === "object"
          ? legacySave.reputations[normalizedCharacter.raceId]
          : undefined) ?? 1,
    },
    questLog: Array.isArray(legacySave.questLog) ? legacySave.questLog : createDefaultQuestLog(),
    companions:
      legacySave.companions && typeof legacySave.companions === "object"
        ? { ...createDefaultCompanions(), ...legacySave.companions }
        : createDefaultCompanions(),
    mapFlags: uniqueStrings([
      "map:first-reliquary",
      ...(Array.isArray(legacySave.mapFlags) ? legacySave.mapFlags : []),
    ]),
    codex:
      legacySave.codex && typeof legacySave.codex === "object"
        ? {
            ...createDefaultCodex(storyFlags),
            ...legacySave.codex,
          }
        : createDefaultCodex(storyFlags),
    crafting:
      legacySave.crafting && typeof legacySave.crafting === "object"
        ? {
            ...createDefaultCrafting(),
            ...legacySave.crafting,
          }
        : createDefaultCrafting(),
    journey,
    endgame,
    combat: {
      ...combat,
      targetEnemyId:
        combat.targetEnemyId && enemies[combat.targetEnemyId]?.defeated
          ? null
          : combat.targetEnemyId,
    },
    selectedItemId: selectedEntry?.itemId ?? "cinder-glaive",
    selectedItemInstanceId: selectedEntry?.instanceId ?? equipped.weapon,
    lastEvent:
      typeof legacySave.lastEvent === "string" && legacySave.lastEvent
        ? legacySave.lastEvent
        : fallback.lastEvent,
    lastSavedAt:
      typeof legacySave.lastSavedAt === "number" && legacySave.lastSavedAt > 0
        ? legacySave.lastSavedAt
        : now(),
  };
}

export function deriveArpgStats(save: Partial<ArpgSaveState> | null | undefined): ArpgStats {
  const normalized = normalizeArpgSave(save);
  const lineage = ARPG_LINEAGES[normalized.character.raceId] ?? ARPG_LINEAGES[DEFAULT_RACE_ID];
  const subclass = getSubclass(normalized.character.classPathId, normalized.character.subclassId);
  const origin =
    ARPG_ORIGINS[normalized.player.originId] ?? ARPG_ORIGINS[DEFAULT_ORIGIN_ID];
  const stats = { ...lineage.baseStats };

  addStats(stats, lineage.passive.statBonus);
  addStats(stats, subclass.statBonus);
  for (const key of ARPG_STAT_KEYS) {
    stats[key] += Math.round((origin.baseStats[key] ?? 0) * 0.25);
  }

  stats.might += Math.max(0, normalized.player.level - 1) * 2;
  stats.ward += Math.max(0, normalized.player.level - 1) * 2;
  stats.focus += Math.max(0, normalized.player.level - 1);

  for (const instanceId of Object.values(normalized.equipped)) {
    const entry = findInventoryEntry(normalized.inventory, instanceId);
    const item = entry ? ARPG_ITEMS[entry.itemId] : null;
    if (!entry || !item) continue;
    const quality = ARPG_ITEM_QUALITIES[entry.quality] ?? ARPG_ITEM_QUALITIES[item.quality];
    const upgradeBonus = entry.upgradeRank;
    for (const key of Object.keys(stats) as Array<keyof ArpgStats>) {
      const base = item.stats[key] ?? 0;
      stats[key] += Math.round(base * quality.statMultiplier) + (base > 0 ? upgradeBonus : 0);
    }
    for (const affix of entry.affixes) {
      stats[affix] += 1 + Math.ceil(entry.upgradeRank / 2);
    }
  }

  for (const skillId of normalized.player.unlockedSkills) {
    const skill = getSkillDefinition(skillId);
    if (!skill || skill.kind !== "passive") continue;
    for (const key of Object.keys(skill.statBonus) as Array<keyof ArpgStats>) {
      stats[key] += skill.statBonus[key] ?? 0;
    }
  }

  for (const status of activeStatuses(normalized.combat.playerStatuses)) {
    const definition = ARPG_STATUS_EFFECTS[status.id];
    if (!definition?.statModifier) continue;
    for (const key of Object.keys(definition.statModifier) as Array<keyof ArpgStats>) {
      stats[key] += (definition.statModifier[key] ?? 0) * status.stacks;
    }
  }

  return stats;
}

export function getArpgInventory(save: Partial<ArpgSaveState> | null | undefined) {
  const normalized = normalizeArpgSave(save);
  const equippedIds = new Set(Object.values(normalized.equipped).filter(Boolean));
  return normalized.inventory.flatMap<ArpgInventoryItemView>((entry) => {
    const item = ARPG_ITEMS[entry.itemId];
    if (!item) return [];
    return [
      {
        ...item,
        instanceId: entry.instanceId,
        quantity: entry.quantity,
        quality: entry.quality,
        rarity: entry.quality,
        level: entry.level,
        upgradeRank: entry.upgradeRank,
        affixes: entry.affixes,
        source: entry.source,
        bound: entry.bound,
        equipped: equippedIds.has(entry.instanceId),
        displayName:
          item.type === "equipment"
            ? `${item.name} +${entry.upgradeRank}`
            : `${item.name} x${entry.quantity}`,
      },
    ];
  });
}

export function getArpgEquippedItems(save: Partial<ArpgSaveState> | null | undefined) {
  const normalized = normalizeArpgSave(save);
  const inventory = getArpgInventory(normalized);
  return ARPG_EQUIPMENT_SLOTS.map((slot) => ({
    slot,
    item: normalized.equipped[slot]
      ? inventory.find((entry) => entry.instanceId === normalized.equipped[slot]) ?? null
      : null,
  }));
}

export function getArpgActiveQuest(save: Partial<ArpgSaveState> | null | undefined) {
  const normalized = normalizeArpgSave(save);
  return ARPG_QUESTS[normalized.player.activeQuestId] ?? ARPG_QUESTS["awaken-the-reliquary"];
}

export function getArpgKnownSkills(save: Partial<ArpgSaveState> | null | undefined) {
  const normalized = normalizeArpgSave(save);
  const unlocked = new Set(normalized.player.unlockedSkills);
  const equipped = new Set(normalized.player.equippedSkillIds);
  return Object.values(ARPG_CHARACTER_SKILL_NODES)
    .map((skill) => ({
      ...skill,
      unlocked: unlocked.has(skill.id),
      equipped: equipped.has(skill.id),
      available: normalized.player.level >= skill.unlockLevel,
      currentClass: skill.pathId === normalized.character.classPathId,
    }))
    .sort((a, b) => {
      if (a.currentClass !== b.currentClass) return a.currentClass ? -1 : 1;
      return a.unlockLevel - b.unlockLevel || a.name.localeCompare(b.name);
    });
}

export function getArpgCharacterOptions() {
  return {
    lineages: Object.values(ARPG_LINEAGES),
    classTrees: Object.values(ARPG_CLASS_TREES),
    palettes: Object.values(ARPG_PALETTES),
    portraits: Object.values(ARPG_PORTRAITS),
  };
}

export function getArpgCharacterProfile(save: Partial<ArpgSaveState> | null | undefined) {
  const normalized = normalizeArpgSave(save);
  const lineage = ARPG_LINEAGES[normalized.character.raceId] ?? ARPG_LINEAGES[DEFAULT_RACE_ID];
  const classTree = getClassTree(normalized.character.classPathId);
  const subclass = getSubclass(normalized.character.classPathId, normalized.character.subclassId);
  const palette = getPalette(normalized.character.raceId, normalized.character.spritePaletteId);
  const portrait = getPortrait(normalized.character.raceId, normalized.character.portraitId);

  return {
    saveVersion: normalized.version,
    character: normalized.character,
    lineage,
    classTree,
    subclass,
    palette,
    portrait,
  };
}

export function getArpgCombatSummary(save: Partial<ArpgSaveState> | null | undefined) {
  const normalized = normalizeArpgSave(save);
  const targetId = normalized.combat.targetEnemyId ?? nearestLiveEnemyId(normalized);
  const targetDefinition = targetId ? ARPG_ENEMIES[targetId] : null;
  const targetState = targetId ? normalized.enemies[targetId] : null;
  const targetProfile = targetId ? getEnemyProfile(targetId) : null;
  const playerStatuses = activeStatuses(normalized.combat.playerStatuses).map((status) => ({
    ...status,
    definition: ARPG_STATUS_EFFECTS[status.id],
  }));
  const targetStatuses = activeStatuses(targetState?.statuses).map((status) => ({
    ...status,
    definition: ARPG_STATUS_EFFECTS[status.id],
  }));
  const cooldowns = Object.fromEntries(
    Object.entries(normalized.combat.cooldowns).map(([skillId, readyAt]) => [
      skillId,
      Math.max(0, readyAt - now()),
    ]),
  );

  return {
    targetId,
    targetDefinition,
    targetState,
    targetProfile,
    targetFamily: targetProfile ? ARPG_ENEMY_FAMILIES[targetProfile.familyId] : null,
    playerStatuses,
    targetStatuses,
    latestEvents: normalized.combat.latestEvents,
    cooldowns,
    damageTypes: ARPG_DAMAGE_TYPES,
    traits: targetProfile?.traits.map((traitId) => ARPG_ENEMY_TRAITS[traitId]).filter(Boolean) ?? [],
  };
}

export function getArpgEnemyCodex(save: Partial<ArpgSaveState> | null | undefined) {
  const normalized = normalizeArpgSave(save);
  return Object.values(ARPG_ENEMY_COMBAT_PROFILES).map((profile) => {
    const enemy = ARPG_ENEMIES[profile.enemyId];
    const discovered = normalized.combat.discoveredEnemyCodexIds.includes(profile.enemyId);
    return {
      enemy,
      profile,
      family: ARPG_ENEMY_FAMILIES[profile.familyId],
      discovered,
      defeated: Boolean(normalized.enemies[profile.enemyId]?.defeated),
    };
  });
}

export function getArpgWorldLoopSummary(save: Partial<ArpgSaveState> | null | undefined) {
  const normalized = normalizeArpgSave(save);
  const selectedCity =
    normalized.journey.selectedCityId === "first-reliquary"
      ? null
      : ARPG_PRODUCTION_CONTENT.world.cities.find((city) => city.id === normalized.journey.selectedCityId) ?? null;
  const selectedSubCity =
    selectedCity?.subCities.find((subCity) => subCity.id === normalized.journey.selectedSubCityId) ??
    null;
  const activeTravelEvent = normalized.journey.activeTravelEventId
    ? getArpgTravelEvent(normalized.journey.activeTravelEventId)
    : null;

  return {
    production: {
      majorCityCount: ARPG_PRODUCTION_CONTENT.world.cities.length,
      subCityCount: ARPG_PRODUCTION_CONTENT.world.cities.reduce(
        (count, city) => count + city.subCities.length,
        0,
      ),
      routeCount: ARPG_PRODUCTION_CONTENT.world.routes.length,
    },
    systems: ARPG_WORLD_LOOP_SUMMARY,
    enemyTaxonomy: ARPG_ENEMY_TAXONOMY_SUMMARY,
    regionalEnemyArchetypes: ARPG_REGIONAL_ENEMY_ARCHETYPES,
    subCityChampions: ARPG_SUBCITY_CHAMPIONS,
    cityBosses: ARPG_CITY_BOSSES,
    cityStorylines: ARPG_CITY_STORYLINES,
    subCitySideArcs: ARPG_SUBCITY_SIDE_ARCS,
    routeEvents: ARPG_ROUTE_EVENTS,
    majorNpcs: ARPG_MAJOR_NPCS,
    companions: ARPG_COMPANION_ARCS.map((companion) => ({
      ...companion,
      state: normalized.companions[companion.id],
    })),
    selectedCity,
    selectedSubCity,
    activeTravelEvent,
    discoveredCityCount: normalized.discoveredCityIds.filter((cityId) => cityId !== "first-reliquary").length,
    discoveredSubCityCount: normalized.discoveredSubCityIds.length,
    unlockedRouteCount: normalized.journey.unlockedRouteIds.length,
    reputations: normalized.reputations,
  };
}

export function getArpgArmorySummary(save: Partial<ArpgSaveState> | null | undefined) {
  const normalized = normalizeArpgSave(save);
  const inventory = getArpgInventory(normalized);
  const selectedItem = inventory.find((item) => item.instanceId === normalized.selectedItemInstanceId) ?? null;
  const selectedComparison = selectedItem
    ? getArpgArsenalComparison({
        id: selectedItem.instanceId,
        itemId: selectedItem.id,
        quality: selectedItem.quality,
        level: selectedItem.level,
        upgradeRank: selectedItem.upgradeRank,
        stats: selectedItem.stats,
        affixes: selectedItem.affixes,
      })
    : null;

  return {
    systems: ARPG_ARMORY_ECONOMY_SUMMARY,
    arsenalSystems: ARPG_ARSENAL_SUMMARY,
    arsenal: ARPG_ARSENAL_CONTENT,
    weaponFamilies: ARPG_ARMORY_ECONOMY_CONTENT.weaponFamilies,
    gearSlots: ARPG_ARMORY_ECONOMY_CONTENT.gearSlots,
    qualities: ARPG_ARMORY_ECONOMY_CONTENT.qualities,
    armorSets: ARPG_CITY_ARMOR_SETS,
    cityGearRewards: ARPG_CITY_GEAR_REWARDS,
    craftingRecipes: ARPG_ARMORY_ECONOMY_CONTENT.craftingRecipes,
    currencies: ARPG_ARMORY_ECONOMY_CONTENT.currencies,
    salvageRules: ARPG_ARMORY_ECONOMY_CONTENT.salvageRules,
    selectedItem,
    selectedComparison,
  };
}

export function getArpgEndgameSummary(save: Partial<ArpgSaveState> | null | undefined) {
  const normalized = normalizeArpgSave(save);
  const selectedCityId =
    normalized.journey.selectedCityId === "first-reliquary"
      ? ARPG_PRODUCTION_CONTENT.world.cities[0]?.id
      : normalized.journey.selectedCityId;
  const selectedDungeon =
    ARPG_CITY_CHALLENGE_DUNGEONS.find((dungeon) => dungeon.cityId === selectedCityId) ??
    ARPG_CITY_CHALLENGE_DUNGEONS[0];
  const selectedTrial =
    ARPG_RELIC_TRIALS.find((trial) => trial.cityId === selectedCityId) ?? ARPG_RELIC_TRIALS[0];
  const localTreasureMaps = ARPG_TREASURE_MAPS.filter((map) => map.cityId === selectedCityId);
  const localTimedRooms = ARPG_TIMED_TREASURE_ROOMS.filter((room) => room.cityId === selectedCityId);
  const localBossRematches = ARPG_BOSS_REMATCHES.filter(
    (rematch) => !rematch.cityId || rematch.cityId === selectedCityId,
  );
  const difficulty =
    ARPG_ENDGAME_CONTENT.difficultyTiers.find(
      (tier) => tier.id === normalized.endgame.difficultyTierId,
    ) ?? ARPG_ENDGAME_CONTENT.difficultyTiers[0];
  const eliteRotation =
    ARPG_ENDGAME_CONTENT.eliteAffixRotations.find(
      (rotation) => rotation.id === normalized.endgame.eliteAffixRotationId,
    ) ?? ARPG_ENDGAME_CONTENT.eliteAffixRotations[0];

  return {
    systems: ARPG_ENDGAME_SUMMARY,
    unlocked: hasEndgameAccess(normalized),
    state: normalized.endgame,
    difficulty,
    difficultyTiers: ARPG_ENDGAME_CONTENT.difficultyTiers,
    eliteRotation,
    eliteAffixRotations: ARPG_ENDGAME_CONTENT.eliteAffixRotations,
    selectedDungeon,
    selectedTrial,
    localTreasureMaps,
    localTimedRooms,
    localBossRematches,
    dungeons: ARPG_CITY_CHALLENGE_DUNGEONS,
    relicTrials: ARPG_RELIC_TRIALS,
    treasureMaps: ARPG_TREASURE_MAPS,
    timedRooms: ARPG_TIMED_TREASURE_ROOMS,
    bossRematches: ARPG_BOSS_REMATCHES,
    arenaChallenges: ARPG_ENDGAME_CONTENT.arenaChallenges,
    collectionGoals: ARPG_ENDGAME_CONTENT.collectionGoals.map((goal) => ({
      ...goal,
      complete: normalized.endgame.collectionGoalIds.includes(goal.id),
    })),
    cosmeticRewards: ARPG_ENDGAME_CONTENT.cosmeticRewards.map((reward) => ({
      ...reward,
      claimed: normalized.endgame.cosmeticRewardIds.includes(reward.id),
    })),
    completed: {
      dungeons: normalized.endgame.completedDungeonIds.length,
      trials: normalized.endgame.completedTrialIds.length,
      bosses: normalized.endgame.completedBossRematchIds.length,
      treasureMaps: normalized.endgame.completedTreasureMapIds.length,
      arenas: normalized.endgame.completedArenaChallengeIds.length,
      cosmetics: normalized.endgame.cosmeticRewardIds.length,
    },
  };
}

function applyCharacterSelection(
  save: ArpgSaveState,
  selection: ArpgCharacterSelection,
  mode: "create" | "respec" | "cosmetic",
): ArpgSaveState {
  const normalized = normalizeArpgSave(save);
  const requestedClassPathId = knownClassPathId(
    selection.classPathId ?? normalized.character.classPathId,
  );
  const classChanged = requestedClassPathId !== normalized.character.classPathId;
  const requestedRaceId = knownLineageId(selection.raceId ?? normalized.character.raceId);
  const requestedSubclassId =
    selection.subclassId ??
    (classChanged ? getClassTree(requestedClassPathId).starterBuild.subclassId : normalized.character.subclassId);
  const character = normalizeCharacterIdentity(
    {
      ...normalized.character,
      characterName: selection.characterName ?? normalized.character.characterName,
      raceId: requestedRaceId,
      originId: selection.originId ?? normalized.character.originId,
      classPathId: requestedClassPathId,
      subclassId: requestedSubclassId,
      portraitId: selection.portraitId ?? normalized.character.portraitId,
      spritePaletteId: selection.paletteId ?? normalized.character.spritePaletteId,
      cosmeticAccent: selection.paletteId
        ? (ARPG_PALETTES[selection.paletteId]?.accent ?? normalized.character.cosmeticAccent)
        : normalized.character.cosmeticAccent,
      respecCount:
        mode === "respec" ? normalized.character.respecCount + 1 : normalized.character.respecCount,
    },
    normalized.player,
  );
  const lineage = ARPG_LINEAGES[character.raceId] ?? ARPG_LINEAGES[DEFAULT_RACE_ID];
  const classTree = getClassTree(character.classPathId);
  const starterSkillIds = getStarterSkillIds(character.classPathId);
  const unlockedSkills = uniqueStrings([
    ...starterSkillIds,
    ...(mode === "cosmetic" ? normalized.player.unlockedSkills : normalized.player.unlockedSkills),
  ]).filter((skillId) => isKnownSkill(skillId));
  const equippedSkillIds = uniqueStrings([
    classTree.starterBuild.activeSkillId,
    ...normalized.player.equippedSkillIds.filter((skillId) => getSkillPathId(skillId) === character.classPathId),
  ])
    .filter((skillId) => isKnownSkill(skillId))
    .slice(0, 2);
  const reputations = { ...normalized.reputations };
  for (const hook of lineage.cityReputationHooks) {
    reputations[hook.cityId] = Math.max(reputations[hook.cityId] ?? 0, hook.delta);
  }

  return {
    ...normalized,
    character,
    player: {
      ...normalized.player,
      originId: character.originId,
      classPathId: character.classPathId,
      unlockedSkills,
      equippedSkillIds,
    },
    reputations,
    storyFlags: addStoryFlags(normalized, [
      `race:${character.raceId}`,
      `class:${character.classPathId}`,
      `subclass:${character.subclassId}`,
      `palette:${character.spritePaletteId}`,
    ]),
    lastEvent:
      mode === "cosmetic"
        ? `Updated ${character.characterName}'s colors.`
        : `${character.characterName} is now ${lineage.name} ${classTree.name} (${getSubclass(
            character.classPathId,
            character.subclassId,
          ).name}).`,
    lastSavedAt: now(),
  };
}

export function createArpgCharacter(
  save: ArpgSaveState,
  selection: ArpgCharacterSelection,
): ArpgSaveState {
  return applyCharacterSelection(save, selection, "create");
}

export function respecArpgCharacter(
  save: ArpgSaveState,
  selection: ArpgCharacterSelection,
): ArpgSaveState {
  return applyCharacterSelection(save, selection, "respec");
}

export function setArpgCharacterCosmetic(
  save: ArpgSaveState,
  selection: Pick<ArpgCharacterSelection, "paletteId" | "portraitId">,
): ArpgSaveState {
  return applyCharacterSelection(save, selection, "cosmetic");
}

export function resolveArpgObjective(save: Partial<ArpgSaveState> | null | undefined) {
  const normalized = normalizeArpgSave(save);
  if (!normalized.storyFlags.includes("lore:descent-ledger")) {
    return "Sign the Descent Ledger so the reliquary records the hero's player-created identity.";
  }
  if (!normalized.storyFlags.includes("lore:oath-lamp-arcade")) {
    return "Relight the oath-lamps and learn the Bellroot Vestibule before combat begins.";
  }
  if (!normalized.storyFlags.includes("npc:oracle-met")) {
    return "Wake Ilo in the oracle cradle so the room has a guide, not just echoes.";
  }
  if (!normalized.storyFlags.includes("lore:gate-monolith")) {
    return "Study the Gate Monolith to learn why The First Reliquary opened.";
  }
  if (!hasItem(normalized, ARPG_LOOT_PEDESTAL_ITEM_ID)) {
    return "Claim the loom-shard charm from the pedestal.";
  }
  if (!Object.values(normalized.equipped).some((id) => {
    const entry = findInventoryEntry(normalized.inventory, id);
    return entry?.itemId === ARPG_LOOT_PEDESTAL_ITEM_ID;
  })) {
    return "Equip the loom-shard charm to tune your build.";
  }
  if (!normalized.world.openedChests.includes("forge-cache")) {
    return "Open the forge cache and gather shards for a first upgrade.";
  }
  if (!hasAnyUpgradedEquipment(normalized)) {
    return "Upgrade any equipped item to +1 at the forge.";
  }
  if (!normalized.enemies["hollow-sentry"]?.defeated) {
    return "Test the build against the Hollow Sentry.";
  }
  if (!normalized.enemies["brass-warden"]?.defeated) {
    return "Challenge the Brass Warden near the locked north exit.";
  }
  if (!hasItem(normalized, "gate-key-fragment")) {
    return "Recover the Gate Key Fragment from the north exit cache.";
  }
  if (!normalized.discoveredCityIds.includes("veyrhold")) {
    return "Use the north gate travel proof to reach Veyrhold and start the city pilgrimage.";
  }
  if (normalized.journey.activeTravelEventId) {
    const event = getArpgTravelEvent(normalized.journey.activeTravelEventId);
    return event
      ? `Resolve the road event: ${event.title}.`
      : "Resolve the active road event from the map drawer.";
  }
  return "The First Reliquary is stable. The locked north exit is ready for the next chamber.";
}

export function getNearestArpgInteraction(
  save: Partial<ArpgSaveState> | null | undefined,
): ArpgInteractionPrompt | null {
  const normalized = normalizeArpgSave(save);
  const player = normalized.player;
  const candidates: ArpgInteractionPrompt[] = [];

  for (const node of Object.values(ARPG_LORE_NODES)) {
    const distance = Math.hypot(player.x - node.position.x, player.z - node.position.z);
    const complete = normalized.storyFlags.includes(node.storyFlag);
    candidates.push({
      id: node.id,
      kind: "lore",
      label: node.title,
      actionLabel: complete ? "Review" : "Study",
      hint: complete ? "The echo stays available in your journal." : node.summary,
      distance,
      inRange: distance <= INTERACTION_REACH,
      complete,
      accent: "#8ecae6",
    });
  }

  for (const node of Object.values(ARPG_LOOT_NODES)) {
    const item = ARPG_ITEMS[node.itemId];
    if (!item) continue;
    const distance = Math.hypot(player.x - node.position.x, player.z - node.position.z);
    const complete =
      normalized.world.openedChests.includes(node.id) ||
      (item.type === "equipment" && normalized.inventory.some((entry) => entry.itemId === node.itemId));
    candidates.push({
      id: node.id,
      kind: "loot",
      label: complete ? `${item.name} secured` : node.title,
      actionLabel: complete && item.type === "equipment" ? "Open kit" : complete ? "Quiet" : "Claim",
      hint: complete ? "The cache is quiet. Tune your build from the kit." : node.summary,
      distance,
      inRange: distance <= INTERACTION_REACH,
      complete,
      accent: item.accent,
    });
  }

  for (const enemyDefinition of Object.values(ARPG_ENEMIES)) {
    const enemy = normalized.enemies[enemyDefinition.id];
    const distance = Math.hypot(
      player.x - enemyDefinition.position.x,
      player.z - enemyDefinition.position.z,
    );
    const complete = Boolean(enemy?.defeated);
    const gated =
      enemyDefinition.requiresUpgradedItem && !hasAnyUpgradedEquipment(normalized);
    candidates.push({
      id: enemyDefinition.id,
      kind: "enemy",
      label: complete ? `${enemyDefinition.name} quiet` : enemyDefinition.name,
      actionLabel: complete ? "Quiet" : "Strike",
      hint: complete
        ? "The construct has gone still."
        : gated
          ? "The Warden ignores untempered gear. Upgrade an equipped item first."
          : enemyDefinition.summary,
      distance,
      inRange: distance <= ATTACK_REACH,
      complete,
      accent: complete ? "#ffd166" : enemyDefinition.id === "brass-warden" ? "#d946ef" : "#ef4444",
    });
  }

  const firstRoute = getArpgRouteEvent(arpgRouteId("first-reliquary", "veyrhold"));
  if (firstRoute) {
    const distance = Math.hypot(player.x - 0.25, player.z - -2.35);
    const unlocked = hasNorthGateAccess(normalized);
    const complete = normalized.discoveredCityIds.includes(firstRoute.to);
    candidates.push({
      id: firstRoute.routeId,
      kind: "travel",
      label: complete ? "North Gate mapped" : unlocked ? "North Gate route" : "North Gate sealed",
      actionLabel: complete ? "Map" : unlocked ? "Travel" : "Locked",
      hint: complete
        ? "Veyrhold is mapped in the world drawer."
        : unlocked
          ? "Begin the first road event toward Veyrhold."
          : "Defeat the Brass Warden and recover the Gate Key Fragment.",
      distance,
      inRange: distance <= INTERACTION_REACH,
      complete,
      accent: unlocked ? "#ffd166" : "#8ecae6",
    });
  }

  const nearest = candidates.sort((a, b) => a.distance - b.distance)[0] ?? null;
  if (!nearest) return null;
  return nearest.distance <= DISCOVERY_REACH || nearest.inRange ? nearest : null;
}

export function isBlockedArpgPosition(x: number, z: number) {
  return ARPG_FIRST_ZONE.obstacles.some((obstacle) => {
    const halfWidth = obstacle.width / 2 + 0.18;
    const halfDepth = obstacle.depth / 2 + 0.18;
    return (
      x >= obstacle.x - halfWidth &&
      x <= obstacle.x + halfWidth &&
      z >= obstacle.z - halfDepth &&
      z <= obstacle.z + halfDepth
    );
  });
}

export function moveArpgPlayer(save: ArpgSaveState, vector: ArpgMoveVector): ArpgSaveState {
  const normalized = normalizeArpgSave(save);
  const stats = deriveArpgStats(normalized);
  const step = 0.3 + Math.min(0.2, stats.speed * 0.012);
  const magnitude = Math.max(1, Math.hypot(vector.x, vector.z));
  const nextX = clamp(
    normalized.player.x + (vector.x / magnitude) * step,
    ARPG_WORLD_BOUNDS.minX,
    ARPG_WORLD_BOUNDS.maxX,
  );
  const nextZ = clamp(
    normalized.player.z + (vector.z / magnitude) * step,
    ARPG_WORLD_BOUNDS.minZ,
    ARPG_WORLD_BOUNDS.maxZ,
  );
  const blocked = isBlockedArpgPosition(nextX, nextZ);

  return {
    ...normalized,
    player: {
      ...normalized.player,
      x: blocked ? normalized.player.x : nextX,
      z: blocked ? normalized.player.z : nextZ,
    },
    lastEvent: blocked
      ? "Ancient rubble blocks that path."
      : vector.label
        ? `Moved ${vector.label}.`
        : "Moved through the reliquary.",
    lastSavedAt: now(),
  };
}

export function collectArpgItem(
  save: ArpgSaveState,
  itemId: string,
  sourceId = "field",
): ArpgSaveState {
  const normalized = normalizeArpgSave(save);
  const item = ARPG_ITEMS[itemId];
  if (!item) return normalized;
  const node = ARPG_LOOT_NODES[sourceId];
  const quantity = node?.quantity ?? 1;
  let inventory = [...normalized.inventory];
  let selectedItemInstanceId = normalized.selectedItemInstanceId;

  if (isStackable(item)) {
    const existing = inventory.find((entry) => entry.itemId === itemId);
    if (existing) {
      inventory = inventory.map((entry) =>
        entry.instanceId === existing.instanceId
          ? {
              ...entry,
              quantity: clamp(entry.quantity + quantity, 1, item.maxStack ?? 99),
            }
          : entry,
      );
      selectedItemInstanceId = existing.instanceId;
    } else {
      const entry = createInventoryEntry(itemId, sourceId, { quantity });
      inventory.push(entry);
      selectedItemInstanceId = entry.instanceId;
    }
  } else {
    const existing = inventory.find((entry) => entry.itemId === itemId && entry.source === sourceId);
    if (existing) {
      return {
        ...normalized,
        selectedItemId: itemId,
        selectedItemInstanceId: existing.instanceId,
        lastEvent: `${item.name} is already in your kit.`,
        lastSavedAt: now(),
      };
    }
    const affixSeeds: Array<keyof ArpgStats> = [
      "might",
      "ward",
      "focus",
      "speed",
      "crit",
      "cooldown",
      "resonance",
    ];
    const affixCount = getArpgArsenalAffixCount(item.quality);
    const entry = createInventoryEntry(itemId, sourceId, {
      bound: item.type === "equipment",
      affixes: affixSeeds
        .sort((a, b) => {
          const aScore = item.stats[a] ?? 0;
          const bScore = item.stats[b] ?? 0;
          return bScore - aScore || a.localeCompare(b);
        })
        .slice(0, affixCount),
    });
    inventory.push(entry);
    selectedItemInstanceId = entry.instanceId;
  }

  const openedChests = node
    ? Array.from(new Set([...normalized.world.openedChests, node.id]))
    : normalized.world.openedChests;
  const flags = [`loot:${itemId}`];
  if (node) flags.push(`opened:${node.id}`);

  return {
    ...normalized,
    inventory,
    collectedItemIds: Array.from(new Set([...normalized.collectedItemIds, itemId])),
    storyFlags: addStoryFlags(normalized, flags),
    world: {
      ...normalized.world,
      openedChests,
    },
    selectedItemId: itemId,
    selectedItemInstanceId,
    lastEvent: `Collected ${item.name}.`,
    lastSavedAt: now(),
  };
}

export function equipArpgItem(save: ArpgSaveState, itemOrInstanceId: string): ArpgSaveState {
  const normalized = normalizeArpgSave(save);
  const entry = findInventoryEntry(normalized.inventory, itemOrInstanceId);
  const item = entry ? ARPG_ITEMS[entry.itemId] : null;
  if (!entry || !item || item.type !== "equipment" || !item.slot) {
    return {
      ...normalized,
      lastEvent: "That item is not equippable yet.",
      lastSavedAt: now(),
    };
  }

  return {
    ...normalized,
    equipped: {
      ...normalized.equipped,
      [item.slot]: entry.instanceId,
    },
    selectedItemId: item.id,
    selectedItemInstanceId: entry.instanceId,
    storyFlags: addStoryFlags(normalized, [`equipped:${item.id}`]),
    lastEvent: `Equipped ${item.name} +${entry.upgradeRank}.`,
    lastSavedAt: now(),
  };
}

export function selectArpgRegion(
  save: ArpgSaveState,
  cityId: string,
  subCityId: string | null = null,
): ArpgSaveState {
  const normalized = normalizeArpgSave(save);
  const city =
    cityId === "first-reliquary"
      ? null
      : ARPG_PRODUCTION_CONTENT.world.cities.find((entry) => entry.id === cityId);
  if (cityId !== "first-reliquary" && !city) {
    return {
      ...normalized,
      lastEvent: "That city is not charted in the reliquary atlas.",
      lastSavedAt: now(),
    };
  }
  const subCity =
    city?.subCities.find((entry) => entry.id === subCityId) ??
    (subCityId ? ARPG_PRODUCTION_CONTENT.world.cities.flatMap((entry) => entry.subCities).find((entry) => entry.id === subCityId) : null);

  return {
    ...normalized,
    journey: {
      ...normalized.journey,
      selectedCityId: cityId,
      selectedSubCityId: subCity?.id ?? null,
    },
    lastEvent: subCity
      ? `Atlas focused ${subCity.name}.`
      : city
        ? `Atlas focused ${city.name}.`
        : "Atlas focused The First Reliquary.",
    lastSavedAt: now(),
  };
}

export function beginArpgTravel(save: ArpgSaveState, routeId: string): ArpgSaveState {
  const normalized = normalizeArpgSave(save);
  const event = getArpgRouteEvent(routeId);
  if (!event) {
    return {
      ...normalized,
      lastEvent: "That route is not in the atlas yet.",
      lastSavedAt: now(),
    };
  }
  const routeUnlocked =
    normalized.journey.unlockedRouteIds.includes(routeId) ||
    normalized.storyFlags.includes(event.unlockFlag) ||
    (event.from === "first-reliquary" && hasNorthGateAccess(normalized));
  if (!routeUnlocked) {
    return {
      ...normalized,
      lastEvent: "The route is still locked by story state.",
      lastSavedAt: now(),
    };
  }

  return {
    ...normalized,
    journey: {
      ...normalized.journey,
      activeRouteId: routeId,
      activeTravelEventId: event.id,
      unlockedRouteIds: uniqueStrings([...normalized.journey.unlockedRouteIds, routeId]),
    },
    mapFlags: uniqueStrings([...normalized.mapFlags, `route:${routeId}`]),
    lastEvent: `Travel started: ${event.title}.`,
    lastSavedAt: now(),
  };
}

export function resolveArpgTravelEvent(save: ArpgSaveState, choiceId: string): ArpgSaveState {
  const normalized = normalizeArpgSave(save);
  const event = normalized.journey.activeTravelEventId
    ? getArpgTravelEvent(normalized.journey.activeTravelEventId)
    : null;
  if (!event) {
    return {
      ...normalized,
      lastEvent: "No active road event is waiting.",
      lastSavedAt: now(),
    };
  }
  const choice = event.choices.find((entry) => entry.id === choiceId) ?? event.choices[0];
  const targetCity = ARPG_PRODUCTION_CONTENT.world.cities.find((city) => city.id === event.to);
  const rewarded = addRewardOutputs(normalized, [
    {
      id: choice.rewardCurrency,
      quantity: choice.rewardCurrency === "gold" ? 20 : 1,
    },
  ]);

  return {
    ...rewarded,
    discoveredCityIds: uniqueStrings([...rewarded.discoveredCityIds, event.to]),
    journey: {
      ...rewarded.journey,
      selectedCityId: event.to,
      selectedSubCityId: null,
      activeRouteId: null,
      activeTravelEventId: null,
      resolvedTravelEventIds: uniqueStrings([...rewarded.journey.resolvedTravelEventIds, event.id]),
      unlockedRouteIds: uniqueStrings([...rewarded.journey.unlockedRouteIds, event.routeId]),
    },
    reputations: {
      ...rewarded.reputations,
      [event.to]: (rewarded.reputations[event.to] ?? 0) + choice.reputationDelta,
    },
    mapFlags: uniqueStrings([...rewarded.mapFlags, `map:${event.to}`, `travel:${event.id}`]),
    storyFlags: addStoryFlags(rewarded, [`travel:${event.id}`, `map:${event.to}`]),
    lastEvent: `${choice.label}: reached ${targetCity?.name ?? event.to}. ${choice.summary}`,
    lastSavedAt: now(),
  };
}

export function acceptArpgQuest(save: ArpgSaveState, questId: string): ArpgSaveState {
  const normalized = normalizeArpgSave(save);
  const cityStory = ARPG_CITY_STORYLINES.find((storyline) => storyline.id === questId);
  const subCityArc = ARPG_SUBCITY_SIDE_ARCS.find((arc) => arc.id === questId);
  if (!cityStory && !subCityArc && !ARPG_QUESTS[questId]) {
    return {
      ...normalized,
      lastEvent: "That quest is not in the journal registry.",
      lastSavedAt: now(),
    };
  }
  const existing = normalized.questLog.find((entry) => entry.questId === questId);
  return {
    ...normalized,
    questLog: existing
      ? normalized.questLog.map((entry) =>
          entry.questId === questId ? { ...entry, status: "active" as const } : entry,
        )
      : [
          ...normalized.questLog,
          {
            questId,
            status: "active",
            stepIndex: 0,
            cityId: cityStory?.cityId ?? subCityArc?.cityId,
            subCityId: subCityArc?.subCityId,
          },
        ],
    lastEvent: `Accepted ${cityStory?.title ?? subCityArc?.title ?? ARPG_QUESTS[questId]?.title}.`,
    lastSavedAt: now(),
  };
}

export function advanceArpgQuest(
  save: ArpgSaveState,
  questId: string,
  storyFlag = `quest:${questId}:advanced`,
): ArpgSaveState {
  const normalized = normalizeArpgSave(save);
  return {
    ...normalized,
    questLog: normalized.questLog.map((entry) =>
      entry.questId === questId
        ? {
            ...entry,
            stepIndex: entry.stepIndex + 1,
            status: entry.stepIndex >= 2 ? "complete" : entry.status,
          }
        : entry,
    ),
    storyFlags: addStoryFlags(normalized, [storyFlag]),
    lastEvent: `Quest updated: ${questId}.`,
    lastSavedAt: now(),
  };
}

export function recruitArpgCompanion(save: ArpgSaveState, companionId: string): ArpgSaveState {
  const normalized = normalizeArpgSave(save);
  const companion = ARPG_COMPANION_ARCS.find((entry) => entry.id === companionId);
  if (!companion) {
    return {
      ...normalized,
      lastEvent: "That companion is not recruitable in MW6 yet.",
      lastSavedAt: now(),
    };
  }
  const current = normalized.companions[companionId] ?? {
    companionId,
    recruited: false,
    loyalty: 0,
    loyaltyQuestStatus: "locked" as const,
    perkUnlocked: false,
  };

  return {
    ...normalized,
    companions: {
      ...normalized.companions,
      [companionId]: {
        ...current,
        recruited: true,
        loyalty: Math.max(current.loyalty, 1),
        loyaltyQuestStatus: current.loyaltyQuestStatus === "locked" ? "active" : current.loyaltyQuestStatus,
        perkUnlocked: current.perkUnlocked || companionId === "oracle-guide",
      },
    },
    storyFlags: addStoryFlags(normalized, [`companion:${companionId}`]),
    lastEvent: `${companion.name} joined the road. ${companion.perkDetail}`,
    lastSavedAt: now(),
  };
}

export function craftArpgRecipe(save: ArpgSaveState, recipeId: string): ArpgSaveState {
  const normalized = normalizeArpgSave(save);
  const recipe = getArpgCraftingRecipe(recipeId);
  if (!recipe) {
    return {
      ...normalized,
      lastEvent: "That recipe is not in the forge registry.",
      lastSavedAt: now(),
    };
  }
  if (!normalized.crafting.unlockedRecipeIds.includes(recipe.id)) {
    return {
      ...normalized,
      lastEvent: `${recipe.name} is not unlocked yet.`,
      lastSavedAt: now(),
    };
  }

  let working = normalized;
  for (const cost of recipe.costs) {
    const result = consumeStack(working, cost.id, cost.quantity);
    if (result.consumed < cost.quantity) {
      return {
        ...normalized,
        lastEvent: `Need ${cost.quantity} ${cost.id} for ${recipe.name}.`,
        lastSavedAt: now(),
      };
    }
    working = {
      ...working,
      inventory: result.inventory,
      player: result.player,
    };
  }

  const rewarded = addRewardOutputs(working, recipe.outputs);
  return {
    ...rewarded,
    crafting: {
      ...rewarded.crafting,
      knownMaterialIds: uniqueStrings([
        ...rewarded.crafting.knownMaterialIds,
        ...recipe.outputs.map((output) => output.id),
      ]),
    },
    storyFlags: addStoryFlags(rewarded, [`crafted:${recipe.id}`]),
    lastEvent: `Crafted ${recipe.name}.`,
    lastSavedAt: now(),
  };
}

export function salvageArpgItem(
  save: ArpgSaveState,
  itemOrInstanceId: string | null | undefined,
): ArpgSaveState {
  const normalized = normalizeArpgSave(save);
  const entry = findInventoryEntry(normalized.inventory, itemOrInstanceId);
  const item = entry ? ARPG_ITEMS[entry.itemId] : null;
  if (!entry || !item || item.type !== "equipment") {
    return {
      ...normalized,
      lastEvent: "Select an equipment item before salvaging.",
      lastSavedAt: now(),
    };
  }
  if (Object.values(normalized.equipped).includes(entry.instanceId)) {
    return {
      ...normalized,
      lastEvent: "Unequip gear before salvaging it.",
      lastSavedAt: now(),
    };
  }
  const salvageRule = getArpgSalvageRule(entry.quality);
  const withoutItem = {
    ...normalized,
    inventory: normalized.inventory.filter((candidate) => candidate.instanceId !== entry.instanceId),
    selectedItemId: null,
    selectedItemInstanceId: normalized.equipped.weapon,
  };
  const rewarded = addRewardOutputs(withoutItem, salvageRule?.outputs ?? [{ id: "upgrade-shard", quantity: 1 }]);
  return {
    ...rewarded,
    storyFlags: addStoryFlags(rewarded, [`salvaged:${item.id}`]),
    lastEvent: `Salvaged ${item.name} for forge materials.`,
    lastSavedAt: now(),
  };
}

export function recordArpgReputation(
  save: ArpgSaveState,
  factionOrCityId: string,
  delta: number,
): ArpgSaveState {
  const normalized = normalizeArpgSave(save);
  const amount = Number.isFinite(delta) ? delta : 0;
  return {
    ...normalized,
    reputations: {
      ...normalized.reputations,
      [factionOrCityId]: (normalized.reputations[factionOrCityId] ?? 0) + amount,
    },
    storyFlags: addStoryFlags(normalized, [`reputation:${factionOrCityId}`]),
    lastEvent: `${factionOrCityId} reputation ${amount >= 0 ? "+" : ""}${amount}.`,
    lastSavedAt: now(),
  };
}

function requireEndgameAccess(save: ArpgSaveState): ArpgSaveState | null {
  if (hasEndgameAccess(save)) return null;
  return {
    ...save,
    lastEvent: "Endgame trials unlock after the north gate proof or finale flags.",
    lastSavedAt: now(),
  };
}

function rewardArpgEndgameTrack(save: ArpgSaveState, rewardTrackId: string): ArpgSaveState {
  const rewardTrack = getArpgEndgameRewardTrack(rewardTrackId);
  if (!rewardTrack) return save;
  return addRewardOutputs(save, [
    {
      id: rewardTrack.currencyId,
      quantity: rewardTrack.quantity,
    },
  ]);
}

export function selectArpgEndgameDifficulty(save: ArpgSaveState, difficultyTierId: string): ArpgSaveState {
  const normalized = normalizeArpgSave(save);
  const difficulty = ARPG_ENDGAME_CONTENT.difficultyTiers.find((tier) => tier.id === difficultyTierId);
  if (!difficulty) {
    return {
      ...normalized,
      lastEvent: "That endgame difficulty tier is not registered.",
      lastSavedAt: now(),
    };
  }
  return {
    ...normalized,
    endgame: {
      ...normalized.endgame,
      difficultyTierId: difficulty.id,
      unlocked: hasEndgameAccess(normalized),
    },
    lastEvent: `Endgame difficulty set to ${difficulty.label}.`,
    lastSavedAt: now(),
  };
}

export function startArpgEndgameDungeon(save: ArpgSaveState, dungeonId: string): ArpgSaveState {
  const normalized = normalizeArpgSave(save);
  const blocked = requireEndgameAccess(normalized);
  if (blocked) return blocked;
  const dungeon = getArpgChallengeDungeon(dungeonId);
  if (!dungeon) {
    return {
      ...normalized,
      lastEvent: "That challenge dungeon is not in the endgame registry.",
      lastSavedAt: now(),
    };
  }
  return {
    ...selectArpgRegion(normalized, dungeon.cityId),
    endgame: {
      ...normalized.endgame,
      unlocked: true,
      activeDungeonId: dungeon.id,
      activeTrialId: null,
      activeBossRematchId: null,
      activeArenaChallengeId: null,
      eliteAffixRotationId: dungeon.eliteAffixRotationId,
    },
    mapFlags: uniqueStrings([...normalized.mapFlags, `endgame:dungeon:${dungeon.id}`]),
    lastEvent: `Entered ${dungeon.name}: ${dungeon.objective}`,
    lastSavedAt: now(),
  };
}

export function completeArpgEndgameDungeon(
  save: ArpgSaveState,
  dungeonId?: string | null,
): ArpgSaveState {
  const normalized = normalizeArpgSave(save);
  const dungeon = getArpgChallengeDungeon(dungeonId ?? normalized.endgame.activeDungeonId ?? "");
  if (!dungeon) {
    return {
      ...normalized,
      lastEvent: "Start a challenge dungeon before completing it.",
      lastSavedAt: now(),
    };
  }
  const rewarded = rewardArpgEndgameTrack(normalized, dungeon.rewardTrackId);
  return {
    ...rewarded,
    endgame: {
      ...rewarded.endgame,
      unlocked: true,
      activeDungeonId: null,
      completedDungeonIds: uniqueStrings([...rewarded.endgame.completedDungeonIds, dungeon.id]),
      collectionGoalIds: uniqueStrings([...rewarded.endgame.collectionGoalIds, "city-reputation-completion"]),
      lastCompletedAt: now(),
    },
    reputations: {
      ...rewarded.reputations,
      [dungeon.cityId]: (rewarded.reputations[dungeon.cityId] ?? 0) + 2,
    },
    storyFlags: addStoryFlags(rewarded, [`endgame:dungeon:${dungeon.id}:complete`]),
    lastEvent: `Completed ${dungeon.name}. ${dungeon.roomCount} rooms cleared.`,
    lastSavedAt: now(),
  };
}

export function startArpgRelicTrial(save: ArpgSaveState, trialId: string): ArpgSaveState {
  const normalized = normalizeArpgSave(save);
  const blocked = requireEndgameAccess(normalized);
  if (blocked) return blocked;
  const trial = getArpgRelicTrial(trialId);
  if (!trial) {
    return {
      ...normalized,
      lastEvent: "That relic trial is not registered.",
      lastSavedAt: now(),
    };
  }
  return {
    ...selectArpgRegion(normalized, trial.cityId),
    endgame: {
      ...normalized.endgame,
      unlocked: true,
      activeDungeonId: null,
      activeTrialId: trial.id,
      activeBossRematchId: null,
      activeArenaChallengeId: null,
    },
    lastEvent: `Relic trial opened: ${trial.name}.`,
    lastSavedAt: now(),
  };
}

export function completeArpgRelicTrial(save: ArpgSaveState, trialId?: string | null): ArpgSaveState {
  const normalized = normalizeArpgSave(save);
  const trial = getArpgRelicTrial(trialId ?? normalized.endgame.activeTrialId ?? "");
  if (!trial) {
    return {
      ...normalized,
      lastEvent: "Start a relic trial before completing it.",
      lastSavedAt: now(),
    };
  }
  const rewarded = rewardArpgEndgameTrack(normalized, trial.rewardTrackId);
  return {
    ...rewarded,
    endgame: {
      ...rewarded.endgame,
      unlocked: true,
      activeTrialId: null,
      completedTrialIds: uniqueStrings([...rewarded.endgame.completedTrialIds, trial.id]),
      collectionGoalIds: uniqueStrings([...rewarded.endgame.collectionGoalIds, "trial-master"]),
      lastCompletedAt: now(),
    },
    storyFlags: addStoryFlags(rewarded, [`endgame:trial:${trial.id}:complete`]),
    lastEvent: `Completed ${trial.name}. ${trial.mechanic}`,
    lastSavedAt: now(),
  };
}

export function startArpgBossRematch(save: ArpgSaveState, rematchId: string): ArpgSaveState {
  const normalized = normalizeArpgSave(save);
  const blocked = requireEndgameAccess(normalized);
  if (blocked) return blocked;
  const rematch = getArpgBossRematch(rematchId);
  if (!rematch) {
    return {
      ...normalized,
      lastEvent: "That boss memory is not registered.",
      lastSavedAt: now(),
    };
  }
  return {
    ...normalized,
    endgame: {
      ...normalized.endgame,
      unlocked: true,
      activeDungeonId: null,
      activeTrialId: null,
      activeBossRematchId: rematch.id,
      activeArenaChallengeId: null,
    },
    lastEvent: `Boss memory opened: ${rematch.name}.`,
    lastSavedAt: now(),
  };
}

export function completeArpgBossRematch(save: ArpgSaveState, rematchId?: string | null): ArpgSaveState {
  const normalized = normalizeArpgSave(save);
  const rematch = getArpgBossRematch(rematchId ?? normalized.endgame.activeBossRematchId ?? "");
  if (!rematch) {
    return {
      ...normalized,
      lastEvent: "Start a boss rematch before completing it.",
      lastSavedAt: now(),
    };
  }
  const rewarded = rewardArpgEndgameTrack(normalized, rematch.rewardTrackId);
  return {
    ...rewarded,
    endgame: {
      ...rewarded.endgame,
      unlocked: true,
      activeBossRematchId: null,
      completedBossRematchIds: uniqueStrings([...rewarded.endgame.completedBossRematchIds, rematch.id]),
      collectionGoalIds: uniqueStrings([...rewarded.endgame.collectionGoalIds, "boss-memory-cycle"]),
      lastCompletedAt: now(),
    },
    codex: {
      ...rewarded.codex,
      revealedWeaknessEnemyIds: uniqueStrings([...rewarded.codex.revealedWeaknessEnemyIds, rematch.bossId]),
    },
    storyFlags: addStoryFlags(rewarded, [`endgame:boss:${rematch.id}:complete`]),
    lastEvent: `Completed ${rematch.name}. Unique memory: ${rematch.uniqueDrop}.`,
    lastSavedAt: now(),
  };
}

export function claimArpgTreasureMap(save: ArpgSaveState, mapId: string): ArpgSaveState {
  const normalized = normalizeArpgSave(save);
  const map = getArpgTreasureMap(mapId);
  if (!map) {
    return {
      ...normalized,
      lastEvent: "That treasure map is not registered.",
      lastSavedAt: now(),
    };
  }
  return {
    ...selectArpgRegion(normalized, map.cityId, map.subCityId),
    endgame: {
      ...normalized.endgame,
      unlocked: hasEndgameAccess(normalized),
      discoveredTreasureMapIds: uniqueStrings([...normalized.endgame.discoveredTreasureMapIds, map.id]),
    },
    mapFlags: uniqueStrings([...normalized.mapFlags, `treasure:${map.id}`]),
    lastEvent: `Treasure map discovered: ${map.name}.`,
    lastSavedAt: now(),
  };
}

export function completeArpgTreasureMap(save: ArpgSaveState, mapId: string): ArpgSaveState {
  const normalized = normalizeArpgSave(save);
  const map = getArpgTreasureMap(mapId);
  if (!map) {
    return {
      ...normalized,
      lastEvent: "That treasure map is not registered.",
      lastSavedAt: now(),
    };
  }
  const rewarded = rewardArpgEndgameTrack(normalized, map.rewardTrackId);
  return {
    ...rewarded,
    endgame: {
      ...rewarded.endgame,
      unlocked: hasEndgameAccess(rewarded),
      discoveredTreasureMapIds: uniqueStrings([...rewarded.endgame.discoveredTreasureMapIds, map.id]),
      completedTreasureMapIds: uniqueStrings([...rewarded.endgame.completedTreasureMapIds, map.id]),
      collectionGoalIds: uniqueStrings([...rewarded.endgame.collectionGoalIds, "subcity-secret-completion"]),
      lastCompletedAt: now(),
    },
    storyFlags: addStoryFlags(rewarded, [`endgame:treasure:${map.id}:complete`]),
    lastEvent: `Cleared ${map.name}.`,
    lastSavedAt: now(),
  };
}

export function startArpgArenaChallenge(save: ArpgSaveState, challengeId: string): ArpgSaveState {
  const normalized = normalizeArpgSave(save);
  const challenge = getArpgArenaChallenge(challengeId);
  if (!challenge) {
    return {
      ...normalized,
      lastEvent: "That arena challenge is not registered.",
      lastSavedAt: now(),
    };
  }
  return {
    ...normalized,
    endgame: {
      ...normalized.endgame,
      unlocked: hasEndgameAccess(normalized),
      activeDungeonId: null,
      activeTrialId: null,
      activeBossRematchId: null,
      activeArenaChallengeId: challenge.id,
    },
    lastEvent: `Arena started: ${challenge.label}.`,
    lastSavedAt: now(),
  };
}

export function completeArpgArenaChallenge(save: ArpgSaveState, challengeId?: string | null): ArpgSaveState {
  const normalized = normalizeArpgSave(save);
  const challenge = getArpgArenaChallenge(challengeId ?? normalized.endgame.activeArenaChallengeId ?? "");
  if (!challenge) {
    return {
      ...normalized,
      lastEvent: "Start an arena challenge before completing it.",
      lastSavedAt: now(),
    };
  }
  return {
    ...normalized,
    player: {
      ...normalized.player,
      gold: normalized.player.gold + 25,
    },
    endgame: {
      ...normalized.endgame,
      activeArenaChallengeId: null,
      completedArenaChallengeIds: uniqueStrings([...normalized.endgame.completedArenaChallengeIds, challenge.id]),
      collectionGoalIds: uniqueStrings([...normalized.endgame.collectionGoalIds, "arena-build-proving"]),
      lastCompletedAt: now(),
    },
    storyFlags: addStoryFlags(normalized, [`endgame:arena:${challenge.id}:complete`]),
    lastEvent: `Arena cleared: ${challenge.label}.`,
    lastSavedAt: now(),
  };
}

export function recordArpgCollectionGoal(save: ArpgSaveState, goalId: string): ArpgSaveState {
  const normalized = normalizeArpgSave(save);
  const goal = ARPG_ENDGAME_CONTENT.collectionGoals.find((entry) => entry.id === goalId);
  if (!goal) {
    return {
      ...normalized,
      lastEvent: "That collection goal is not registered.",
      lastSavedAt: now(),
    };
  }
  return {
    ...normalized,
    endgame: {
      ...normalized.endgame,
      collectionGoalIds: uniqueStrings([...normalized.endgame.collectionGoalIds, goal.id]),
    },
    storyFlags: addStoryFlags(normalized, [`endgame:goal:${goal.id}`]),
    lastEvent: `Collection goal recorded: ${goal.label}.`,
    lastSavedAt: now(),
  };
}

export function claimArpgCosmeticReward(save: ArpgSaveState, rewardId: string): ArpgSaveState {
  const normalized = normalizeArpgSave(save);
  const reward = ARPG_ENDGAME_CONTENT.cosmeticRewards.find((entry) => entry.id === rewardId);
  if (!reward) {
    return {
      ...normalized,
      lastEvent: "That cosmetic reward is not registered.",
      lastSavedAt: now(),
    };
  }
  return {
    ...normalized,
    endgame: {
      ...normalized.endgame,
      collectionGoalIds: uniqueStrings([...normalized.endgame.collectionGoalIds, reward.sourceGoalId]),
      cosmeticRewardIds: uniqueStrings([...normalized.endgame.cosmeticRewardIds, reward.id]),
    },
    character: {
      ...normalized.character,
      cosmeticAccent: reward.paletteAccent,
    },
    storyFlags: addStoryFlags(normalized, [`cosmetic:${reward.id}`]),
    lastEvent: `Cosmetic unlocked: ${reward.label}.`,
    lastSavedAt: now(),
  };
}

export function upgradeArpgItem(
  save: ArpgSaveState,
  itemOrInstanceId?: string | null,
): ArpgSaveState {
  const normalized = normalizeArpgSave(save);
  const target =
    findInventoryEntry(normalized.inventory, itemOrInstanceId) ??
    findInventoryEntry(normalized.inventory, normalized.selectedItemInstanceId) ??
    findInventoryEntry(normalized.inventory, normalized.equipped.weapon);
  const item = target ? ARPG_ITEMS[target.itemId] : null;
  if (!target || !item || item.type !== "equipment") {
    return {
      ...normalized,
      lastEvent: "Select equipment before using the forge.",
      lastSavedAt: now(),
    };
  }
  const maxUpgradeRank = getArpgArsenalUpgradeCap(target.quality);
  if (target.upgradeRank >= maxUpgradeRank) {
    return {
      ...normalized,
      lastEvent: `${item.name} is already tempered to +${maxUpgradeRank}.`,
      lastSavedAt: now(),
    };
  }

  const shardCost = 1 + Math.floor(target.upgradeRank / 2);
  const dustCost = target.upgradeRank >= 2 ? 1 : 0;
  const shardCount = normalized.inventory
    .filter((entry) => entry.itemId === "upgrade-shard")
    .reduce((total, entry) => total + entry.quantity, 0);
  const dustCount = normalized.inventory
    .filter((entry) => entry.itemId === "relic-dust")
    .reduce((total, entry) => total + entry.quantity, 0);

  if (shardCount < shardCost || dustCount < dustCost) {
    return {
      ...normalized,
      lastEvent: `Need ${shardCost} upgrade shard${shardCost > 1 ? "s" : ""}${
        dustCost ? " and relic dust" : ""
      } to temper ${item.name}.`,
      lastSavedAt: now(),
    };
  }

  const afterShards = consumeStack(normalized, "upgrade-shard", shardCost);
  const afterDust = dustCost
    ? consumeStack({ ...normalized, inventory: afterShards.inventory }, "relic-dust", dustCost)
    : { inventory: afterShards.inventory, consumed: 0 };
  const inventory = afterDust.inventory.map((entry) =>
    entry.instanceId === target.instanceId
      ? {
          ...entry,
          upgradeRank: clamp(entry.upgradeRank + 1, 0, maxUpgradeRank),
          affixes: Array.from(
            new Set([
              ...entry.affixes,
              (entry.upgradeRank >= 2 ? "resonance" : "might") as keyof ArpgStats,
            ]),
          ),
        }
      : entry,
  );

  return {
    ...normalized,
    inventory,
    selectedItemId: item.id,
    selectedItemInstanceId: target.instanceId,
    storyFlags: addStoryFlags(normalized, [`upgraded:${item.id}`, "upgraded:any"]),
    lastEvent: `Upgraded ${item.name} to +${target.upgradeRank + 1}.`,
    lastSavedAt: now(),
  };
}

export function unlockArpgSkill(save: ArpgSaveState, skillId: string): ArpgSaveState {
  const normalized = normalizeArpgSave(save);
  const skill = getSkillDefinition(skillId);
  if (!skill) return normalized;
  if (normalized.player.level < skill.unlockLevel) {
    return {
      ...normalized,
      lastEvent: `${skill.name} unlocks at level ${skill.unlockLevel}.`,
      lastSavedAt: now(),
    };
  }
  const unlockedSkills = Array.from(new Set([...normalized.player.unlockedSkills, skillId]));
  const equippedSkillIds =
    skill.kind === "active"
      ? Array.from(new Set([...normalized.player.equippedSkillIds, skillId])).slice(0, 2)
      : normalized.player.equippedSkillIds;
  const alreadyUnlocked = normalized.player.unlockedSkills.includes(skillId);
  const nextCharacter =
    skill.pathId === normalized.character.classPathId
      ? normalized.character
      : normalizeCharacterIdentity(
          {
            ...normalized.character,
            classPathId: skill.pathId,
            subclassId: getClassTree(skill.pathId).starterBuild.subclassId,
          },
          normalized.player,
        );

  return {
    ...normalized,
    character: nextCharacter,
    player: {
      ...normalized.player,
      classPathId: skill.pathId,
      unlockedSkills,
      equippedSkillIds,
    },
    storyFlags: addStoryFlags(normalized, [
      `skill:${skill.id}`,
      `class:${nextCharacter.classPathId}`,
      `subclass:${nextCharacter.subclassId}`,
    ]),
    lastEvent: alreadyUnlocked && skill.kind === "active" ? `Equipped ${skill.name}.` : `Unlocked ${skill.name}.`,
    lastSavedAt: now(),
  };
}

export function useArpgConsumable(save: ArpgSaveState, itemId: string): ArpgSaveState {
  const normalized = normalizeArpgSave(save);
  const item = ARPG_ITEMS[itemId];
  if (!item || item.type !== "consumable" || !hasItem(normalized, itemId)) {
    return {
      ...normalized,
      lastEvent: "No usable vial is ready.",
      lastSavedAt: now(),
    };
  }
  const afterConsume = consumeStack(normalized, itemId, 1);
  return {
    ...normalized,
    inventory: afterConsume.inventory,
    player: {
      ...normalized.player,
      hp: clamp(normalized.player.hp + (item.effect?.hp ?? 0), 1, normalized.player.maxHp),
      mana: clamp(
        normalized.player.mana + (item.effect?.mana ?? 0),
        0,
        normalized.player.maxMana,
      ),
    },
    selectedItemId: itemId,
    lastEvent: `Used ${item.name}.`,
    lastSavedAt: now(),
  };
}

export function advanceArpgStory(save: ArpgSaveState, storyFlag: string): ArpgSaveState {
  const normalized = normalizeArpgSave(save);
  const prologueStep = ARPG_PROLOGUE_FLOW_BY_FLAG[storyFlag];
  const quest =
    storyFlag.includes("upgraded") || storyFlag === "lore:forge-echo"
      ? "temper-a-relic"
      : storyFlag.includes("defeated")
        ? "quiet-the-warden"
        : normalized.player.activeQuestId;
  return {
    ...normalized,
    player: {
      ...normalized.player,
      activeQuestId: ARPG_QUESTS[quest] ? quest : normalized.player.activeQuestId,
    },
    storyFlags: addStoryFlags(normalized, [storyFlag]),
    world: {
      ...normalized.world,
      npcDialogueFlags: storyFlag.startsWith("npc:")
        ? Array.from(new Set([...normalized.world.npcDialogueFlags, storyFlag]))
        : normalized.world.npcDialogueFlags,
    },
    lastEvent:
      prologueStep
        ? `${prologueStep.title}: ${prologueStep.summary}`
        : storyFlag === "lore:gate-monolith"
        ? "The Gate Monolith yielded a warm map-fragment."
        : storyFlag === "lore:forge-echo"
          ? "The forge explains upgrade shards, pressure, and patient heat."
          : "The reliquary records the new memory.",
    lastSavedAt: now(),
  };
}

export function strikeArpgEnemy(save: ArpgSaveState, enemyId: string): ArpgSaveState {
  const normalized = normalizeArpgSave(save);
  const enemyDefinition = ARPG_ENEMIES[enemyId];
  const enemy = normalized.enemies[enemyId];
  const profile = getEnemyProfile(enemyId);
  if (!enemyDefinition || !enemy) return normalized;
  if (enemy.defeated) {
    return {
      ...normalized,
      lastEvent: `${enemyDefinition.name} is already quiet.`,
      lastSavedAt: now(),
    };
  }

  const distance = Math.hypot(
    normalized.player.x - enemyDefinition.position.x,
    normalized.player.z - enemyDefinition.position.z,
  );
  if (distance > ATTACK_REACH) {
    return {
      ...normalized,
      lastEvent: `Move closer to ${enemyDefinition.name} before striking.`,
      lastSavedAt: now(),
    };
  }
  if (
    enemyDefinition.requiresStoryFlags?.some((flag) => !normalized.storyFlags.includes(flag))
  ) {
    return {
      ...normalized,
      lastEvent: `${enemyDefinition.name} waits for the reliquary oath chain.`,
      lastSavedAt: now(),
    };
  }
  if (enemyDefinition.requiresUpgradedItem && !hasAnyUpgradedEquipment(normalized)) {
    return {
      ...normalized,
      lastEvent: `${enemyDefinition.name} ignores untempered gear. Upgrade first.`,
      lastSavedAt: now(),
    };
  }

  let baseSave = discoverEnemy(normalized, enemyId);
  const attack = resolveAttackDamage(baseSave, enemyId, null);
  const damage = attack.amount;
  const nextHp = Math.max(0, enemy.hp - damage);
  const defeated = nextHp === 0;
  const nextXp = defeated ? normalized.player.xp + enemyDefinition.xp : normalized.player.xp;
  const nextLevel = nextXp >= 95 ? 3 : nextXp >= 40 ? 2 : normalized.player.level;
  const playerDamage = defeated ? 0 : Math.max(1, (profile?.basicDamage ?? enemyDefinition.level * 3) - Math.floor(deriveArpgStats(baseSave).ward / 12));
  const phaseStatusId =
    !defeated && profile?.eliteModifierId && nextHp / enemyDefinition.maxHp <= (profile.phaseThreshold ?? 0)
      ? ARPG_ELITE_MODIFIERS[profile.eliteModifierId]?.statusId
      : undefined;
  const enemyStatuses = defeated
    ? activeStatuses(enemy.statuses)
    : applyStatus(
        applyStatus(enemy.statuses, attack.statusId, "player-basic"),
        phaseStatusId,
        profile?.eliteModifierId ?? enemyId,
      );
  const nextEnemyState: ArpgEnemyState = {
    ...enemy,
    hp: nextHp,
    defeated,
    intent: defeated ? "defeated" : "recover",
    nextIntentAt: defeated ? undefined : now() + (profile?.recoverMs ?? 600),
    phase:
      profile?.phaseThreshold && nextHp / enemyDefinition.maxHp <= profile.phaseThreshold ? 2 : enemy.phase ?? 1,
    statuses: enemyStatuses,
    lastDamage: damage,
    lastStruckAt: now(),
  };
  const playerStatuses = activeStatuses(baseSave.combat.playerStatuses);
  const events = [
    combatEvent("damage", `${attack.skillName ?? "Basic strike"} hit ${enemyDefinition.name} for ${damage}.`, {
      enemyId,
      damageType: attack.damageType,
      amount: damage,
    }),
    ...(attack.statusId
      ? [
          combatEvent("status", `${enemyDefinition.name} gained ${ARPG_STATUS_EFFECTS[attack.statusId]?.label}.`, {
            enemyId,
            statusId: attack.statusId,
          }),
        ]
      : []),
    ...(phaseStatusId
      ? [
          combatEvent("status", `${enemyDefinition.name} entered ${ARPG_STATUS_EFFECTS[phaseStatusId]?.label}.`, {
            enemyId,
            statusId: phaseStatusId,
          }),
        ]
      : []),
    ...(defeated
      ? [
          combatEvent("defeat", `${enemyDefinition.name} defeated.`, {
            enemyId,
            amount: enemyDefinition.xp,
          }),
        ]
      : []),
  ];
  let nextSave: ArpgSaveState = {
    ...baseSave,
    player: {
      ...baseSave.player,
      hp: defeated
        ? baseSave.player.hp
        : clamp(baseSave.player.hp - playerDamage, 1, baseSave.player.maxHp),
      xp: nextXp,
      level: Math.max(baseSave.player.level, nextLevel),
      gold: defeated ? baseSave.player.gold + enemyDefinition.gold : baseSave.player.gold,
      activeQuestId: defeated ? "quiet-the-warden" : baseSave.player.activeQuestId,
    },
    enemies: {
      ...baseSave.enemies,
      [enemyId]: nextEnemyState,
    },
    world: {
      ...baseSave.world,
      defeatedEnemyIds: defeated
        ? Array.from(new Set([...baseSave.world.defeatedEnemyIds, enemyId]))
        : baseSave.world.defeatedEnemyIds,
    },
    storyFlags: defeated
      ? addStoryFlags(baseSave, [`defeated:${enemyId}`])
      : baseSave.storyFlags,
    combat: {
      ...pushCombatEvents(baseSave, events),
      playerStatuses,
      targetEnemyId: defeated ? null : enemyId,
      discoveredEnemyCodexIds: baseSave.combat.discoveredEnemyCodexIds.includes(enemyId)
        ? baseSave.combat.discoveredEnemyCodexIds
        : [...baseSave.combat.discoveredEnemyCodexIds, enemyId],
    },
    lastEvent: defeated
      ? `${enemyDefinition.name} dissolved into safe amber dust.`
      : `Struck ${enemyDefinition.name} for ${damage}.`,
    lastSavedAt: now(),
  };

  if (defeated) {
    for (const drop of enemyDefinition.drops) {
      nextSave = collectArpgItem(nextSave, drop.itemId, `drop:${enemyId}`);
    }
    nextSave = {
      ...nextSave,
      lastEvent: `${enemyDefinition.name} defeated. XP +${enemyDefinition.xp}, gold +${enemyDefinition.gold}.`,
      lastSavedAt: now(),
    };
  }

  return nextSave;
}

export function targetArpgEnemy(save: ArpgSaveState, enemyId: string | null): ArpgSaveState {
  const normalized = normalizeArpgSave(save);
  if (enemyId && (!ARPG_ENEMIES[enemyId] || normalized.enemies[enemyId]?.defeated)) {
    return normalized;
  }
  const nextSave = enemyId ? discoverEnemy(normalized, enemyId) : normalized;
  const enemy = enemyId ? nextSave.enemies[enemyId] : null;
  const enemyDefinition = enemyId ? ARPG_ENEMIES[enemyId] : null;
  const distance =
    enemy && enemyDefinition
      ? Math.hypot(nextSave.player.x - enemyDefinition.position.x, nextSave.player.z - enemyDefinition.position.z)
      : 0;
  return {
    ...nextSave,
    enemies:
      enemy && enemyId
        ? {
            ...nextSave.enemies,
            [enemyId]: setEnemyIntentForDistance(enemy, enemyId, distance),
          }
        : nextSave.enemies,
    combat: {
      ...nextSave.combat,
      targetEnemyId: enemyId,
      latestEvents: enemyDefinition
        ? [
            combatEvent("codex", `Targeted ${enemyDefinition.name}.`, { enemyId: enemyId ?? undefined }),
            ...nextSave.combat.latestEvents,
          ].slice(0, COMBAT_EVENT_LIMIT)
        : nextSave.combat.latestEvents,
    },
    lastEvent: enemyDefinition ? `Targeted ${enemyDefinition.name}.` : "Target cleared.",
    lastSavedAt: now(),
  };
}

export function useArpgSkill(
  save: ArpgSaveState,
  skillId?: string | null,
  enemyId?: string | null,
): ArpgSaveState {
  const normalized = normalizeArpgSave(save);
  const selectedSkillId =
    skillId ??
    normalized.player.equippedSkillIds
      .map((id) => getSkillDefinition(id))
      .find((skill) => skill?.kind === "active")?.id ??
    null;
  const skill = selectedSkillId ? getSkillDefinition(selectedSkillId) : null;
  if (!selectedSkillId || !skill || skill.kind !== "active") {
    return {
      ...normalized,
      lastEvent: "No active skill is ready on the hotbar.",
      lastSavedAt: now(),
    };
  }
  if (!normalized.player.unlockedSkills.includes(selectedSkillId)) {
    return {
      ...normalized,
      lastEvent: `${skill.name} is not unlocked yet.`,
      lastSavedAt: now(),
    };
  }
  const timestamp = now();
  const readyAt = normalized.combat.cooldowns[selectedSkillId] ?? 0;
  if (readyAt > timestamp) {
    return {
      ...normalized,
      combat: {
        ...pushCombatEvents(normalized, [
          combatEvent("cooldown", `${skill.name} ready in ${Math.ceil((readyAt - timestamp) / 1000)}s.`, {
            skillId: selectedSkillId,
          }),
        ]),
      },
      lastEvent: `${skill.name} is cooling down.`,
      lastSavedAt: timestamp,
    };
  }
  const targetId = enemyId ?? normalized.combat.targetEnemyId ?? nearestLiveEnemyId(normalized);
  if (!targetId) {
    return {
      ...normalized,
      lastEvent: "No enemy is in sight for that skill.",
      lastSavedAt: timestamp,
    };
  }
  const prepared: ArpgSaveState = {
    ...normalized,
    player: {
      ...normalized.player,
      equippedSkillIds: uniqueStrings([
        selectedSkillId,
        ...normalized.player.equippedSkillIds.filter((id) => id !== selectedSkillId),
      ]).slice(0, 2),
    },
  };
  const result = strikeArpgEnemy(prepared, targetId);
  const applied = result.lastEvent !== normalized.lastEvent && !/Move closer|waits|ignores/.test(result.lastEvent);
  return {
    ...result,
    combat: {
      ...result.combat,
      cooldowns: applied
        ? {
            ...result.combat.cooldowns,
            [selectedSkillId]: timestamp + Math.max(650, skill.cooldownMs),
          }
        : result.combat.cooldowns,
    },
    lastEvent: applied ? `${skill.name}: ${result.lastEvent}` : result.lastEvent,
    lastSavedAt: now(),
  };
}

export function dodgeArpgPlayer(save: ArpgSaveState, vector?: ArpgMoveVector | null): ArpgSaveState {
  const normalized = normalizeArpgSave(save);
  const timestamp = now();
  if (normalized.combat.lastDodgedAt && timestamp - normalized.combat.lastDodgedAt < DODGE_COOLDOWN_MS) {
    return {
      ...normalized,
      combat: {
        ...pushCombatEvents(normalized, [
          combatEvent("cooldown", "Dodge is recovering.", { skillId: "dodge" }),
        ]),
      },
      lastEvent: "Dodge is recovering.",
      lastSavedAt: timestamp,
    };
  }
  const dodgeVector = vector ?? { x: 0.8, z: 0, label: "east" };
  const moved = moveArpgPlayer(normalized, {
    x: dodgeVector.x * 1.35,
    z: dodgeVector.z * 1.35,
    label: dodgeVector.label ?? "dodge",
  });
  return {
    ...moved,
    combat: {
      ...pushCombatEvents(moved, [
        combatEvent("dodge", `Dodged ${dodgeVector.label ?? "clear"}.`, { skillId: "dodge" }),
      ]),
      playerStatuses: applyStatus(moved.combat.playerStatuses, "guard", "dodge"),
      lastDodgedAt: timestamp,
    },
    lastEvent: `Dodged ${dodgeVector.label ?? "clear"} and raised guard.`,
    lastSavedAt: timestamp,
  };
}

export function resetArpgSave() {
  return createDefaultArpgSave();
}
