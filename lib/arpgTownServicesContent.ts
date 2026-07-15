import townServicesContent from "@/lib/arpgTownServicesContent.json";

export type ArpgTownServiceKind =
  | "blacksmith"
  | "alchemy"
  | "market"
  | "inn"
  | "quest-board";

export interface ArpgTownServiceDefinition {
  id: string;
  label: string;
  kind: ArpgTownServiceKind;
  districtId: string;
  summary: string;
  primaryAction: string;
  rewardItemIds: string[];
  unlocks: string[];
}

export interface ArpgTownDistrictHook {
  id: string;
  districtId: string;
  label: string;
  releaseRole: string;
  firstConflict: string;
}

export interface ArpgTownNpc {
  id: string;
  name: string;
  role: string;
  districtId: string;
  serviceId: string;
  summary: string;
  dialogueHook: string;
  rewardItemId: string;
  reputationFactionId: string;
  visualCue: string;
}

export interface ArpgTownMiniQuest {
  id: string;
  title: string;
  districtId: string;
  npcId: string;
  serviceId: string;
  summary: string;
  steps: string[];
  rewardItemIds: string[];
  storyFlags: string[];
  reputationDelta: number;
  unlockCopy: string;
}

export interface ArpgTownServiceOutcome {
  id: string;
  serviceId: string;
  label: string;
  result: string;
  rewardItemIds: string[];
  statusFlag: string;
}

export interface ArpgTownDistrictMapNode {
  id: string;
  districtId: string;
  label: string;
  mapRole: string;
  summary: string;
  visualMood: string;
  primaryNpcIds: string[];
  serviceIds: string[];
  miniQuestIds: string[];
  rewardItemIds: string[];
  storyFlag: string;
  releaseAction: string;
}

export interface ArpgOathmarketVendorWare {
  id: string;
  label: string;
  itemId: string;
  priceCurrencyItemId: string;
  priceAmount: number;
  slotHint: string;
  qualityHint: string;
  comparisonCopy: string;
  storyFlag: string;
}

export interface ArpgOathmarketLedgerChoice {
  id: string;
  label: string;
  stance: string;
  summary: string;
  rewardItemIds: string[];
  reputationDelta: number;
  storyFlag: string;
  outcomeCopy: string;
}

export interface ArpgWardensStepsArmorFitting {
  id: string;
  label: string;
  slot: string;
  serviceId: string;
  npcId: string;
  starterItemId: string;
  materialItemIds: string[];
  rewardItemIds: string[];
  qualityPath: string[];
  visualUpgrade: string;
  statLesson: string;
  storyFlag: string;
  comparisonCopy: string;
}

export interface ArpgWardensStepsOathContract {
  id: string;
  label: string;
  sponsorNpcId: string;
  serviceId: string;
  stance: string;
  summary: string;
  rewardItemIds: string[];
  reputationDelta: number;
  storyFlag: string;
  outcomeCopy: string;
}

export interface ArpgBellrootCommonsBrew {
  id: string;
  label: string;
  serviceId: string;
  npcId: string;
  brewRole: string;
  ingredientItemIds: string[];
  rewardItemIds: string[];
  conditionTags: string[];
  summary: string;
  storyFlag: string;
  outcomeCopy: string;
}

export interface ArpgBellrootLampReading {
  id: string;
  label: string;
  npcId: string;
  districtId: string;
  mysteryHook: string;
  summary: string;
  rewardItemIds: string[];
  reputationDelta: number;
  storyFlag: string;
  outcomeCopy: string;
}

export interface ArpgPilgrimRowsRestOption {
  id: string;
  label: string;
  serviceId: string;
  npcId: string;
  restRole: string;
  rewardItemIds: string[];
  roadPrepTags: string[];
  summary: string;
  storyFlag: string;
  outcomeCopy: string;
}

export interface ArpgPilgrimRowsRoadRumor {
  id: string;
  label: string;
  npcId: string;
  districtId: string;
  rumorHook: string;
  routeHint: string;
  rewardItemIds: string[];
  reputationDelta: number;
  storyFlag: string;
  outcomeCopy: string;
}

export interface ArpgStarterGearProgression {
  slot: string;
  starterItemId: string;
  firstUpgradeTheme: string;
  source: string;
  qualityPath: string[];
  visualRule: string;
}

export interface ArpgTownServicesContent {
  schemaVersion: "mw6-first-town-services-v1";
  cityId: "veyrhold";
  title: string;
  summary: string;
  unlockPath: string[];
  services: ArpgTownServiceDefinition[];
  npcRoster: ArpgTownNpc[];
  miniQuests: ArpgTownMiniQuest[];
  serviceOutcomes: ArpgTownServiceOutcome[];
  districtMapNodes: ArpgTownDistrictMapNode[];
  oathmarketVendorWares: ArpgOathmarketVendorWare[];
  oathmarketLedgerChoices: ArpgOathmarketLedgerChoice[];
  wardensStepsArmorFittings: ArpgWardensStepsArmorFitting[];
  wardensStepsOathContracts: ArpgWardensStepsOathContract[];
  bellrootCommonsBrews: ArpgBellrootCommonsBrew[];
  bellrootLampReadings: ArpgBellrootLampReading[];
  pilgrimRowsRestOptions: ArpgPilgrimRowsRestOption[];
  pilgrimRowsRoadRumors: ArpgPilgrimRowsRoadRumor[];
  districtHooks: ArpgTownDistrictHook[];
  starterGearProgression: ArpgStarterGearProgression[];
  releaseAcceptance: string[];
}

export const ARPG_TOWN_SERVICES_CONTENT =
  townServicesContent as ArpgTownServicesContent;

export const ARPG_VEYR_HUB_SERVICES = ARPG_TOWN_SERVICES_CONTENT.services;
export const ARPG_VEYR_TOWN_NPCS = ARPG_TOWN_SERVICES_CONTENT.npcRoster;
export const ARPG_VEYR_MINI_QUESTS = ARPG_TOWN_SERVICES_CONTENT.miniQuests;
export const ARPG_VEYR_SERVICE_OUTCOMES =
  ARPG_TOWN_SERVICES_CONTENT.serviceOutcomes;
export const ARPG_VEYR_DISTRICT_MAP_NODES =
  ARPG_TOWN_SERVICES_CONTENT.districtMapNodes;
export const ARPG_OATHMARKET_VENDOR_WARES =
  ARPG_TOWN_SERVICES_CONTENT.oathmarketVendorWares;
export const ARPG_OATHMARKET_LEDGER_CHOICES =
  ARPG_TOWN_SERVICES_CONTENT.oathmarketLedgerChoices;
export const ARPG_WARDENS_STEPS_ARMOR_FITTINGS =
  ARPG_TOWN_SERVICES_CONTENT.wardensStepsArmorFittings;
export const ARPG_WARDENS_STEPS_OATH_CONTRACTS =
  ARPG_TOWN_SERVICES_CONTENT.wardensStepsOathContracts;
export const ARPG_BELLROOT_COMMONS_BREWS =
  ARPG_TOWN_SERVICES_CONTENT.bellrootCommonsBrews;
export const ARPG_BELLROOT_LAMP_READINGS =
  ARPG_TOWN_SERVICES_CONTENT.bellrootLampReadings;
export const ARPG_PILGRIM_ROWS_REST_OPTIONS =
  ARPG_TOWN_SERVICES_CONTENT.pilgrimRowsRestOptions;
export const ARPG_PILGRIM_ROWS_ROAD_RUMORS =
  ARPG_TOWN_SERVICES_CONTENT.pilgrimRowsRoadRumors;
export const ARPG_VEYR_DISTRICT_HOOKS =
  ARPG_TOWN_SERVICES_CONTENT.districtHooks;
export const ARPG_VEYR_STARTER_GEAR_PROGRESSION =
  ARPG_TOWN_SERVICES_CONTENT.starterGearProgression;

export function getArpgVeyrholdTownServiceSummary() {
  return {
    cityId: ARPG_TOWN_SERVICES_CONTENT.cityId,
    title: ARPG_TOWN_SERVICES_CONTENT.title,
    summary: ARPG_TOWN_SERVICES_CONTENT.summary,
    serviceCount: ARPG_VEYR_HUB_SERVICES.length,
    npcCount: ARPG_VEYR_TOWN_NPCS.length,
    miniQuestCount: ARPG_VEYR_MINI_QUESTS.length,
    serviceOutcomeCount: ARPG_VEYR_SERVICE_OUTCOMES.length,
    districtMapNodeCount: ARPG_VEYR_DISTRICT_MAP_NODES.length,
    oathmarketWareCount: ARPG_OATHMARKET_VENDOR_WARES.length,
    oathmarketChoiceCount: ARPG_OATHMARKET_LEDGER_CHOICES.length,
    wardensStepsArmorFittingCount: ARPG_WARDENS_STEPS_ARMOR_FITTINGS.length,
    wardensStepsOathContractCount: ARPG_WARDENS_STEPS_OATH_CONTRACTS.length,
    bellrootCommonsBrewCount: ARPG_BELLROOT_COMMONS_BREWS.length,
    bellrootLampReadingCount: ARPG_BELLROOT_LAMP_READINGS.length,
    pilgrimRowsRestOptionCount: ARPG_PILGRIM_ROWS_REST_OPTIONS.length,
    pilgrimRowsRoadRumorCount: ARPG_PILGRIM_ROWS_ROAD_RUMORS.length,
    districtHookCount: ARPG_VEYR_DISTRICT_HOOKS.length,
    starterGearSlotCount: ARPG_VEYR_STARTER_GEAR_PROGRESSION.length,
    serviceKinds: ARPG_VEYR_HUB_SERVICES.map((service) => service.kind),
    starterSlots: ARPG_VEYR_STARTER_GEAR_PROGRESSION.map((entry) => entry.slot),
  };
}
