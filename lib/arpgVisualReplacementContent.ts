import replacementData from "@/lib/arpgVisualReplacementContent.json";

export type ArpgVisualReplacementKind =
  | "location-card"
  | "character-portrait"
  | "gear-icon";

export interface ArpgVisualReplacementTarget {
  id: string;
  label: string;
  kind: ArpgVisualReplacementKind;
  replacesAssetIds: string[];
  briefItemId: string;
  fallbackAssetIds: string[];
  surfaceTargets: string[];
  acceptance: string;
  priority: number;
}

export interface ArpgVisualReplacementContent {
  schemaVersion: "mw6-arpg-visual-replacements-v1";
  title: string;
  summary: string;
  replacementBatchId: string;
  targetStyleAssetIds: string[];
  retiredAssetIds: string[];
  approvedFallbackAssetIds: string[];
  policies: string[];
  targets: ArpgVisualReplacementTarget[];
}

export const ARPG_VISUAL_REPLACEMENT_CONTENT =
  replacementData as ArpgVisualReplacementContent;

export function getArpgVisualReplacementSummary() {
  const targets = [...ARPG_VISUAL_REPLACEMENT_CONTENT.targets].sort(
    (a, b) => a.priority - b.priority,
  );
  const targetKinds = new Set(targets.map((target) => target.kind));
  const surfaceTargets = new Set(
    targets.flatMap((target) => target.surfaceTargets),
  );
  const fallbackAssetIds = new Set(
    targets.flatMap((target) => target.fallbackAssetIds),
  );

  return {
    ...ARPG_VISUAL_REPLACEMENT_CONTENT,
    targets,
    targetCount: targets.length,
    targetKindCount: targetKinds.size,
    surfaceTargetCount: surfaceTargets.size,
    fallbackAssetCount: fallbackAssetIds.size,
    retiredAssetCount: ARPG_VISUAL_REPLACEMENT_CONTENT.retiredAssetIds.length,
    policyCount: ARPG_VISUAL_REPLACEMENT_CONTENT.policies.length,
  };
}
