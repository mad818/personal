import { z } from "zod";

export const INTERNAL_WORKBENCH_SUPPORT = "internal" as const;

export const workbenchSimulationModeSchema = z.enum(["live", "seeded", "derived"]);
export type WorkbenchSimulationMode = z.infer<typeof workbenchSimulationModeSchema>;

export const internalWorkbenchMetaSchema = z.object({
  support: z.literal(INTERNAL_WORKBENCH_SUPPORT),
  surface: z.string().min(1).max(64),
  storage: z.literal("local-file"),
  validation: z.literal("zod"),
  simulation: z.object({
    mode: workbenchSimulationModeSchema,
    label: z.string().min(1).max(96),
  }),
  warnings: z.array(z.string().min(1).max(240)).default([]),
  timestamp: z.number().int().nonnegative(),
});

export type InternalWorkbenchMeta = z.infer<typeof internalWorkbenchMetaSchema>;

const workflowNodeTypeSchema = z.enum([
  "source",
  "agent",
  "transform",
  "approval",
  "scheduler",
  "sink",
]);

const workflowPortSchema = z.object({
  id: z.string().min(1).max(80),
  label: z.string().min(1).max(120),
});

const workflowNodeSchema = z.object({
  id: z.string().min(1).max(80),
  type: workflowNodeTypeSchema,
  title: z.string().min(1).max(120),
  detail: z.string().min(1).max(600),
  x: z.number().finite(),
  y: z.number().finite(),
  inputs: z.array(workflowPortSchema).max(12).optional(),
  outputs: z.array(workflowPortSchema).max(12).optional(),
  config: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
});

const workflowEdgeSchema = z.object({
  id: z.string().min(1).max(80),
  from: z.string().min(1).max(80),
  to: z.string().min(1).max(80),
  label: z.string().max(160).optional(),
});

export const sweepTheaterSchema = z.enum([
  "markets",
  "cyber",
  "geopolitics",
  "air-sea",
  "infra",
  "watchlist",
]);

export const workflowDefinitionSchema = z.object({
  id: z.string().min(1).max(80),
  name: z.string().min(1).max(160),
  description: z.string().min(1).max(1000),
  theater: sweepTheaterSchema,
  tags: z.array(z.string().min(1).max(40)).max(24),
  version: z.number().int().positive(),
  updatedAt: z.string().datetime(),
  approvalMode: z.enum(["human_gate", "approve_on_write", "observe"]),
  nodes: z.array(workflowNodeSchema).min(1).max(24),
  edges: z.array(workflowEdgeSchema).max(48),
});

export const workflowRunRequestSchema = z.object({
  workflowId: z.string().min(1).max(80),
});

export const registryItemSchema = z.object({
  id: z.string().min(1).max(120),
  title: z.string().min(1).max(160),
  type: z.enum([
    "tool",
    "dataset",
    "prompt",
    "playbook",
    "workflow",
    "evidence_pack",
    "media_kit",
    "model",
    "external_link",
  ]),
  summary: z.string().min(1).max(1200),
  owner: z.string().min(1).max(120),
  custody: z.string().min(1).max(120),
  costTier: z.enum([
    "free",
    "limited_free",
    "open_source",
    "byok",
    "free_local",
    "license_check",
  ]),
  status: z.enum(["ready", "watch", "draft", "archived"]),
  sourceUrl: z.string().url().optional(),
  license: z.string().min(1).max(120),
  tags: z.array(z.string().min(1).max(40)).max(24),
  reminder: z.string().max(160).optional(),
  savedFilter: z.string().max(80).optional(),
  lastReviewedAt: z.string().datetime(),
  notes: z.string().max(1200).optional(),
});

export const assetKitSchema = z.object({
  id: z.string().min(1).max(120),
  title: z.string().min(1).max(160),
  summary: z.string().min(1).max(1200),
  itemIds: z.array(z.string().min(1).max(120)).max(64),
  owner: z.string().min(1).max(120),
  status: z.enum(["ready", "watch", "draft", "archived"]),
  reminder: z.string().max(160).optional(),
  lastReviewedAt: z.string().datetime(),
});

export const registryMutationSchema = z.union([
  z.object({ item: registryItemSchema, kit: z.undefined().optional() }),
  z.object({ item: z.undefined().optional(), kit: assetKitSchema }),
]);

export const modelLabCreateRequestSchema = z.object({
  title: z.string().trim().min(1).max(160),
  mutationFamilies: z.array(z.string().trim().min(1).max(80)).min(1).max(12),
  models: z.array(z.string().trim().min(1).max(80)).min(1).max(8),
  promptLabel: z.string().trim().min(1).max(120),
  operatorNotes: z.string().trim().max(1200).optional(),
});

export const securityScenarioSchema = z.object({
  id: z.string().min(1).max(120),
  title: z.string().min(1).max(160),
  family: z.string().min(1).max(120),
  source: z.enum(["wstg-v42", "ai-surface"]),
  status: z.enum(["not-started", "monitoring", "covered", "attention", "blocked"]),
  owner: z.string().min(1).max(120),
  evidence: z.string().min(1).max(1200),
  remediation: z.string().min(1).max(1200),
  links: z.array(z.string().url()).max(12),
  updatedAt: z.string().datetime(),
});

export const securityRunSchema = z.object({
  id: z.string().min(1).max(120),
  scenarioId: z.string().min(1).max(120),
  result: z.enum(["pass", "warn", "fail"]),
  summary: z.string().min(1).max(1000),
  evidenceUrl: z.string().url().optional(),
  createdAt: z.string().datetime(),
});

export const sweepsRequestSchema = z.object({
  theater: sweepTheaterSchema.optional(),
  persistSnapshot: z.boolean().optional(),
});

export const geoDeltaObservationSchema = z.object({
  id: z.string().min(1).max(120),
  label: z.string().min(1).max(120),
  theater: sweepTheaterSchema,
  severity: z.enum(["low", "medium", "high"]),
  lat: z.number().gte(-90).lte(90),
  lon: z.number().gte(-180).lte(180),
  beforeLabel: z.string().min(1).max(160),
  afterLabel: z.string().min(1).max(240),
  note: z.string().min(1).max(600),
});

export const geoDeltaSnapshotSchema = z.object({
  id: z.string().min(1).max(120),
  theater: sweepTheaterSchema,
  title: z.string().min(1).max(160),
  summary: z.string().min(1).max(1200),
  severity: z.enum(["low", "medium", "high"]),
  capturedAt: z.string().datetime(),
  observations: z.array(geoDeltaObservationSchema).max(32),
});

export type FlattenedZodIssue = {
  path: string;
  message: string;
};

export function flattenZodIssues(error: z.ZodError): FlattenedZodIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.join(".") || "root",
    message: issue.message,
  }));
}

export function simulationLabel(mode: WorkbenchSimulationMode) {
  switch (mode) {
    case "seeded":
      return "Seeded defaults";
    case "derived":
      return "Derived or simulated";
    default:
      return "Live local persistence";
  }
}
