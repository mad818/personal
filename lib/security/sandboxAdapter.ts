import {
  readToolIsolationAdapterInfo,
  resolveToolIsolationDescriptor,
  type ToolIsolationDescriptor,
} from "@/lib/security/toolIsolationPolicy";
import { runToolInIsolation } from "@/lib/security/toolIsolationRunner";

export interface SandboxAdapterDescriptor {
  id: string;
  label: string;
  available: boolean;
  dryRunSupported: true;
  approvedTools: string[];
}

export function readSandboxAdapterDescriptor(): SandboxAdapterDescriptor {
  const adapter = readToolIsolationAdapterInfo();
  return {
    id: adapter.id,
    label: adapter.label,
    available: adapter.available,
    dryRunSupported: true,
    approvedTools: adapter.supportedExecTools,
  };
}

export function resolveSandboxExecution(tool: string): ToolIsolationDescriptor {
  return resolveToolIsolationDescriptor(tool, "exec");
}

export async function executeSandboxedTool(
  tool: string,
  input: Record<string, unknown>,
  options: { dryRun?: boolean } = {},
): Promise<string> {
  const descriptor = resolveSandboxExecution(tool);
  if (descriptor.status === "blocked") {
    return descriptor.blockedReason ?? "Tool blocked by isolation policy.";
  }
  if (descriptor.status === "unavailable") {
    return "Sandbox adapter unavailable — exec tool remains fail-closed.";
  }
  if (options.dryRun) {
    return `[sandbox dry-run] ${tool} would execute with keys: ${Object.keys(input).join(", ") || "none"}`;
  }
  return await runToolInIsolation(tool, input);
}
