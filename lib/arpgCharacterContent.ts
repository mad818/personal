import characterContent from "@/lib/arpgCharacterContent.json";
import type { ArpgSkillKind, ArpgStats } from "@/lib/arpgGame";

export type ArpgCharacterContentVersion = "mw6-character-foundation-v1";
export type ArpgClassResource = "focus" | "mana" | "stamina";

export interface ArpgCharacterDefaults {
  characterName: string;
  raceId: string;
  originId: string;
  classPathId: string;
  subclassId: string;
  portraitId: string;
  paletteId: string;
}

export interface ArpgPaletteDefinition {
  id: string;
  label: string;
  lineageId: string;
  primary: string;
  secondary: string;
  accent: string;
}

export interface ArpgPortraitDefinition {
  id: string;
  label: string;
  lineageId: string;
  paletteId: string;
}

export interface ArpgLineagePassive {
  id: string;
  name: string;
  summary: string;
  statBonus: ArpgStats;
}

export interface ArpgCityReputationHook {
  cityId: string;
  delta: number;
  summary: string;
}

export interface ArpgLineageDefinition {
  id: string;
  name: string;
  summary: string;
  baseStats: ArpgStats;
  passive: ArpgLineagePassive;
  cityReputationHooks: ArpgCityReputationHook[];
  spritePaletteNotes: string;
  originText: string;
  questHook: string;
  dialogueTags: string[];
  paletteIds: string[];
}

export interface ArpgSubclassDefinition {
  id: string;
  name: string;
  summary: string;
  starterSkillId: string;
  perk: string;
  statusEffect: string;
  statBonus: ArpgStats;
}

export interface ArpgStarterBuildDefinition {
  name: string;
  subclassId: string;
  activeSkillId: string;
  passiveSkillId: string;
  hotbarSkillIds: string[];
}

export interface ArpgCharacterSkillNode {
  id: string;
  pathId: string;
  name: string;
  kind: ArpgSkillKind;
  tier: number;
  rankMax: number;
  unlockLevel: number;
  prerequisiteIds: string[];
  summary: string;
  statBonus: ArpgStats;
  cooldownMs: number;
  resourceCost: number;
  statusEffects: string[];
  comboHook: string;
  accent: string;
}

export interface ArpgClassTreeDefinition {
  id: string;
  name: string;
  resource: ArpgClassResource;
  role: string;
  accent: string;
  subclasses: ArpgSubclassDefinition[];
  starterBuild: ArpgStarterBuildDefinition;
  skillNodes: ArpgCharacterSkillNode[];
}

export interface ArpgCharacterContent {
  schemaVersion: ArpgCharacterContentVersion;
  defaults: ArpgCharacterDefaults;
  palettes: ArpgPaletteDefinition[];
  portraits: ArpgPortraitDefinition[];
  lineages: ArpgLineageDefinition[];
  classTrees: ArpgClassTreeDefinition[];
}

export const ARPG_CHARACTER_CONTENT = characterContent as ArpgCharacterContent;

export const ARPG_CHARACTER_DEFAULTS = ARPG_CHARACTER_CONTENT.defaults;

export const ARPG_LINEAGES = Object.fromEntries(
  ARPG_CHARACTER_CONTENT.lineages.map((lineage) => [lineage.id, lineage]),
) as Record<string, ArpgLineageDefinition>;

export const ARPG_CLASS_TREES = Object.fromEntries(
  ARPG_CHARACTER_CONTENT.classTrees.map((classTree) => [classTree.id, classTree]),
) as Record<string, ArpgClassTreeDefinition>;

export const ARPG_PALETTES = Object.fromEntries(
  ARPG_CHARACTER_CONTENT.palettes.map((palette) => [palette.id, palette]),
) as Record<string, ArpgPaletteDefinition>;

export const ARPG_PORTRAITS = Object.fromEntries(
  ARPG_CHARACTER_CONTENT.portraits.map((portrait) => [portrait.id, portrait]),
) as Record<string, ArpgPortraitDefinition>;

export const ARPG_CHARACTER_SKILL_NODES = Object.fromEntries(
  ARPG_CHARACTER_CONTENT.classTrees.flatMap((classTree) =>
    classTree.skillNodes.map((skill) => [skill.id, skill]),
  ),
) as Record<string, ArpgCharacterSkillNode>;
