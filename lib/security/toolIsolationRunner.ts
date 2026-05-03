import { spawn } from "child_process";
import { join } from "path";
import { resolveRuntimeProjectRoot } from "@/lib/serverEnvRuntime";

type IsolationRunnerResult = {
  ok: boolean;
  result?: string;
  error?: string;
};

function buildIsolatedEnv() {
  const env: NodeJS.ProcessEnv = {
    NODE_ENV: process.env.NODE_ENV ?? "production",
  };
  const passthroughKeys = [
    "PATH",
    "SystemRoot",
    "SYSTEMROOT",
    "WINDIR",
    "ComSpec",
    "COMSPEC",
    "TEMP",
    "TMP",
    "HOME",
    "USERPROFILE",
  ];
  for (const key of passthroughKeys) {
    if (process.env[key]) {
      env[key] = process.env[key];
    }
  }
  if (process.env.N8N_BASE_URL) env.N8N_BASE_URL = process.env.N8N_BASE_URL;
  if (process.env.N8N_API_KEY) env.N8N_API_KEY = process.env.N8N_API_KEY;
  return env;
}

export async function runToolInIsolation(
  tool: string,
  input: Record<string, unknown>,
): Promise<string> {
  const projectRoot = resolveRuntimeProjectRoot();
  const runnerPath = join(projectRoot, "scripts", "tool-isolation-runner.mjs");
  const input64 = Buffer.from(JSON.stringify(input), "utf-8").toString(
    "base64url",
  );
  return await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [runnerPath, "--tool", tool, "--input64", input64],
      {
        cwd: projectRoot,
        shell: false,
        windowsHide: true,
        env: buildIsolatedEnv(),
      },
    );
    let out = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("Tool isolation runner timed out."));
    }, 30_000);
    child.stdout.on("data", (chunk) => {
      out += String(chunk);
      if (out.length > 16_000) {
        out = out.slice(-16_000);
      }
    });
    child.stderr.on("data", (chunk) => {
      out += String(chunk);
      if (out.length > 16_000) {
        out = out.slice(-16_000);
      }
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(out.trim() || "Tool isolation runner failed."));
        return;
      }
      try {
        const parsed = JSON.parse(out.trim()) as IsolationRunnerResult;
        if (!parsed.ok) {
          reject(new Error(parsed.error || "Tool isolation runner failed."));
          return;
        }
        resolve(parsed.result ?? "No result.");
      } catch {
        reject(new Error("Tool isolation runner returned unreadable output."));
      }
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}
