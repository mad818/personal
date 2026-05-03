import presentationData from "@/lib/arpgFirstTownPresentationContent.json";

export type ArpgPresentationSurfaceTarget =
  | "adventure"
  | "inventory"
  | "map"
  | "armory"
  | "journal"
  | "production";

export type ArpgPresentationZone = "bellroot" | "veyrhold";

export interface ArpgFirstTownPresentationCue {
  id: string;
  label: string;
  zone: ArpgPresentationZone;
  cityId: string;
  districtId: string;
  surfaceTargets: ArpgPresentationSurfaceTarget[];
  runtimeAssetIds: string[];
  locationFrame: number;
  vfxFrame: number;
  ambientCopy: string;
  vfxIntent: string;
  audioIntent: string;
  reducedMotionAlternative: string;
  uiProof: string;
}

export interface ArpgFirstTownPresentationContent {
  schemaVersion: "mw6-first-town-presentation-v1";
  title: string;
  summary: string;
  operatorRules: string[];
  cues: ArpgFirstTownPresentationCue[];
}

export const ARPG_FIRST_TOWN_PRESENTATION_CONTENT =
  presentationData as ArpgFirstTownPresentationContent;

export const ARPG_FIRST_TOWN_PRESENTATION_CUES =
  ARPG_FIRST_TOWN_PRESENTATION_CONTENT.cues;

export function getArpgFirstTownPresentationSummary() {
  const cues = ARPG_FIRST_TOWN_PRESENTATION_CUES;
  const assetIds = Array.from(new Set(cues.flatMap((cue) => cue.runtimeAssetIds)));
  const surfaceTargets = Array.from(new Set(cues.flatMap((cue) => cue.surfaceTargets)));
  const reducedMotionCueCount = cues.filter((cue) => cue.reducedMotionAlternative.trim()).length;

  return {
    title: ARPG_FIRST_TOWN_PRESENTATION_CONTENT.title,
    summary: ARPG_FIRST_TOWN_PRESENTATION_CONTENT.summary,
    cueCount: cues.length,
    assetCount: assetIds.length,
    assetIds,
    surfaceTargets,
    reducedMotionCueCount,
    operatorRules: ARPG_FIRST_TOWN_PRESENTATION_CONTENT.operatorRules,
    bellrootCueCount: cues.filter((cue) => cue.zone === "bellroot").length,
    veyrholdCueCount: cues.filter((cue) => cue.zone === "veyrhold").length,
  };
}

export function getArpgFirstTownPresentationCue(
  cityId: string,
  districtId?: string | null,
) {
  return (
    ARPG_FIRST_TOWN_PRESENTATION_CUES.find((cue) => cue.districtId === districtId) ??
    ARPG_FIRST_TOWN_PRESENTATION_CUES.find((cue) => cue.cityId === cityId && cue.districtId === cityId) ??
    ARPG_FIRST_TOWN_PRESENTATION_CUES.find((cue) => cue.cityId === cityId) ??
    ARPG_FIRST_TOWN_PRESENTATION_CUES[0]
  );
}
