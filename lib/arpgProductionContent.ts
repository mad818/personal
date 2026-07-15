import productionContent from "@/lib/arpgProductionContent.json";

export type ArpgProductionTone = "heroic-adventure";
export type ArpgProductionCombatModel = "real-time-arpg";

export interface ArpgProductionSubCity {
  id: string;
  name: string;
  districtRole: string;
  localStory: string;
  microFactions: string[];
  enemies: string[];
  miniBoss: string;
  gearDrop: string;
}

export interface ArpgProductionCity {
  id: string;
  name: string;
  coreFantasy: string;
  campaignRole: string;
  levelRange: [number, number];
  rulerPressure: string;
  factions: string[];
  enemyBiomes: string[];
  visualTileset: string;
  musicMood: string;
  subCities: ArpgProductionSubCity[];
}

export interface ArpgProductionRoute {
  from: string;
  to: string;
  unlockFlag: string;
}

export interface ArpgProductionAct {
  id: string;
  title: string;
  levelRange: [number, number];
  summary: string;
  requiredCities: string[];
  boss: string;
  saveFlags: string[];
}

export interface ArpgProductionRace {
  id: string;
  name: string;
  statBias: string[];
  passive: string;
  cityHooks: string[];
  questHook: string;
}

export interface ArpgProductionClass {
  id: string;
  name: string;
  resource: "focus" | "mana" | "stamina";
  role: string;
  subclasses: [string, string];
  starterActive: string;
  starterPassive: string;
}

export interface ArpgProductionCompanion {
  id: string;
  name: string;
  role: string;
  perk: string;
  loyaltyQuest: string;
  homeCity: string;
}

export interface ArpgProductionContent {
  schemaVersion: "mw6-bible-foundation-v1";
  gameTitle: "Aether Reliquary";
  tone: ArpgProductionTone;
  combatModel: ArpgProductionCombatModel;
  world: {
    startingZoneId: string;
    finalRegionId: string;
    cities: ArpgProductionCity[];
    routes: ArpgProductionRoute[];
  };
  campaign: {
    acts: ArpgProductionAct[];
  };
  character: {
    races: ArpgProductionRace[];
    classes: ArpgProductionClass[];
  };
  systems: {
    enemyFamilies: string[];
    traits: string[];
    buffs: string[];
    debuffs: string[];
    weaponFamilies: string[];
    gearQualities: string[];
    gearSlots: string[];
    damageTypes: string[];
    currencies: string[];
  };
  companions: ArpgProductionCompanion[];
}

export const ARPG_PRODUCTION_CONTENT =
  productionContent as ArpgProductionContent;

export const ARPG_PRODUCTION_MAJOR_CITY_COUNT =
  ARPG_PRODUCTION_CONTENT.world.cities.length;

export const ARPG_PRODUCTION_SUB_CITY_COUNT =
  ARPG_PRODUCTION_CONTENT.world.cities.reduce(
    (count, city) => count + city.subCities.length,
    0,
  );

export const ARPG_PRODUCTION_SCHEMA_VERSION =
  ARPG_PRODUCTION_CONTENT.schemaVersion;
