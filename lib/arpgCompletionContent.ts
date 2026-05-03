import completionContent from "@/lib/arpgCompletionContent.json";

export type ArpgCompletionTrackStatus = "done" | "current" | "next" | "blocked";

export type ArpgCompletionTrackCategory =
  | "assets"
  | "balance"
  | "canon"
  | "endgame"
  | "player"
  | "presentation"
  | "release"
  | "save"
  | "systems"
  | "tools"
  | "ui";

export interface ArpgCompletionTrack {
  id: string;
  label: string;
  status: ArpgCompletionTrackStatus;
  category: ArpgCompletionTrackCategory;
  summary: string;
  docPath: string;
  runtimeSurface: string;
  requiredGates: string[];
  acceptance: string[];
}

export interface ArpgCompletionProgram {
  schemaVersion: "mw6-completion-program-v1";
  parentId: "MW6-ARPG-FULL-GAME-PRODUCTION";
  title: string;
  completionDefinition: string;
  routeTarget: "/hq";
  resourcesTarget: string;
  tracks: ArpgCompletionTrack[];
}

export const ARPG_COMPLETION_PROGRAM =
  completionContent as ArpgCompletionProgram;

export function getArpgCompletionSummary() {
  const tracks = ARPG_COMPLETION_PROGRAM.tracks;
  const doneCount = tracks.filter((track) => track.status === "done").length;
  const blockedTracks = tracks.filter((track) => track.status === "blocked");
  const activeTracks = tracks.filter((track) => track.status === "current");
  const nextTracks = tracks.filter((track) => track.status === "next");
  const completionPercent = Math.round((doneCount / Math.max(tracks.length, 1)) * 100);

  return {
    ...ARPG_COMPLETION_PROGRAM,
    doneCount,
    openCount: tracks.length - doneCount,
    blockedTracks,
    activeTracks,
    nextTracks,
    completionPercent,
    canCloseParent: doneCount === tracks.length && blockedTracks.length === 0,
  };
}
