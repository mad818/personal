import readinessContent from "@/lib/arpgProductionReadinessContent.json";

export interface ArpgProductionReadinessContent {
  schemaVersion: "mw6-production-readiness-v1";
  title: string;
  assetPipeline: {
    acceptedLicenses: string[];
    disallowedSources: string[];
    requiredMetadata: string[];
    commercialProofRule: string;
    generatorRule: string;
  };
  menuSurface: {
    compactModeRule: string;
    requiredPanels: Array<{
      id: string;
      label: string;
      surface: string;
      drawerTarget: string;
      testId: string;
      coverage: string;
      emptyState: string;
      keyboardSafe: true;
      reducedMotion: string;
    }>;
  };
  saveHardening: {
    envelopeVersion: "aether-reliquary-save-envelope-v1";
    activeSaveVersion: 3;
    slotKinds: Array<"autosave" | "manual" | "checkpoint">;
    slotPolicies: Array<{
      kind: "autosave" | "manual" | "checkpoint";
      cadence: string;
      recoveryUse: string;
    }>;
    migrationSources: string[];
    recoveryScenarios: string[];
    fixturePaths: {
      legacyV2: string;
      rawV3: string;
      envelopeV1: string;
      corrupted: string;
    };
    exportFormat: string;
  };
  contentTooling: {
    fixtureGroups: string[];
    validationScripts: string[];
    developerTools: string[];
  };
  balanceTargets: {
    sessionLengthMinutes: Record<string, [number, number]>;
    levelCap: number;
    xpCurve: Array<{
      level: number;
      totalXp: number;
    }>;
    fixtureSuites: Array<{
      id: string;
      target: string;
    }>;
    classViabilityTargets: string[];
    combatBudgets: Record<string, [number, number]>;
    browserBudgets: Record<string, number>;
  };
  cityPlaytestMatrix: string[];
  releaseGates: {
    requiredScripts: string[];
    staticGates: string[];
    e2eFlows: string[];
    browserRoutes: string[];
    closureRules: string[];
    fallbackProofMatrix: Array<{
      id: string;
      label: string;
      proof: string[];
      acceptance: string;
    }>;
  };
}

export const ARPG_PRODUCTION_READINESS =
  readinessContent as unknown as ArpgProductionReadinessContent;

export function getArpgProductionReadinessSummary() {
  return {
    title: ARPG_PRODUCTION_READINESS.title,
    acceptedLicenseCount: ARPG_PRODUCTION_READINESS.assetPipeline.acceptedLicenses.length,
    metadataFieldCount: ARPG_PRODUCTION_READINESS.assetPipeline.requiredMetadata.length,
    menuPanelCount: ARPG_PRODUCTION_READINESS.menuSurface.requiredPanels.length,
    saveSlotKindCount: ARPG_PRODUCTION_READINESS.saveHardening.slotKinds.length,
    saveFixtureCount: Object.keys(ARPG_PRODUCTION_READINESS.saveHardening.fixturePaths).length,
    migrationSourceCount: ARPG_PRODUCTION_READINESS.saveHardening.migrationSources.length,
    recoveryScenarioCount: ARPG_PRODUCTION_READINESS.saveHardening.recoveryScenarios.length,
    fixtureGroupCount: ARPG_PRODUCTION_READINESS.contentTooling.fixtureGroups.length,
    validationScriptCount: ARPG_PRODUCTION_READINESS.contentTooling.validationScripts.length,
    balanceTargetCount: ARPG_PRODUCTION_READINESS.balanceTargets.xpCurve.length,
    balanceFixtureCount: ARPG_PRODUCTION_READINESS.balanceTargets.fixtureSuites.length,
    cityPlaytestCount: ARPG_PRODUCTION_READINESS.cityPlaytestMatrix.length,
    releaseGateCount: ARPG_PRODUCTION_READINESS.releaseGates.requiredScripts.length,
    releaseFlowCount: ARPG_PRODUCTION_READINESS.releaseGates.e2eFlows.length,
    browserRouteCount: ARPG_PRODUCTION_READINESS.releaseGates.browserRoutes.length,
    fallbackProofCount: ARPG_PRODUCTION_READINESS.releaseGates.fallbackProofMatrix.length,
    assetPipeline: ARPG_PRODUCTION_READINESS.assetPipeline,
    menuSurface: ARPG_PRODUCTION_READINESS.menuSurface,
    saveHardening: ARPG_PRODUCTION_READINESS.saveHardening,
    contentTooling: ARPG_PRODUCTION_READINESS.contentTooling,
    balanceTargets: ARPG_PRODUCTION_READINESS.balanceTargets,
    releaseGates: ARPG_PRODUCTION_READINESS.releaseGates,
  };
}
