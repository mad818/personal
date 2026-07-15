import worldLoopContent from "@/lib/arpgWorldLoopContent.json";
import { ARPG_PRODUCTION_CONTENT } from "@/lib/arpgProductionContent";

export interface ArpgWorldLoopChoiceOutcome {
  id: string;
  label: string;
  reputationDelta: number;
  rewardCurrency: string;
  summary: string;
}

export interface ArpgWorldLoopContent {
  schemaVersion: "mw6-world-loop-v1";
  campaignPhases: Array<{
    id: string;
    title: string;
    levelRange: [number, number];
    summary: string;
    boss: string;
  }>;
  reputationTiers: Array<{
    id: string;
    min: number;
    max: number;
    summary: string;
  }>;
  questTemplates: Array<{
    id: string;
    scope: string;
    steps: string[];
  }>;
  routeEventTypes: Array<{
    id: string;
    summary: string;
  }>;
  npcRoles: Array<{
    id: string;
    summary: string;
  }>;
  dialogueFlagRules: Array<{
    id: string;
    summary: string;
  }>;
  companionArcTemplates: Array<{
    id: string;
    loyaltyFlag: string;
    perk: string;
    quest: string;
  }>;
  routeChoiceOutcomes: ArpgWorldLoopChoiceOutcome[];
}

export interface ArpgCityStoryline {
  id: string;
  cityId: string;
  title: string;
  factionIds: string[];
  questSteps: string[];
  bossId: string;
  unlockFlag: string;
  summary: string;
}

export interface ArpgSubCitySideArc {
  id: string;
  cityId: string;
  subCityId: string;
  title: string;
  localConflict: string;
  microFactions: string[];
  miniBoss: string;
  rewardName: string;
  codexFlag: string;
}

export interface ArpgRouteEvent {
  id: string;
  routeId: string;
  from: string;
  to: string;
  eventTypeId: string;
  title: string;
  summary: string;
  unlockFlag: string;
  choices: ArpgWorldLoopChoiceOutcome[];
}

export interface ArpgMajorNpc {
  id: string;
  cityId: string;
  name: string;
  roleId: string;
  faction: string;
  dialogueFlag: string;
}

export const ARPG_WORLD_LOOP_CONTENT = worldLoopContent as ArpgWorldLoopContent;

const slug = (value: string) =>
  value
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const arpgRouteId = (from: string, to: string) => `${from}-to-${to}`;

export const ARPG_CITY_STORYLINES: ArpgCityStoryline[] =
  ARPG_PRODUCTION_CONTENT.world.cities.map((city) => {
    const finale = city.subCities[city.subCities.length - 1];
    return {
      id: `${city.id}-storyline`,
      cityId: city.id,
      title: `${city.name}: ${city.campaignRole}`,
      factionIds: city.factions,
      questSteps: [
        "arrive",
        "hear the local pressure",
        "resolve two districts",
        "defeat the city boss",
      ],
      bossId: `${city.id}-city-boss`,
      unlockFlag: `city:${slug(city.id)}-story-complete`,
      summary: `${city.coreFantasy}. ${city.rulerPressure}`,
    };
  });

export const ARPG_SUBCITY_SIDE_ARCS: ArpgSubCitySideArc[] =
  ARPG_PRODUCTION_CONTENT.world.cities.flatMap((city) =>
    city.subCities.map((subCity) => ({
      id: `${subCity.id}-side-arc`,
      cityId: city.id,
      subCityId: subCity.id,
      title: `${subCity.name}: ${subCity.districtRole}`,
      localConflict: subCity.localStory,
      microFactions: subCity.microFactions,
      miniBoss: subCity.miniBoss,
      rewardName: subCity.gearDrop,
      codexFlag: `codex:${subCity.id}`,
    })),
  );

export const ARPG_ROUTE_EVENTS: ArpgRouteEvent[] =
  ARPG_PRODUCTION_CONTENT.world.routes.map((route, index) => {
    const eventType =
      ARPG_WORLD_LOOP_CONTENT.routeEventTypes[
        index % ARPG_WORLD_LOOP_CONTENT.routeEventTypes.length
      ];
    const city = ARPG_PRODUCTION_CONTENT.world.cities.find(
      (entry) => entry.id === route.to,
    );
    const routeId = arpgRouteId(route.from, route.to);

    return {
      id: `${routeId}-${eventType.id}`,
      routeId,
      from: route.from,
      to: route.to,
      eventTypeId: eventType.id,
      title: `${eventType.summary.split(" ")[0]} toward ${city?.name ?? route.to}`,
      summary: eventType.summary,
      unlockFlag: route.unlockFlag,
      choices: ARPG_WORLD_LOOP_CONTENT.routeChoiceOutcomes,
    };
  });

export const ARPG_MAJOR_NPCS: ArpgMajorNpc[] =
  ARPG_PRODUCTION_CONTENT.world.cities.flatMap((city, cityIndex) =>
    ARPG_WORLD_LOOP_CONTENT.npcRoles.slice(0, 4).map((role, roleIndex) => ({
      id: `${city.id}-${role.id}`,
      cityId: city.id,
      name: `${city.name} ${role.id.replace(/-/g, " ")}`,
      roleId: role.id,
      faction: city.factions[roleIndex % city.factions.length],
      dialogueFlag: `dialogue:${city.id}:${role.id}`,
    })),
  );

export const ARPG_COMPANION_ARCS = ARPG_PRODUCTION_CONTENT.companions.map(
  (companion) => {
    const arc =
      ARPG_WORLD_LOOP_CONTENT.companionArcTemplates.find(
        (entry) => entry.id === companion.id,
      ) ?? ARPG_WORLD_LOOP_CONTENT.companionArcTemplates[0];

    return {
      ...companion,
      loyaltyFlag: arc.loyaltyFlag,
      perkDetail: arc.perk,
      questTitle: arc.quest,
    };
  },
);

export const ARPG_WORLD_LOOP_SUMMARY = {
  campaignPhaseCount: ARPG_WORLD_LOOP_CONTENT.campaignPhases.length,
  cityStorylineCount: ARPG_CITY_STORYLINES.length,
  subCitySideArcCount: ARPG_SUBCITY_SIDE_ARCS.length,
  routeEventCount: ARPG_ROUTE_EVENTS.length,
  companionArcCount: ARPG_COMPANION_ARCS.length,
  majorNpcCount: ARPG_MAJOR_NPCS.length,
};

export function getArpgRouteEvent(routeId: string) {
  return ARPG_ROUTE_EVENTS.find((event) => event.routeId === routeId) ?? null;
}

export function getArpgTravelEvent(eventId: string) {
  return ARPG_ROUTE_EVENTS.find((event) => event.id === eventId) ?? null;
}

export function getArpgCityStoryline(cityId: string) {
  return (
    ARPG_CITY_STORYLINES.find((storyline) => storyline.cityId === cityId) ??
    null
  );
}

export function getArpgSubCitySideArc(subCityId: string) {
  return (
    ARPG_SUBCITY_SIDE_ARCS.find((arc) => arc.subCityId === subCityId) ?? null
  );
}
