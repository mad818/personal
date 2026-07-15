import endgameContent from "@/lib/arpgEndgameContent.json";
import {
  ARPG_ENEMY_TAXONOMY_CONTENT,
  ARPG_CITY_BOSSES,
} from "@/lib/arpgEnemyTaxonomyContent";
import { ARPG_PRODUCTION_CONTENT } from "@/lib/arpgProductionContent";

export interface ArpgEndgameDifficultyTier {
  id: string;
  label: string;
  enemyScale: number;
  rewardScale: number;
  summary: string;
}

export interface ArpgDungeonArchetypeDefinition {
  id: string;
  name: string;
  objective: string;
  roomCount: number;
  rewardTrackId: string;
}

export interface ArpgEliteAffixRotation {
  id: string;
  label: string;
  traitIds: string[];
  buffIds: string[];
  debuffIds: string[];
  rewardMultiplier: number;
}

export interface ArpgRelicTrialRule {
  id: string;
  label: string;
  statFocus: string;
  damageType: string;
  mechanic: string;
}

export interface ArpgBossRematchRule {
  id: string;
  summary: string;
  rewardTrackId: string;
}

export interface ArpgTreasureMapRule {
  id: string;
  label: string;
  requiredClueCount: number;
  rewardTrackId: string;
}

export interface ArpgArenaChallengeDefinition {
  id: string;
  classId: string;
  label: string;
  objective: string;
}

export interface ArpgCollectionGoalDefinition {
  id: string;
  label: string;
  target: number;
  summary: string;
}

export interface ArpgCosmeticRewardDefinition {
  id: string;
  label: string;
  sourceGoalId: string;
  paletteAccent: string;
}

export interface ArpgEndgameRewardTrack {
  id: string;
  currencyId: string;
  quantity: number;
  summary: string;
}

export interface ArpgEndgameContent {
  schemaVersion: "mw6-endgame-foundation-v1";
  defaultDifficultyTierId: string;
  postgameUnlockFlags: string[];
  previewUnlockFlags: string[];
  difficultyTiers: ArpgEndgameDifficultyTier[];
  dungeonArchetypes: ArpgDungeonArchetypeDefinition[];
  eliteAffixRotations: ArpgEliteAffixRotation[];
  relicTrialRules: ArpgRelicTrialRule[];
  bossRematchRules: ArpgBossRematchRule[];
  treasureMapRules: ArpgTreasureMapRule[];
  arenaChallenges: ArpgArenaChallengeDefinition[];
  collectionGoals: ArpgCollectionGoalDefinition[];
  cosmeticRewards: ArpgCosmeticRewardDefinition[];
  rewardTracks: ArpgEndgameRewardTrack[];
}

export interface ArpgCityChallengeDungeon {
  id: string;
  cityId: string;
  name: string;
  dungeonArchetypeId: string;
  eliteAffixRotationId: string;
  difficultyTierId: string;
  levelRange: [number, number];
  objective: string;
  rewardTrackId: string;
  roomCount: number;
}

export interface ArpgRelicTrial {
  id: string;
  cityId: string;
  name: string;
  ruleId: string;
  statFocus: string;
  damageType: string;
  mechanic: string;
  rewardTrackId: string;
}

export interface ArpgTimedTreasureRoom {
  id: string;
  cityId: string;
  subCityId: string;
  name: string;
  timerSeconds: number;
  treasureMapId: string;
  eliteAffixRotationId: string;
  rewardTrackId: string;
}

export interface ArpgTreasureMap {
  id: string;
  cityId: string;
  subCityId: string;
  name: string;
  ruleId: string;
  clueCount: number;
  rewardTrackId: string;
}

export interface ArpgBossRematch {
  id: string;
  name: string;
  source: "city" | "act" | "world" | "final";
  cityId?: string;
  bossId: string;
  ruleId: string;
  phaseCount: number;
  rewardTrackId: string;
  uniqueDrop: string;
}

export const ARPG_ENDGAME_CONTENT = endgameContent as ArpgEndgameContent;

const defaultDifficulty =
  ARPG_ENDGAME_CONTENT.difficultyTiers.find(
    (tier) => tier.id === ARPG_ENDGAME_CONTENT.defaultDifficultyTierId,
  ) ?? ARPG_ENDGAME_CONTENT.difficultyTiers[0];

export const ARPG_CITY_CHALLENGE_DUNGEONS: ArpgCityChallengeDungeon[] =
  ARPG_PRODUCTION_CONTENT.world.cities.map((city, index) => {
    const archetype =
      ARPG_ENDGAME_CONTENT.dungeonArchetypes[
        index % ARPG_ENDGAME_CONTENT.dungeonArchetypes.length
      ];
    const affix =
      ARPG_ENDGAME_CONTENT.eliteAffixRotations[
        index % ARPG_ENDGAME_CONTENT.eliteAffixRotations.length
      ];

    return {
      id: `${city.id}-challenge-dungeon`,
      cityId: city.id,
      name: `${city.name} ${archetype.name}`,
      dungeonArchetypeId: archetype.id,
      eliteAffixRotationId: affix.id,
      difficultyTierId: defaultDifficulty.id,
      levelRange: city.levelRange,
      objective: archetype.objective,
      rewardTrackId: archetype.rewardTrackId,
      roomCount: archetype.roomCount,
    };
  });

export const ARPG_RELIC_TRIALS: ArpgRelicTrial[] =
  ARPG_PRODUCTION_CONTENT.world.cities.map((city, index) => {
    const rule =
      ARPG_ENDGAME_CONTENT.relicTrialRules[
        index % ARPG_ENDGAME_CONTENT.relicTrialRules.length
      ];
    return {
      id: `${city.id}-relic-trial`,
      cityId: city.id,
      name: `${city.name} ${rule.label}`,
      ruleId: rule.id,
      statFocus: rule.statFocus,
      damageType: rule.damageType,
      mechanic: rule.mechanic,
      rewardTrackId: "relic-trial-cache",
    };
  });

export const ARPG_TREASURE_MAPS: ArpgTreasureMap[] =
  ARPG_PRODUCTION_CONTENT.world.cities.flatMap((city, cityIndex) =>
    city.subCities.map((subCity, subCityIndex) => {
      const rule =
        ARPG_ENDGAME_CONTENT.treasureMapRules[
          (cityIndex + subCityIndex) %
            ARPG_ENDGAME_CONTENT.treasureMapRules.length
        ];
      return {
        id: `${subCity.id}-treasure-map`,
        cityId: city.id,
        subCityId: subCity.id,
        name: `${subCity.name} ${rule.label}`,
        ruleId: rule.id,
        clueCount: rule.requiredClueCount,
        rewardTrackId: rule.rewardTrackId,
      };
    }),
  );

export const ARPG_TIMED_TREASURE_ROOMS: ArpgTimedTreasureRoom[] =
  ARPG_PRODUCTION_CONTENT.world.cities.flatMap((city, cityIndex) =>
    city.subCities.map((subCity, subCityIndex) => {
      const map = ARPG_TREASURE_MAPS.find(
        (entry) => entry.subCityId === subCity.id,
      )!;
      const affix =
        ARPG_ENDGAME_CONTENT.eliteAffixRotations[
          (cityIndex + subCityIndex) %
            ARPG_ENDGAME_CONTENT.eliteAffixRotations.length
        ];
      return {
        id: `${subCity.id}-timed-room`,
        cityId: city.id,
        subCityId: subCity.id,
        name: `${subCity.name} timed reliquary room`,
        timerSeconds: 120 + cityIndex * 8 + subCityIndex * 5,
        treasureMapId: map.id,
        eliteAffixRotationId: affix.id,
        rewardTrackId: map.rewardTrackId,
      };
    }),
  );

export const ARPG_BOSS_REMATCHES: ArpgBossRematch[] = [
  ...ARPG_CITY_BOSSES.map((boss, index) => {
    const rule =
      ARPG_ENDGAME_CONTENT.bossRematchRules[
        index % ARPG_ENDGAME_CONTENT.bossRematchRules.length
      ];
    return {
      id: `${boss.id}-rematch`,
      name: `${boss.name} memory rematch`,
      source: "city" as const,
      cityId: boss.cityId,
      bossId: boss.id,
      ruleId: rule.id,
      phaseCount: boss.phaseCount,
      rewardTrackId: rule.rewardTrackId,
      uniqueDrop: boss.uniqueDrop,
    };
  }),
  ...ARPG_ENEMY_TAXONOMY_CONTENT.actBosses.map((boss, index) => {
    const rule =
      ARPG_ENDGAME_CONTENT.bossRematchRules[
        (index + 1) % ARPG_ENDGAME_CONTENT.bossRematchRules.length
      ];
    return {
      id: `${boss.id}-act-rematch`,
      name: `${boss.name} act echo`,
      source:
        boss.name === "The Hollow Regent"
          ? ("final" as const)
          : ("act" as const),
      bossId: boss.id,
      ruleId: rule.id,
      phaseCount: boss.phaseCount ?? 2,
      rewardTrackId: rule.rewardTrackId,
      uniqueDrop: boss.uniqueDrop,
    };
  }),
  ...ARPG_ENEMY_TAXONOMY_CONTENT.worldBosses.map((boss, index) => {
    const rule =
      ARPG_ENDGAME_CONTENT.bossRematchRules[
        (index + 2) % ARPG_ENDGAME_CONTENT.bossRematchRules.length
      ];
    return {
      id: `${boss.id}-world-rematch`,
      name: `${boss.name} world-boss hunt`,
      source: "world" as const,
      cityId: boss.regionId,
      bossId: boss.id,
      ruleId: rule.id,
      phaseCount: boss.phaseCount ?? 3,
      rewardTrackId: rule.rewardTrackId,
      uniqueDrop: boss.uniqueDrop,
    };
  }),
];

export const ARPG_ENDGAME_SUMMARY = {
  difficultyTierCount: ARPG_ENDGAME_CONTENT.difficultyTiers.length,
  challengeDungeonCount: ARPG_CITY_CHALLENGE_DUNGEONS.length,
  relicTrialCount: ARPG_RELIC_TRIALS.length,
  timedRoomCount: ARPG_TIMED_TREASURE_ROOMS.length,
  treasureMapCount: ARPG_TREASURE_MAPS.length,
  bossRematchCount: ARPG_BOSS_REMATCHES.length,
  arenaChallengeCount: ARPG_ENDGAME_CONTENT.arenaChallenges.length,
  collectionGoalCount: ARPG_ENDGAME_CONTENT.collectionGoals.length,
  cosmeticRewardCount: ARPG_ENDGAME_CONTENT.cosmeticRewards.length,
  eliteAffixRotationCount: ARPG_ENDGAME_CONTENT.eliteAffixRotations.length,
};

export function getArpgEndgameRewardTrack(trackId: string) {
  return (
    ARPG_ENDGAME_CONTENT.rewardTracks.find((track) => track.id === trackId) ??
    null
  );
}

export function getArpgChallengeDungeon(dungeonId: string) {
  return (
    ARPG_CITY_CHALLENGE_DUNGEONS.find((dungeon) => dungeon.id === dungeonId) ??
    null
  );
}

export function getArpgRelicTrial(trialId: string) {
  return ARPG_RELIC_TRIALS.find((trial) => trial.id === trialId) ?? null;
}

export function getArpgTreasureMap(mapId: string) {
  return ARPG_TREASURE_MAPS.find((map) => map.id === mapId) ?? null;
}

export function getArpgBossRematch(rematchId: string) {
  return (
    ARPG_BOSS_REMATCHES.find((rematch) => rematch.id === rematchId) ?? null
  );
}

export function getArpgArenaChallenge(challengeId: string) {
  return (
    ARPG_ENDGAME_CONTENT.arenaChallenges.find(
      (challenge) => challenge.id === challengeId,
    ) ?? null
  );
}
