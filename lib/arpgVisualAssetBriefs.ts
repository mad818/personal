import visualBriefsData from "@/lib/arpgVisualAssetBriefs.json";

export type ArpgVisualBriefStatus = "ready-for-generation" | "draft" | "blocked" | "approved";

export interface ArpgVisualBriefSheetSpec {
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  columns: number;
  rows: number;
}

export interface ArpgVisualBriefItem {
  id: string;
  kind: "enemy-card" | "location-card" | "character-portrait" | "gear-icon" | "outfit-card";
  name: string;
  prompt: string;
  acceptance: string;
}

export interface ArpgVisualAssetBrief {
  id: string;
  label: string;
  priority: number;
  status: ArpgVisualBriefStatus;
  linkedVisualBatchId: string;
  targetRuntimePath: string;
  targetRecordPath: string;
  recommendedSheet: ArpgVisualBriefSheetSpec;
  items: ArpgVisualBriefItem[];
}

export interface ArpgVisualAssetBriefsContent {
  schemaVersion: "mw6-visual-asset-briefs-v1";
  title: string;
  summary: string;
  styleTargetId: string;
  styleReferenceAssetIds: string[];
  globalPromptRules: string[];
  outputPolicies: string[];
  briefs: ArpgVisualAssetBrief[];
}

export const ARPG_VISUAL_ASSET_BRIEFS =
  visualBriefsData as ArpgVisualAssetBriefsContent;

export function getArpgVisualAssetBriefSummary() {
  const briefs = [...ARPG_VISUAL_ASSET_BRIEFS.briefs].sort(
    (a, b) => a.priority - b.priority,
  );
  const totalBriefItems = briefs.reduce((sum, brief) => sum + brief.items.length, 0);
  const nextBrief = briefs.find((brief) => brief.status === "ready-for-generation") ?? briefs[0] ?? null;

  return {
    ...ARPG_VISUAL_ASSET_BRIEFS,
    briefs,
    nextBrief,
    briefCount: briefs.length,
    totalBriefItems,
    styleReferenceCount: ARPG_VISUAL_ASSET_BRIEFS.styleReferenceAssetIds.length,
  };
}
