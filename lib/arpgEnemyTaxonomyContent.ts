import enemyTaxonomyContent from "@/lib/arpgEnemyTaxonomyContent.json";
import { ARPG_PRODUCTION_CONTENT } from "@/lib/arpgProductionContent";

export type ArpgDamageType =
  | "physical"
  | "ember"
  | "frost"
  | "poison"
  | "bleed"
  | "curse"
  | "holy"
  | "void";

export interface ArpgEnemyTraitDefinition {
  id: string;
  summary: string;
}

export interface ArpgEnemyFamilyRule {
  id: string;
  traits: string[];
  weaknesses: string[];
  resistances: string[];
  tactic: string;
  lootTheme: string;
}

export interface ArpgEnemyArchetypeTemplate {
  id: string;
  traits: string[];
  role: string;
  telegraphMs: number;
}

export interface ArpgUniqueEnemyDefinition {
  id: string;
  name: string;
  familyId: string;
  phaseCount?: number;
  uniqueDrop: string;
  actId?: string;
  regionId?: string;
}

export interface ArpgEnemyTaxonomyContent {
  schemaVersion: "mw6-enemy-taxonomy-v1";
  traits: ArpgEnemyTraitDefinition[];
  buffs: ArpgEnemyTraitDefinition[];
  debuffs: ArpgEnemyTraitDefinition[];
  familyRules: ArpgEnemyFamilyRule[];
  archetypeTemplates: ArpgEnemyArchetypeTemplate[];
  actBosses: ArpgUniqueEnemyDefinition[];
  finalBossForms: Array<{
    id: string;
    name: string;
    mechanic: string;
  }>;
  worldBosses: ArpgUniqueEnemyDefinition[];
  eliteModifiers: Array<{
    id: string;
    traitIds: string[];
    buffIds: string[];
    rewardMultiplier: number;
  }>;
}

export interface ArpgRegionalEnemyArchetype {
  id: string;
  cityId: string;
  subCityId: string;
  familyId: string;
  templateId: string;
  name: string;
  traitIds: string[];
  weaknessIds: string[];
  resistanceIds: string[];
  tactic: string;
  lootTheme: string;
  codexText: string;
}

export interface ArpgSubCityChampion {
  id: string;
  cityId: string;
  subCityId: string;
  name: string;
  familyId: string;
  traitIds: string[];
  phaseCount: number;
  uniqueDrop: string;
  codexText: string;
}

export interface ArpgCityBoss {
  id: string;
  cityId: string;
  name: string;
  familyId: string;
  phaseCount: number;
  uniqueDrop: string;
  unlockFlag: string;
}

export const ARPG_ENEMY_TAXONOMY_CONTENT =
  enemyTaxonomyContent as ArpgEnemyTaxonomyContent;

const familyRuleById = new Map(
  ARPG_ENEMY_TAXONOMY_CONTENT.familyRules.map((family) => [family.id, family]),
);

const archetypeTemplates = ARPG_ENEMY_TAXONOMY_CONTENT.archetypeTemplates;

const slug = (value: string) =>
  value
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const ARPG_REGIONAL_ENEMY_ARCHETYPES: ArpgRegionalEnemyArchetype[] =
  ARPG_PRODUCTION_CONTENT.world.cities.flatMap((city, cityIndex) =>
    city.subCities.map((subCity, subCityIndex) => {
      const familyId = subCity.enemies[0] ?? "beasts";
      const family =
        familyRuleById.get(familyId) ??
        ARPG_ENEMY_TAXONOMY_CONTENT.familyRules[0];
      const template =
        archetypeTemplates[
          (cityIndex + subCityIndex) % archetypeTemplates.length
        ];

      return {
        id: `${subCity.id}-${template.id}`,
        cityId: city.id,
        subCityId: subCity.id,
        familyId,
        templateId: template.id,
        name: `${subCity.name} ${template.role}`,
        traitIds: Array.from(new Set([...family.traits, ...template.traits])),
        weaknessIds: family.weaknesses,
        resistanceIds: family.resistances,
        tactic: family.tactic,
        lootTheme: family.lootTheme,
        codexText: `${subCity.localStory} The local ${familyId.replace(/-/g, " ")} fight as ${template.role}s.`,
      };
    }),
  );

export const ARPG_SUBCITY_CHAMPIONS: ArpgSubCityChampion[] =
  ARPG_PRODUCTION_CONTENT.world.cities.flatMap((city) =>
    city.subCities.map((subCity) => {
      const familyId = subCity.enemies[0] ?? "wandering-champions";
      const family =
        familyRuleById.get(familyId) ??
        ARPG_ENEMY_TAXONOMY_CONTENT.familyRules[0];

      return {
        id: `${subCity.id}-champion`,
        cityId: city.id,
        subCityId: subCity.id,
        name: subCity.miniBoss,
        familyId,
        traitIds: Array.from(
          new Set([...family.traits, "elite", "city-bound"]),
        ),
        phaseCount: familyId === "world-bosses" ? 4 : 2,
        uniqueDrop: subCity.gearDrop,
        codexText: `${subCity.miniBoss} anchors ${subCity.name}; weakness notes reveal after observation or defeat.`,
      };
    }),
  );

export const ARPG_CITY_BOSSES: ArpgCityBoss[] =
  ARPG_PRODUCTION_CONTENT.world.cities.map((city) => {
    const finaleSubCity = city.subCities[city.subCities.length - 1];
    const familyId = finaleSubCity?.enemies[0] ?? "wandering-champions";
    return {
      id: `${city.id}-city-boss`,
      cityId: city.id,
      name: finaleSubCity?.miniBoss ?? `${city.name} Champion`,
      familyId,
      phaseCount:
        city.id === ARPG_PRODUCTION_CONTENT.world.finalRegionId ? 4 : 3,
      uniqueDrop: finaleSubCity?.gearDrop ?? `${city.name} Relic`,
      unlockFlag: `city:${slug(city.id)}-boss-defeated`,
    };
  });

export const ARPG_ENEMY_TAXONOMY_SUMMARY = {
  familyCount: ARPG_ENEMY_TAXONOMY_CONTENT.familyRules.length,
  regionalArchetypeCount: ARPG_REGIONAL_ENEMY_ARCHETYPES.length,
  subCityChampionCount: ARPG_SUBCITY_CHAMPIONS.length,
  cityBossCount: ARPG_CITY_BOSSES.length,
  actBossCount: ARPG_ENEMY_TAXONOMY_CONTENT.actBosses.length,
  finalFormCount: ARPG_ENEMY_TAXONOMY_CONTENT.finalBossForms.length,
  worldBossCount: ARPG_ENEMY_TAXONOMY_CONTENT.worldBosses.length,
};

export function getArpgEnemyFamilyRule(familyId: string) {
  return familyRuleById.get(familyId) ?? null;
}

export function getArpgSubCityChampion(subCityId: string) {
  return (
    ARPG_SUBCITY_CHAMPIONS.find(
      (champion) => champion.subCityId === subCityId,
    ) ?? null
  );
}
