export type WorkflowNodeType =
  | "source"
  | "agent"
  | "transform"
  | "approval"
  | "scheduler"
  | "sink";

export type WorkflowRunStatus = "idle" | "running" | "completed" | "failed";
export type ArtifactStatus = "draft" | "approved" | "queued";
export type RegistryItemType =
  | "tool"
  | "dataset"
  | "prompt"
  | "playbook"
  | "workflow"
  | "evidence_pack"
  | "media_kit"
  | "model"
  | "external_link";
export type RegistryCostTier =
  | "free"
  | "limited_free"
  | "open_source"
  | "byok"
  | "free_local"
  | "license_check";
export type RegistryStatus = "ready" | "watch" | "draft" | "archived";
export type SecurityScenarioSource = "wstg-v42" | "ai-surface";
export type SecurityScenarioStatus =
  | "not-started"
  | "monitoring"
  | "covered"
  | "attention"
  | "blocked";
export type SecurityRunResult = "pass" | "warn" | "fail";
export type ModelLabVerdict = "stable" | "guarded" | "leaky";
export type ModelSafetyEvaluationMode = "passive-safety";
export type SweepTheater =
  | "markets"
  | "cyber"
  | "geopolitics"
  | "air-sea"
  | "infra"
  | "watchlist";
export type SweepSeverity = "low" | "medium" | "high";

export interface WorkflowPort {
  id: string;
  label: string;
}

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  title: string;
  detail: string;
  x: number;
  y: number;
  inputs?: WorkflowPort[];
  outputs?: WorkflowPort[];
  config?: Record<string, string | number | boolean>;
}

export interface WorkflowEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  theater: SweepTheater;
  tags: string[];
  version: number;
  updatedAt: string;
  approvalMode: "human_gate" | "approve_on_write" | "observe";
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface WorkflowRunStep {
  id: string;
  label: string;
  kind: WorkflowNodeType;
  status: Exclude<WorkflowRunStatus, "idle">;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  summary: string;
}

export interface OutputArtifact {
  id: string;
  workflowId: string;
  workflowRunId: string;
  title: string;
  kind: RegistryItemType;
  target: "vault" | "notification" | "telegram" | "download" | "review";
  status: ArtifactStatus;
  summary: string;
  createdAt: string;
}

export interface WorkflowRun {
  id: string;
  workflowId: string;
  workflowName: string;
  status: WorkflowRunStatus;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  theater: SweepTheater;
  summary: string;
  steps: WorkflowRunStep[];
  artifacts: OutputArtifact[];
}

export interface RegistryItem {
  id: string;
  title: string;
  type: RegistryItemType;
  summary: string;
  owner: string;
  custody: string;
  costTier: RegistryCostTier;
  status: RegistryStatus;
  sourceUrl?: string;
  license: string;
  tags: string[];
  reminder?: string;
  savedFilter?: string;
  lastReviewedAt: string;
  notes?: string;
}

export interface AssetKit {
  id: string;
  title: string;
  summary: string;
  itemIds: string[];
  owner: string;
  status: RegistryStatus;
  reminder?: string;
  lastReviewedAt: string;
}

export interface SecurityScenario {
  id: string;
  title: string;
  family: string;
  source: SecurityScenarioSource;
  status: SecurityScenarioStatus;
  owner: string;
  evidence: string;
  remediation: string;
  links: string[];
  updatedAt: string;
}

export interface SecurityRun {
  id: string;
  scenarioId: string;
  result: SecurityRunResult;
  summary: string;
  evidenceUrl?: string;
  createdAt: string;
}

export interface ModelLabVariantResult {
  id: string;
  model: string;
  promptLabel: string;
  refusalScore: number;
  leakageRisk: number;
  stability: number;
  usefulness: number;
  verdict: ModelLabVerdict;
  note: string;
  safetyMetrics?: ModelSafetyMetricSet;
}

export interface ModelSafetyMetricSet {
  refusalConsistency: number;
  policyRobustness: number;
  coherence: number;
  harmlessHelpfulness: number;
}

export interface ModelSafetyEvaluationManifest {
  schemaVersion: 1;
  mode: ModelSafetyEvaluationMode;
  localOnly: true;
  evidenceOnly: true;
  telemetry: "disabled";
  modelMutation: "disabled";
  steeringVectors: "disabled";
  remoteCodeExecution: "disabled";
  modelUploads: "disabled";
  metrics: string[];
  prohibitedCapabilities: string[];
  sourceAdaptation: string;
}

export interface ModelLabRun {
  id: string;
  title: string;
  mutationFamilies: string[];
  isolationMode: "operator-only";
  evaluationMode?: ModelSafetyEvaluationMode;
  createdAt: string;
  operatorNotes?: string;
  manifest?: ModelSafetyEvaluationManifest;
  variants: ModelLabVariantResult[];
}

export interface GeoDeltaObservation {
  id: string;
  label: string;
  theater: SweepTheater;
  severity: SweepSeverity;
  lat: number;
  lon: number;
  beforeLabel: string;
  afterLabel: string;
  note: string;
}

export interface GeoDeltaSnapshot {
  id: string;
  theater: SweepTheater;
  title: string;
  summary: string;
  severity: SweepSeverity;
  capturedAt: string;
  observations: GeoDeltaObservation[];
}

export interface SweepSourceResult {
  id: string;
  label: string;
  endpoint: string;
  status: "ok" | "error";
  durationMs: number;
  count: number;
  summary: string;
}

export interface SweepBundle {
  id: string;
  theater: SweepTheater;
  startedAt: string;
  completedAt: string;
  severity: SweepSeverity;
  summary: string;
  sources: SweepSourceResult[];
}

export interface AssimilationState {
  version: number;
  updatedAt: string;
  workflows: WorkflowDefinition[];
  workflowRuns: WorkflowRun[];
  registryItems: RegistryItem[];
  assetKits: AssetKit[];
  securityScenarios: SecurityScenario[];
  securityRuns: SecurityRun[];
  modelLabRuns: ModelLabRun[];
  geoDeltaSnapshots: GeoDeltaSnapshot[];
}
