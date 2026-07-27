import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import {
  DEFAULT_ASSET_KITS,
  DEFAULT_GEO_DELTA_SNAPSHOTS,
  DEFAULT_MODEL_LAB_RUNS,
  DEFAULT_REGISTRY_ITEMS,
  DEFAULT_SECURITY_RUNS,
  DEFAULT_SECURITY_SCENARIOS,
  DEFAULT_WORKFLOWS,
} from "@/lib/assimilation/seeds";
import type {
  AssetKit,
  AssimilationState,
  GeoDeltaSnapshot,
  ModelLabRun,
  RegistryItem,
  SecurityRun,
  SecurityScenario,
  WorkflowDefinition,
  WorkflowRun,
} from "@/lib/assimilation/types";
import { mergeMissingWorkflowDefinitions } from "@/lib/workflowDefinition";

const DATA_DIR =
  process.env.NEXUS_DATA_DIR ??
  path.join(process.cwd(), "agent-workspace", "assimilation");
const DATA_FILE = path.join(DATA_DIR, "state.json");

function defaultState(): AssimilationState {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    workflows: DEFAULT_WORKFLOWS,
    workflowRuns: [],
    registryItems: DEFAULT_REGISTRY_ITEMS,
    assetKits: DEFAULT_ASSET_KITS,
    securityScenarios: DEFAULT_SECURITY_SCENARIOS,
    securityRuns: DEFAULT_SECURITY_RUNS,
    modelLabRuns: DEFAULT_MODEL_LAB_RUNS,
    geoDeltaSnapshots: DEFAULT_GEO_DELTA_SNAPSHOTS,
  };
}

export function mergeMissingDefaultWorkflows(
  workflows: WorkflowDefinition[],
): WorkflowDefinition[] {
  return mergeMissingWorkflowDefinitions(workflows, DEFAULT_WORKFLOWS);
}

async function ensureStateFile() {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    await readFile(DATA_FILE, "utf-8");
  } catch {
    await writeFile(
      DATA_FILE,
      JSON.stringify(defaultState(), null, 2),
      "utf-8",
    );
  }
}

export async function readAssimilationState(): Promise<AssimilationState> {
  await ensureStateFile();
  try {
    const raw = await readFile(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw) as Partial<AssimilationState>;
    const fallback = defaultState();
    return {
      version: parsed.version ?? fallback.version,
      updatedAt: parsed.updatedAt ?? fallback.updatedAt,
      workflows: mergeMissingDefaultWorkflows(
        parsed.workflows ?? fallback.workflows,
      ),
      workflowRuns: parsed.workflowRuns ?? fallback.workflowRuns,
      registryItems: parsed.registryItems ?? fallback.registryItems,
      assetKits: parsed.assetKits ?? fallback.assetKits,
      securityScenarios: parsed.securityScenarios ?? fallback.securityScenarios,
      securityRuns: parsed.securityRuns ?? fallback.securityRuns,
      modelLabRuns: parsed.modelLabRuns ?? fallback.modelLabRuns,
      geoDeltaSnapshots: parsed.geoDeltaSnapshots ?? fallback.geoDeltaSnapshots,
    };
  } catch {
    const fallback = defaultState();
    await writeAssimilationState(fallback);
    return fallback;
  }
}

export async function writeAssimilationState(
  nextState: AssimilationState,
): Promise<void> {
  await ensureStateFile();
  const payload: AssimilationState = {
    ...nextState,
    updatedAt: new Date().toISOString(),
  };
  await writeFile(DATA_FILE, JSON.stringify(payload, null, 2), "utf-8");
}

function upsertById<T extends { id: string }>(items: T[], item: T): T[] {
  const existingIndex = items.findIndex((entry) => entry.id === item.id);
  if (existingIndex === -1) return [item, ...items];
  const next = [...items];
  next[existingIndex] = item;
  return next;
}

export async function listWorkflows(): Promise<WorkflowDefinition[]> {
  return (await readAssimilationState()).workflows;
}

export async function saveWorkflow(
  workflow: WorkflowDefinition,
): Promise<WorkflowDefinition> {
  const state = await readAssimilationState();
  const next: WorkflowDefinition = {
    ...workflow,
    updatedAt: new Date().toISOString(),
  };
  await writeAssimilationState({
    ...state,
    workflows: upsertById(state.workflows, next),
  });
  return next;
}

export async function listWorkflowRuns(): Promise<WorkflowRun[]> {
  return (await readAssimilationState()).workflowRuns;
}

export async function saveWorkflowRun(run: WorkflowRun): Promise<WorkflowRun> {
  const state = await readAssimilationState();
  await writeAssimilationState({
    ...state,
    workflowRuns: upsertById(state.workflowRuns, run),
  });
  return run;
}

export async function listRegistryItems(): Promise<RegistryItem[]> {
  return (await readAssimilationState()).registryItems;
}

export async function listAssetKits(): Promise<AssetKit[]> {
  return (await readAssimilationState()).assetKits;
}

export async function saveRegistryItem(
  item: RegistryItem,
): Promise<RegistryItem> {
  const state = await readAssimilationState();
  const next: RegistryItem = {
    ...item,
    lastReviewedAt: item.lastReviewedAt || new Date().toISOString(),
  };
  await writeAssimilationState({
    ...state,
    registryItems: upsertById(state.registryItems, next),
  });
  return next;
}

export async function saveAssetKit(kit: AssetKit): Promise<AssetKit> {
  const state = await readAssimilationState();
  await writeAssimilationState({
    ...state,
    assetKits: upsertById(state.assetKits, kit),
  });
  return kit;
}

export async function listSecurityScenarios(): Promise<SecurityScenario[]> {
  return (await readAssimilationState()).securityScenarios;
}

export async function saveSecurityScenario(
  scenario: SecurityScenario,
): Promise<SecurityScenario> {
  const state = await readAssimilationState();
  const next: SecurityScenario = {
    ...scenario,
    updatedAt: new Date().toISOString(),
  };
  await writeAssimilationState({
    ...state,
    securityScenarios: upsertById(state.securityScenarios, next),
  });
  return next;
}

export async function listSecurityRuns(): Promise<SecurityRun[]> {
  return (await readAssimilationState()).securityRuns;
}

export async function saveSecurityRun(run: SecurityRun): Promise<SecurityRun> {
  const state = await readAssimilationState();
  await writeAssimilationState({
    ...state,
    securityRuns: upsertById(state.securityRuns, run),
  });
  return run;
}

export async function listModelLabRuns(): Promise<ModelLabRun[]> {
  return (await readAssimilationState()).modelLabRuns;
}

export async function saveModelLabRun(run: ModelLabRun): Promise<ModelLabRun> {
  const state = await readAssimilationState();
  await writeAssimilationState({
    ...state,
    modelLabRuns: upsertById(state.modelLabRuns, run),
  });
  return run;
}

export async function listGeoDeltaSnapshots(): Promise<GeoDeltaSnapshot[]> {
  return (await readAssimilationState()).geoDeltaSnapshots;
}

export async function saveGeoDeltaSnapshot(
  snapshot: GeoDeltaSnapshot,
): Promise<GeoDeltaSnapshot> {
  const state = await readAssimilationState();
  await writeAssimilationState({
    ...state,
    geoDeltaSnapshots: upsertById(state.geoDeltaSnapshots, snapshot),
  });
  return snapshot;
}
