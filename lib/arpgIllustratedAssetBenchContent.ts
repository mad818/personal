import benchData from "@/lib/arpgIllustratedAssetBenchContent.json";

export type ArpgIllustratedAssetKind =
  | "character-portrait"
  | "enemy-card"
  | "location-card"
  | "gear-icon"
  | "outfit-card"
  | "skill-icon"
  | "fx-sheet";

export interface ArpgIllustratedAssetBatch {
  id: string;
  label: string;
  manifestAssetId: string;
  kind: ArpgIllustratedAssetKind;
  role: string;
  sourceMode: "project-original-seed" | "operator-approved-generated" | "approved-external-2d-pack";
  status?: "approved" | "reference-only" | "rejected";
  rejectionReason?: string;
  sourcePath: string;
  runtimePath: string;
  promptRecordPath?: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  requiredTags: string[];
  previewLabels: string[];
}

export interface ArpgIllustratedPromptTemplate {
  id: string;
  target: string;
  template: string;
}

export interface ArpgIllustratedAssetBenchContent {
  schemaVersion: "mw6-illustrated-asset-bench-v1";
  title: string;
  summary: string;
  runtimePath: string;
  sourcePath: string;
  promptRecordPath: string;
  sourceModes: string[];
  operatorRules: string[];
  batches: ArpgIllustratedAssetBatch[];
  promptTemplates: ArpgIllustratedPromptTemplate[];
}

export const ARPG_ILLUSTRATED_ASSET_BENCH =
  benchData as ArpgIllustratedAssetBenchContent;

export function getArpgIllustratedAssetBenchSummary() {
  const batches = ARPG_ILLUSTRATED_ASSET_BENCH.batches;
  const approvedBatches = batches.filter((batch) => (batch.status ?? "approved") === "approved");
  const rejectedBatches = batches.filter((batch) => (batch.status ?? "approved") !== "approved");
  const totalFrames = approvedBatches.reduce((sum, batch) => sum + batch.frameCount, 0);
  const countsByKind = approvedBatches.reduce<Record<string, number>>((counts, batch) => {
    counts[batch.kind] = (counts[batch.kind] ?? 0) + batch.frameCount;
    return counts;
  }, {});

  return {
    title: ARPG_ILLUSTRATED_ASSET_BENCH.title,
    summary: ARPG_ILLUSTRATED_ASSET_BENCH.summary,
    runtimePath: ARPG_ILLUSTRATED_ASSET_BENCH.runtimePath,
    sourcePath: ARPG_ILLUSTRATED_ASSET_BENCH.sourcePath,
    promptRecordPath: ARPG_ILLUSTRATED_ASSET_BENCH.promptRecordPath,
    batchCount: batches.length,
    approvedBatchCount: approvedBatches.length,
    rejectedBatchCount: rejectedBatches.length,
    totalFrames,
    countsByKind,
    batches,
    approvedBatches,
    rejectedBatches,
    promptTemplates: ARPG_ILLUSTRATED_ASSET_BENCH.promptTemplates,
    operatorRules: ARPG_ILLUSTRATED_ASSET_BENCH.operatorRules,
  };
}
