import { existsSync } from "fs";
import { join } from "path";
import { resolveRuntimeProjectRoot } from "@/lib/serverEnvRuntime";
import type { ToolCapabilityClass } from "@/lib/security/toolCapabilityPolicy";

export type ToolIsolationRequirement = "none" | "sandbox_required";
export type ToolIsolationStatus =
  | "not_required"
  | "ready"
  | "unavailable"
  | "blocked";

export type ToolIsolationAdapterInfo = {
  id: string;
  label: string;
  available: boolean;
  reason?: string | null;
  supportedExecTools: string[];
  requiredExecTools: number;
  approvedExecTools: number;
};

export type ToolIsolationDescriptor = {
  tool: string;
  capability: ToolCapabilityClass;
  requirement: ToolIsolationRequirement;
  status: ToolIsolationStatus;
  adapter: ToolIsolationAdapterInfo;
  blockedReason?: string;
};

const PROJECT_ROOT = resolveRuntimeProjectRoot();
const TOOL_ISOLATION_RUNNER = join(PROJECT_ROOT, "scripts", "tool-isolation-runner.mjs");

const SANDBOX_APPROVED_EXEC_TOOLS = [
  "n8n_run_workflow",
  "feynman_replicate_run",
  "feynman_docker_experiment",
] as const;

export function getToolIsolationRequirement(
  tool: string,
  capability: ToolCapabilityClass,
): ToolIsolationRequirement {
  if (capability !== "exec") return "none";
  return SANDBOX_APPROVED_EXEC_TOOLS.includes(
    tool as (typeof SANDBOX_APPROVED_EXEC_TOOLS)[number],
  )
    ? "sandbox_required"
    : "sandbox_required";
}

export function readToolIsolationAdapterInfo(): ToolIsolationAdapterInfo {
  const hasExec = Boolean(process.execPath?.trim());
  const hasRunner = existsSync(TOOL_ISOLATION_RUNNER);
  const available = hasExec && hasRunner;
  const reason = !hasExec
    ? "node_exec_missing"
    : !hasRunner
      ? "runner_missing"
      : null;
  return {
    id: "node_subprocess_v1",
    label: "Node subprocess boundary",
    available,
    reason,
    supportedExecTools: [...SANDBOX_APPROVED_EXEC_TOOLS],
    requiredExecTools: SANDBOX_APPROVED_EXEC_TOOLS.length,
    approvedExecTools: SANDBOX_APPROVED_EXEC_TOOLS.length,
  };
}

export function resolveToolIsolationDescriptor(
  tool: string,
  capability: ToolCapabilityClass,
): ToolIsolationDescriptor {
  const requirement = getToolIsolationRequirement(tool, capability);
  const adapter = readToolIsolationAdapterInfo();
  if (requirement === "none") {
    return {
      tool,
      capability,
      requirement,
      status: "not_required",
      adapter,
    };
  }

  if (!SANDBOX_APPROVED_EXEC_TOOLS.includes(
    tool as (typeof SANDBOX_APPROVED_EXEC_TOOLS)[number],
  )) {
    return {
      tool,
      capability,
      requirement,
      status: "blocked",
      adapter,
      blockedReason: "tool_not_isolation_approved",
    };
  }

  if (!adapter.available) {
    return {
      tool,
      capability,
      requirement,
      status: "unavailable",
      adapter,
      blockedReason: adapter.reason ?? "adapter_unavailable",
    };
  }

  return {
    tool,
    capability,
    requirement,
    status: "ready",
    adapter,
  };
}

export function readToolIsolationSummary() {
  const adapter = readToolIsolationAdapterInfo();
  const n8nDescriptor = resolveToolIsolationDescriptor("n8n_run_workflow", "exec");
  return {
    status: n8nDescriptor.status,
    adapterReady: adapter.available,
    adapter: {
      id: adapter.id,
      label: adapter.label,
    },
    requiredExecTools: adapter.requiredExecTools,
    approvedExecTools: adapter.approvedExecTools,
    supportedExecTools: adapter.supportedExecTools,
    reason: n8nDescriptor.blockedReason ?? adapter.reason ?? null,
  };
}
