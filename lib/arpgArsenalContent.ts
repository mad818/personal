import arsenalContent from "@/lib/arpgArsenalContent.json";
import { ARPG_ARMORY_ECONOMY_CONTENT } from "@/lib/arpgArmoryEconomyContent";
import type { ArpgEquipmentSlot, ArpgItemQuality, ArpgStats } from "@/lib/arpgGame";

export type ArpgArsenalDamageType =
  | "physical"
  | "ember"
  | "frost"
  | "poison"
  | "bleed"
  | "curse"
  | "holy"
  | "void";

export interface ArpgArsenalCost {
  id: string;
  quantity: number;
}

export interface ArpgArsenalWeaponTemplate {
  id: string;
  familyId: string;
  name: string;
  slot: ArpgEquipmentSlot;
  damageType: ArpgArsenalDamageType;
  basePower: number;
  statWeights: ArpgStats;
  classAffinity: string[];
  iconFrame: number;
  upgradeTrack: string;
  dropSources: string[];
}

export interface ArpgArsenalQualityRule {
  id: ArpgItemQuality;
  label: string;
  affixCount: number;
  socketCount: number;
  upgradeCap: number;
  statBudget: number;
  dropWeight: number;
  color: string;
  overlayFrame: number;
  comparisonCopy: string;
  salvageOutput: ArpgArsenalCost[];
}

export interface ArpgNamedWeaponCard {
  id: string;
  itemId: string;
  name: string;
  familyId: string;
  quality: ArpgItemQuality;
  level: number;
  upgradeRank: number;
  damageType: ArpgArsenalDamageType;
  affixes: Array<keyof ArpgStats>;
  socketCount: number;
  cardFrame: number;
  source: string;
  lore: string;
}

export interface ArpgArsenalVfxFrame {
  id: string;
  label: string;
  kind: "drop" | "upgrade" | "salvage";
  frame: number;
  reducedMotionFrame: number;
  color: string;
}

export interface ArpgArsenalContent {
  schemaVersion: "mw6-arsenal-visual-itemization-v1";
  title: string;
  summary: string;
  weaponItemTemplates: ArpgArsenalWeaponTemplate[];
  qualityRules: ArpgArsenalQualityRule[];
  namedWeaponCards: ArpgNamedWeaponCard[];
  vfxFrames: ArpgArsenalVfxFrame[];
}

export interface ArpgComparableItem {
  id: string;
  itemId?: string;
  familyId?: string;
  quality: ArpgItemQuality;
  level: number;
  upgradeRank: number;
  stats?: Partial<ArpgStats>;
  affixes?: Array<keyof ArpgStats>;
}

export const ARPG_ARSENAL_CONTENT = arsenalContent as ArpgArsenalContent;

export const ARPG_ARSENAL_SUMMARY = {
  weaponTemplateCount: ARPG_ARSENAL_CONTENT.weaponItemTemplates.length,
  qualityRuleCount: ARPG_ARSENAL_CONTENT.qualityRules.length,
  namedWeaponCardCount: ARPG_ARSENAL_CONTENT.namedWeaponCards.length,
  vfxFrameCount: ARPG_ARSENAL_CONTENT.vfxFrames.length,
};

export function getArpgArsenalWeaponTemplate(idOrFamilyId: string | null | undefined) {
  if (!idOrFamilyId) return null;
  return (
    ARPG_ARSENAL_CONTENT.weaponItemTemplates.find(
      (template) => template.id === idOrFamilyId || template.familyId === idOrFamilyId,
    ) ?? null
  );
}

export function getArpgArsenalNamedWeapon(itemId: string | null | undefined) {
  if (!itemId) return null;
  return (
    ARPG_ARSENAL_CONTENT.namedWeaponCards.find(
      (weapon) => weapon.itemId === itemId || weapon.id === itemId,
    ) ?? null
  );
}

export function getArpgArsenalQualityRule(quality: string | null | undefined) {
  return (
    ARPG_ARSENAL_CONTENT.qualityRules.find((rule) => rule.id === quality) ??
    ARPG_ARSENAL_CONTENT.qualityRules[0]
  );
}

export function getArpgArsenalVisualForItem(itemId: string | null | undefined) {
  const named = getArpgArsenalNamedWeapon(itemId);
  if (!named) return null;
  const template = getArpgArsenalWeaponTemplate(named.familyId);
  const quality = getArpgArsenalQualityRule(named.quality);
  return {
    named,
    template,
    quality,
    iconFrame: template?.iconFrame ?? 0,
    overlayFrame: quality.overlayFrame,
    cardFrame: named.cardFrame,
  };
}

export function getArpgArsenalUpgradeCap(quality: string | null | undefined) {
  return getArpgArsenalQualityRule(quality)?.upgradeCap ?? 5;
}

export function getArpgArsenalAffixCount(quality: string | null | undefined) {
  return getArpgArsenalQualityRule(quality)?.affixCount ?? 0;
}

export function getArpgArsenalComparison(item: ArpgComparableItem | null | undefined) {
  if (!item) return null;
  const named = getArpgArsenalNamedWeapon(item.itemId ?? item.id);
  const template = getArpgArsenalWeaponTemplate(item.familyId ?? named?.familyId ?? null);
  const quality = getArpgArsenalQualityRule(item.quality);
  const basePower = template?.basePower ?? 8;
  const statScore = Object.values(item.stats ?? {}).reduce(
    (total, value) => total + (Number.isFinite(value) ? Number(value) : 0),
    0,
  );
  const affixScore = (item.affixes?.length ?? 0) * 2;
  const upgradeScore = Math.max(0, item.upgradeRank) * 3;
  const powerScore = Math.round(basePower + quality.statBudget + statScore + affixScore + upgradeScore);
  const economyQuality =
    ARPG_ARMORY_ECONOMY_CONTENT.qualities.find((entry) => entry.id === item.quality) ?? null;

  return {
    named,
    template,
    quality,
    economyQuality,
    powerScore,
    upgradeRemaining: Math.max(0, quality.upgradeCap - item.upgradeRank),
    socketCount: quality.socketCount,
    comparisonCopy: `${quality.comparisonCopy} Power ${powerScore}, ${quality.socketCount} socket${
      quality.socketCount === 1 ? "" : "s"
    }, cap +${quality.upgradeCap}.`,
    salvageSummary: quality.salvageOutput
      .map((output) => `${output.quantity} ${output.id.replace(/-/g, " ")}`)
      .join(", "),
  };
}

export function getArpgArsenalDropPreview(quality: ArpgItemQuality) {
  const rule = getArpgArsenalQualityRule(quality);
  return (
    ARPG_ARSENAL_CONTENT.vfxFrames.find((frame) => frame.id === `loot-burst-${rule.id}`) ??
    ARPG_ARSENAL_CONTENT.vfxFrames[0]
  );
}
