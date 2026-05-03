import visualDirectionData from "@/lib/arpgVisualDirectionContent.json";
import { ARPG_ASSET_MANIFEST } from "@/lib/arpgAssetManifest";

export interface ArpgVisualProductionBatch {
  id: string;
  label: string;
  count: number;
  assetKinds: string[];
  targets: string[];
  acceptance: string;
}

export interface ArpgVisualDirectionContent {
  schemaVersion: "mw6-visual-direction-v1";
  title: string;
  summary: string;
  primaryRenderer: string;
  approvedStyleTarget: {
    label: string;
    description: string;
    assetIds: string[];
    requiredTraits: string[];
  };
  rejectedStyleSignals: string[];
  rejectedBatchIds: string[];
  nextProductionBatches: ArpgVisualProductionBatch[];
  promptStyleRules: string[];
}

export const ARPG_VISUAL_DIRECTION =
  visualDirectionData as ArpgVisualDirectionContent;

export function getArpgVisualDirectionSummary() {
  const styleTargetAssets = ARPG_VISUAL_DIRECTION.approvedStyleTarget.assetIds
    .map((assetId) => ARPG_ASSET_MANIFEST.find((asset) => asset.id === assetId))
    .filter(Boolean);

  const totalNextFrames = ARPG_VISUAL_DIRECTION.nextProductionBatches.reduce(
    (sum, batch) => sum + batch.count,
    0,
  );

  return {
    ...ARPG_VISUAL_DIRECTION,
    styleTargetAssets,
    approvedStyleAssetCount: styleTargetAssets.length,
    rejectedSignalCount: ARPG_VISUAL_DIRECTION.rejectedStyleSignals.length,
    nextBatchCount: ARPG_VISUAL_DIRECTION.nextProductionBatches.length,
    totalNextFrames,
  };
}
