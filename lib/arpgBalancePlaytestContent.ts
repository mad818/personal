import balancePlaytestContent from "@/lib/arpgBalancePlaytestContent.json";

export interface ArpgBalancePlaytestContent {
  schemaVersion: "mw6-balance-playtest-v1";
  title: string;
  purpose: string;
  sessionTargets: Array<{
    id: string;
    label: string;
    minutes: [number, number];
    playerPromise: string;
  }>;
  xpCurveAnchors: Array<{
    level: number;
    totalXp: number;
    phase: string;
  }>;
  levelBands: Array<{
    id: string;
    label: string;
    levels: [number, number];
    requiredRegions: string[];
    balanceIntent: string;
  }>;
  lootCadence: Array<{
    id: string;
    label: string;
    expectedDrops: [number, number];
    qualityTargets: string[];
    sourceRule: string;
  }>;
  bossTargets: Array<{
    id: string;
    label: string;
    tier: string;
    timeToKillSeconds: [number, number];
    potionUse: [number, number];
    phaseCount: number;
    telegraphRule: string;
  }>;
  classViability: Array<{
    classId: string;
    beginnerBuild: string;
    lateGameBuild: string;
    subclassCoverage: string[];
    survivability: [number, number];
    damage: [number, number];
    mobility: [number, number];
    control: [number, number];
  }>;
  lineageViability: Array<{
    lineageId: string;
    varianceBudgetPercent: [number, number];
    hook: string;
  }>;
  upgradeEconomy: Array<{
    rank: number;
    materials: Array<{ id: string; quantity: number }>;
    gold: number;
    antiGrindRule: string;
  }>;
  browserPerformanceBudgets: Record<string, number>;
  inputFeelChecks: Array<{
    id: string;
    label: string;
    requiredInputs: string[];
    acceptance: string;
  }>;
  playtestChecklist: Array<{
    id: string;
    type: string;
    label: string;
    regionId: string;
    assertions: string[];
  }>;
  acceptanceGates: string[];
}

export const ARPG_BALANCE_PLAYTEST =
  balancePlaytestContent as unknown as ArpgBalancePlaytestContent;

export function getArpgBalancePlaytestSummary() {
  const cityChecklist = ARPG_BALANCE_PLAYTEST.playtestChecklist.filter(
    (entry) => entry.type === "city-hub",
  );
  const finalBossTarget = ARPG_BALANCE_PLAYTEST.bossTargets.find(
    (entry) => entry.id === "the-hollow-regent-final",
  );

  return {
    title: ARPG_BALANCE_PLAYTEST.title,
    purpose: ARPG_BALANCE_PLAYTEST.purpose,
    sessionTargetCount: ARPG_BALANCE_PLAYTEST.sessionTargets.length,
    xpAnchorCount: ARPG_BALANCE_PLAYTEST.xpCurveAnchors.length,
    levelBandCount: ARPG_BALANCE_PLAYTEST.levelBands.length,
    lootCadenceCount: ARPG_BALANCE_PLAYTEST.lootCadence.length,
    bossTargetCount: ARPG_BALANCE_PLAYTEST.bossTargets.length,
    classViabilityCount: ARPG_BALANCE_PLAYTEST.classViability.length,
    lineageViabilityCount: ARPG_BALANCE_PLAYTEST.lineageViability.length,
    upgradeEconomyCount: ARPG_BALANCE_PLAYTEST.upgradeEconomy.length,
    inputFeelCheckCount: ARPG_BALANCE_PLAYTEST.inputFeelChecks.length,
    playtestChecklistCount: ARPG_BALANCE_PLAYTEST.playtestChecklist.length,
    cityChecklistCount: cityChecklist.length,
    browserPerformanceBudgets: ARPG_BALANCE_PLAYTEST.browserPerformanceBudgets,
    finalBossTarget,
    sessionTargets: ARPG_BALANCE_PLAYTEST.sessionTargets,
    bossTargets: ARPG_BALANCE_PLAYTEST.bossTargets,
    classViability: ARPG_BALANCE_PLAYTEST.classViability,
    cityChecklist,
    playtestChecklist: ARPG_BALANCE_PLAYTEST.playtestChecklist,
    acceptanceGates: ARPG_BALANCE_PLAYTEST.acceptanceGates,
  };
}
