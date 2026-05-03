import prologueContent from "@/lib/arpgPrologueContent.json";

export type ArpgPrologueContentVersion = "mw6-prologue-story-v1";
export type ArpgPrologueMechanic =
  | "character-creation"
  | "exploration"
  | "companion-introduction"
  | "lore-interaction"
  | "relic-reward"
  | "crafting-preview"
  | "combat-onset";

export interface ArpgPrologueIdentityPolicy {
  policyId: string;
  noCanonicalName: true;
  noForcedGender: true;
  playerCreatedName: true;
  defaultRuntimeTitle: string;
  summary: string;
  runtimeCopyRules: string[];
}

export interface ArpgPrologueChapter {
  id: string;
  title: string;
  actId: "prologue";
  summary: string;
  openingPremise: string;
  firstLocationId: string;
  startingQuestId: string;
}

export interface ArpgPrologueLocation {
  id: string;
  name: string;
  parentZoneId: string;
  cityId: string;
  visualSummary: string;
  palette: string[];
  setPieces: string[];
  sensoryDetails: string[];
  openingSafetyRule: string;
}

export interface ArpgPrologueFlowStep {
  id: string;
  title: string;
  mechanic: ArpgPrologueMechanic;
  storyFlag: string;
  summary: string;
}

export interface ArpgPrologueCharacter {
  id: string;
  name?: string;
  namePolicy?: string;
  role: string;
  summary: string;
}

export interface ArpgPrologueDialogueSample {
  speaker: string;
  line: string;
}

export interface ArpgPrologueQuest {
  id: string;
  title: string;
  summary: string;
  steps: string[];
  requiredFlags: string[];
}

export interface ArpgPrologueCodexEntry {
  id: string;
  title: string;
  summary: string;
}

export interface ArpgPrologueVisualPrompt {
  id: string;
  role: string;
  promptBrief: string;
}

export interface ArpgPrologueContent {
  schemaVersion: ArpgPrologueContentVersion;
  title: string;
  protagonistIdentity: ArpgPrologueIdentityPolicy;
  openingChapter: ArpgPrologueChapter;
  firstLocation: ArpgPrologueLocation;
  openingFlow: ArpgPrologueFlowStep[];
  keyCharacters: ArpgPrologueCharacter[];
  dialogueSamples: ArpgPrologueDialogueSample[];
  firstQuest: ArpgPrologueQuest;
  codexEntries: ArpgPrologueCodexEntry[];
  visualAssetPrompts: ArpgPrologueVisualPrompt[];
  contentHooks: {
    loreNodeIds: string[];
    storyFlags: string[];
    questIds: string[];
    uiSurfaces: string[];
    futureRuntimeHooks: string[];
  };
}

export const ARPG_PROLOGUE_CONTENT = prologueContent as ArpgPrologueContent;

export const ARPG_PROLOGUE_IDENTITY_POLICY =
  ARPG_PROLOGUE_CONTENT.protagonistIdentity;

export const ARPG_PROLOGUE_FIRST_LOCATION =
  ARPG_PROLOGUE_CONTENT.firstLocation;

export const ARPG_PROLOGUE_FIRST_QUEST =
  ARPG_PROLOGUE_CONTENT.firstQuest;

export const ARPG_PROLOGUE_FLOW_BY_FLAG = Object.fromEntries(
  ARPG_PROLOGUE_CONTENT.openingFlow.map((step) => [step.storyFlag, step]),
) as Record<string, ArpgPrologueFlowStep>;
