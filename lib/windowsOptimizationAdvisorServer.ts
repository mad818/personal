import { execFile } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { resolveRuntimeProjectRoot } from "./serverEnvRuntime.ts";
import {
  buildWindowsOptimizationAdvisor,
  normalizeWindowsOptimizationSnapshot,
  type WindowsOptimizationAdvisor,
} from "./windowsOptimizationAdvisor.ts";

const execFileAsync = promisify(execFile);

function fallbackSnapshot() {
  return normalizeWindowsOptimizationSnapshot({
    platform: process.platform,
    generatedAt: new Date().toISOString(),
    processorCount: os.cpus().length,
    uptimeHours: os.uptime() / 3600,
    memory: {
      totalBytes: os.totalmem(),
      freeBytes: os.freemem(),
    },
    availability: {
      disks: false,
      services: false,
      startupEntries: false,
      scheduledTasks: false,
    },
  });
}

export async function collectWindowsOptimizationAdvisor(): Promise<WindowsOptimizationAdvisor> {
  if (process.platform !== "win32") {
    return buildWindowsOptimizationAdvisor(fallbackSnapshot());
  }

  try {
    const collector = path.join(
      resolveRuntimeProjectRoot(),
      "scripts",
      "windows-optimization-snapshot.ps1",
    );
    const { stdout } = await execFileAsync(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        collector,
      ],
      {
        encoding: "utf8",
        timeout: 8_000,
        maxBuffer: 256 * 1024,
        windowsHide: true,
        shell: false,
      },
    );
    const parsed = JSON.parse(stdout) as Record<string, unknown>;
    const fallback = fallbackSnapshot();
    return buildWindowsOptimizationAdvisor(
      normalizeWindowsOptimizationSnapshot({
        ...parsed,
        processorCount: fallback.processorCount,
        uptimeHours: fallback.uptimeHours,
        memory: fallback.memory,
      }),
    );
  } catch {
    return buildWindowsOptimizationAdvisor(fallbackSnapshot());
  }
}
