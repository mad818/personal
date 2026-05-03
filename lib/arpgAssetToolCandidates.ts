import toolCandidateData from "@/lib/arpgAssetToolCandidateSources.json";

export type ArpgAssetToolCandidatePriority = "guarded";

export type ArpgAssetToolCandidateLicense = "MIT";

export type ArpgAssetToolCandidateKind =
  | "codex-skill-pipeline"
  | "sprite-normalization-tool";

export interface ArpgAssetToolCandidateSource {
  id: string;
  label: string;
  provider: string;
  url: string;
  license: ArpgAssetToolCandidateLicense;
  licenseProofUrl: string;
  toolKind: ArpgAssetToolCandidateKind;
  formats: string[];
  priority: ArpgAssetToolCandidatePriority;
  targetRoles: string[];
  qualityReason: string;
  intakeNotes: string;
  shippingPosture: string;
}

export const ARPG_ASSET_TOOL_CANDIDATE_SOURCES =
  toolCandidateData as ArpgAssetToolCandidateSource[];
