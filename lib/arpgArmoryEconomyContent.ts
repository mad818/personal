import armoryEconomyContent from "@/lib/arpgArmoryEconomyContent.json";
import { ARPG_PRODUCTION_CONTENT } from "@/lib/arpgProductionContent";

export interface ArpgArmoryCost {
  id: string;
  quantity: number;
}

export interface ArpgWeaponFamilyDefinition {
  id: string;
  speed: number;
  range: number;
  staminaCost: number;
  critProfile: string;
  classAffinity: string[];
  animationNeed: string;
  upgradePath: string;
}

export interface ArpgGearQualityRule {
  id: string;
  affixCount: number;
  socketCount: number;
  upgradeCap: number;
}

export interface ArpgCraftingRecipeDefinition {
  id: string;
  name: string;
  costs: ArpgArmoryCost[];
  outputs: ArpgArmoryCost[];
  unlocksAt: string;
}

export interface ArpgSalvageRuleDefinition {
  id: string;
  outputs: ArpgArmoryCost[];
}

export interface ArpgArmoryEconomyContent {
  schemaVersion: "mw6-armory-economy-v1";
  weaponFamilies: ArpgWeaponFamilyDefinition[];
  gearSlots: Array<{
    id: string;
    summary: string;
  }>;
  qualities: ArpgGearQualityRule[];
  armorFamilies: Array<{
    id: string;
    armor: number;
    ward: number;
    speed: number;
    spriteSilhouette: string;
    dyeSupport: boolean;
    setBonus: string;
  }>;
  affixPools: Array<{
    id: string;
    stat: string;
    range: [number, number];
    summary: string;
  }>;
  runes: Array<{
    id: string;
    damageType: string;
    summary: string;
  }>;
  setBonusTemplates: Array<{
    id: string;
    pieces: number;
    summary: string;
  }>;
  uniqueRelics: Array<{
    id: string;
    name: string;
    source: string;
    summary: string;
  }>;
  craftingRecipes: ArpgCraftingRecipeDefinition[];
  salvageRules: ArpgSalvageRuleDefinition[];
  vendorArchetypes: Array<{
    id: string;
    cityId: string;
    discountFaction: string;
  }>;
  currencies: Array<{
    id: string;
    source: string;
  }>;
}

export interface ArpgCityGearReward {
  id: string;
  cityId: string;
  subCityId: string;
  name: string;
  source: string;
  recommendedQuality: string;
}

export interface ArpgCityArmorSet {
  id: string;
  cityId: string;
  name: string;
  armorFamilyId: string;
  setBonus: string;
  vendorId: string;
}

export const ARPG_ARMORY_ECONOMY_CONTENT =
  armoryEconomyContent as ArpgArmoryEconomyContent;

const armorFamilies = ARPG_ARMORY_ECONOMY_CONTENT.armorFamilies;

export const ARPG_CITY_GEAR_REWARDS: ArpgCityGearReward[] =
  ARPG_PRODUCTION_CONTENT.world.cities.flatMap((city, cityIndex) =>
    city.subCities.map((subCity, subCityIndex) => ({
      id: `${subCity.id}-gear-reward`,
      cityId: city.id,
      subCityId: subCity.id,
      name: subCity.gearDrop,
      source: subCity.miniBoss,
      recommendedQuality:
        cityIndex > 9 ? "ancient" : cityIndex > 6 ? "relic" : subCityIndex === 3 ? "epic" : "rare",
    })),
  );

export const ARPG_CITY_ARMOR_SETS: ArpgCityArmorSet[] = ARPG_PRODUCTION_CONTENT.world.cities.map(
  (city, index) => {
    const armor = armorFamilies[index % armorFamilies.length];
    const vendor =
      ARPG_ARMORY_ECONOMY_CONTENT.vendorArchetypes.find((entry) => entry.cityId === city.id) ??
      ARPG_ARMORY_ECONOMY_CONTENT.vendorArchetypes[0];

    return {
      id: `${city.id}-set`,
      cityId: city.id,
      name: `${city.name} ${armor.spriteSilhouette.replace(/-/g, " ")}`,
      armorFamilyId: armor.id,
      setBonus: armor.setBonus,
      vendorId: vendor.id,
    };
  },
);

export const ARPG_ARMORY_ECONOMY_SUMMARY = {
  weaponFamilyCount: ARPG_ARMORY_ECONOMY_CONTENT.weaponFamilies.length,
  gearSlotCount: ARPG_ARMORY_ECONOMY_CONTENT.gearSlots.length,
  qualityCount: ARPG_ARMORY_ECONOMY_CONTENT.qualities.length,
  armorFamilyCount: ARPG_ARMORY_ECONOMY_CONTENT.armorFamilies.length,
  craftingRecipeCount: ARPG_ARMORY_ECONOMY_CONTENT.craftingRecipes.length,
  cityGearRewardCount: ARPG_CITY_GEAR_REWARDS.length,
  cityArmorSetCount: ARPG_CITY_ARMOR_SETS.length,
};

export function getArpgCraftingRecipe(recipeId: string) {
  return ARPG_ARMORY_ECONOMY_CONTENT.craftingRecipes.find((recipe) => recipe.id === recipeId) ?? null;
}

export function getArpgSalvageRule(quality: string) {
  return ARPG_ARMORY_ECONOMY_CONTENT.salvageRules.find((rule) => rule.id === quality) ?? null;
}

export function getArpgWeaponFamily(familyId: string) {
  return ARPG_ARMORY_ECONOMY_CONTENT.weaponFamilies.find((family) => family.id === familyId) ?? null;
}
