import { ARPG_ASSET_MANIFEST, type ArpgAssetManifestEntry } from "@/lib/arpgAssetManifest";
import candidateData from "@/lib/arpgAssetCandidateSources.json";

export type ArpgAssetCandidatePriority = "critical" | "high" | "medium" | "guarded";

export interface ArpgAssetCandidateSource {
  id: string;
  label: string;
  provider: string;
  url: string;
  license:
    | "CC0-1.0"
    | "CC-BY-4.0"
    | "commercial-license"
    | "per-asset-review-required";
  formats: string[];
  priority: ArpgAssetCandidatePriority;
  targetRoles: string[];
  qualityReason: string;
  intakeNotes: string;
}

export interface ArpgRealAssetIntakeSummary {
  importedCount: number;
  importedModelCount: number;
  importedPreviewCount: number;
  importedEntries: ArpgAssetManifestEntry[];
  nextRequiredPacks: ArpgAssetCandidateSource[];
  blockedReason: string | null;
  intakeRawPath: string;
  intakeWorkPath: string;
  runtimeImportPath: string;
}

export const ARPG_ASSET_CANDIDATE_SOURCES =
  candidateData as ArpgAssetCandidateSource[];

function isImportedRuntimeAsset(asset: ArpgAssetManifestEntry) {
  return (
    asset.localPath.startsWith("public/arpg/imported/") ||
    asset.tags.includes("imported-real-asset") ||
    Boolean(asset.importCandidateId || asset.sourcePackId)
  );
}

export function getArpgRealAssetIntakeSummary(): ArpgRealAssetIntakeSummary {
  const importedEntries = ARPG_ASSET_MANIFEST.filter(isImportedRuntimeAsset);
  const importedModelCount = importedEntries.filter((asset) =>
    asset.kind === "glb-model" || asset.kind === "gltf-model",
  ).length;
  const importedPreviewCount = importedEntries.filter((asset) =>
    asset.kind === "ui-preview" || asset.kind === "concept-preview",
  ).length;
  const nextRequiredPacks = ARPG_ASSET_CANDIDATE_SOURCES.filter((candidate) =>
    candidate.priority === "critical" || candidate.priority === "high",
  ).slice(0, 5);

  return {
    importedCount: importedEntries.length,
    importedModelCount,
    importedPreviewCount,
    importedEntries,
    nextRequiredPacks,
    blockedReason: importedEntries.length
      ? null
      : "Awaiting official CC0, clean CC-BY, or operator-approved commercial pack files in the ignored intake folders before a real model preview can be shown.",
    intakeRawPath: "assets/arpg/intake/raw/",
    intakeWorkPath: "assets/arpg/intake/work/",
    runtimeImportPath: "public/arpg/imported/",
  };
}
