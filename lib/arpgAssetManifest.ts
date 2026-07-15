import manifestData from "@/lib/arpgAssetManifestData.json";

export type ArpgAssetLicense =
  | "project-original"
  | "CC0-1.0"
  | "CC-BY-4.0"
  | "commercial-license";

export type ArpgGeneratedAssetToolId =
  | "gpt-image-2"
  | "seedance-2.0"
  | "other-operator-approved";

export type ArpgGeneratedAssetUse =
  | "character-portrait"
  | "enemy-card"
  | "gear-icon"
  | "location-card"
  | "outfit-card"
  | "sprite-seed"
  | "sprite-sheet"
  | "skill-icon"
  | "item-icon"
  | "tileset-reference"
  | "fx-reference"
  | "animation-reference"
  | "motion-study";

export type ArpgGeneratedAssetRightsPosture =
  | "operator-verified-commercial-use"
  | "internal-prototype-only";

export type ArpgGeneratedAssetCostPosture =
  | "free-tier-or-existing-access"
  | "optional-paid-operator-choice"
  | "forced-paid-dependency";

export type ArpgAssetKind =
  | "character-portrait"
  | "enemy-card"
  | "gear-icon"
  | "glb-model"
  | "gltf-model"
  | "texture"
  | "hdri"
  | "location-card"
  | "outfit-card"
  | "skill-icon"
  | "vfx-reference"
  | "ui-preview"
  | "concept-preview"
  | "procedural-model"
  | "sprite-sheet"
  | "tilemap"
  | "tileset"
  | "ui-icon"
  | "fx-sheet"
  | "audio";

export interface ArpgAssetManifestEntry {
  id: string;
  label: string;
  kind: ArpgAssetKind;
  role: string;
  localPath: string;
  sourceUrl: string;
  licenseProofUrl: string;
  author: string;
  license: ArpgAssetLicense;
  attribution: string;
  visibleCreditRequired: boolean;
  optimized: boolean;
  frameWidth?: number;
  frameHeight?: number;
  frameCount?: number;
  anchor?: "bottom-center" | "center" | "tile-origin" | "not-applicable";
  importCandidateId?: string;
  sourcePackId?: string;
  originalFormat?: string;
  importedAt?: string;
  optimizationNotes?: string;
  generation?: ArpgAssetGenerationMetadata;
  tags: string[];
}

export interface ArpgAssetGenerationMetadata {
  toolId: ArpgGeneratedAssetToolId;
  toolName: string;
  modelName: string;
  use: ArpgGeneratedAssetUse;
  promptRecordPath: string;
  sourceFramePath?: string;
  outputReviewPath?: string;
  operatorApproved: boolean;
  termsReviewedAt: string;
  rightsPosture: ArpgGeneratedAssetRightsPosture;
  costPosture: ArpgGeneratedAssetCostPosture;
  transformation: string;
}

export interface ArpgAssetSourcePolicy {
  name: string;
  url: string;
  defaultLicense: "CC0-first" | "CC-BY-guarded" | "commercial-reviewed";
  recommendedUse: string;
}

export interface ArpgGeneratedAssetToolPolicy {
  id: ArpgGeneratedAssetToolId;
  name: string;
  defaultUses: ArpgGeneratedAssetUse[];
  shippingPosture: string;
}

export const ARPG_ASSET_SOURCE_POLICY: ArpgAssetSourcePolicy[] = [
  {
    name: "Kenney",
    url: "https://kenney.nl/support",
    defaultLicense: "CC0-first",
    recommendedUse:
      "Low-poly props, interface icons, and small game-ready packs.",
  },
  {
    name: "Quaternius",
    url: "https://quaternius.com/faq.html",
    defaultLicense: "CC0-first",
    recommendedUse:
      "Stylized modular fantasy ruins, props, and character kits.",
  },
  {
    name: "Poly Haven",
    url: "https://polyhaven.com/license",
    defaultLicense: "CC0-first",
    recommendedUse:
      "HDRIs, lightweight PBR references, and occasional neutral props.",
  },
  {
    name: "ambientCG",
    url: "https://docs.ambientcg.com/license/",
    defaultLicense: "CC0-first",
    recommendedUse:
      "PBR materials to simplify stone, bronze, cloth, and floor textures.",
  },
  {
    name: "Sketchfab",
    url: "https://sketchfab.com/developers/download-api/guidelines",
    defaultLicense: "CC-BY-guarded",
    recommendedUse:
      "Only when attribution, license, author, and source URL are complete.",
  },
  {
    name: "Operator-approved commercial packs",
    url: "repo://assets/arpg/intake/approved/",
    defaultLicense: "commercial-reviewed",
    recommendedUse:
      "Only after Mario buys or approves a cheap commercial pack and a redacted proof record confirms browser-game runtime rights.",
  },
];

export const ARPG_GENERATED_ASSET_TOOL_POLICY: ArpgGeneratedAssetToolPolicy[] =
  [
    {
      id: "gpt-image-2",
      name: "GPT Image 2",
      defaultUses: [
        "character-portrait",
        "enemy-card",
        "gear-icon",
        "location-card",
        "outfit-card",
        "sprite-seed",
        "sprite-sheet",
        "skill-icon",
        "item-icon",
        "tileset-reference",
        "fx-reference",
      ],
      shippingPosture:
        "Optional operator-approved static art tool. Outputs must be reviewed, normalized, recorded, and rights-cleared before manifest intake.",
    },
    {
      id: "seedance-2.0",
      name: "Seedance 2.0",
      defaultUses: ["animation-reference", "motion-study", "fx-reference"],
      shippingPosture:
        "Optional operator-approved motion reference tool. Use for animation timing and frame studies unless a specific output is rights-cleared for runtime use.",
    },
    {
      id: "other-operator-approved",
      name: "Other operator-approved generator",
      defaultUses: [
        "character-portrait",
        "enemy-card",
        "gear-icon",
        "location-card",
        "outfit-card",
        "skill-icon",
        "sprite-seed",
        "item-icon",
        "fx-reference",
        "motion-study",
      ],
      shippingPosture:
        "Allowed only when the same prompt, rights, cost, provenance, normalization, and asset-ledger gates are satisfied.",
    },
  ];

export const ARPG_ASSET_MANIFEST = manifestData as ArpgAssetManifestEntry[];
