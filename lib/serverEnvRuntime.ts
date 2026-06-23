import { readFile } from "fs/promises";
import { join, resolve } from "path";

const ENV_CACHE_TTL = 5_000;

let envCache: Record<string, string> = {};
let envCacheTs = 0;

export function resolveRuntimeProjectRoot(cwd = process.cwd()) {
  const normalized = cwd.replace(/\\/g, "/");
  if (/(?:\/\.next|\/\.next-build)\/standalone$/.test(normalized)) {
    return resolve(cwd, "..", "..");
  }
  return cwd;
}

export function getRuntimeEnvFilePath(cwd = process.cwd()) {
  return join(resolveRuntimeProjectRoot(cwd), ".env.local");
}

export function assertAnchoredRuntimeEnvFilePath(
  filePath: string,
  cwd = process.cwd(),
) {
  const resolved = resolve(filePath);
  const expected = resolve(getRuntimeEnvFilePath(cwd));
  if (resolved !== expected) {
    throw new Error("Runtime env file path is outside the anchored project root");
  }
  return resolved;
}

export async function patchProcessEnvFromFile(): Promise<void> {
  const now = Date.now();
  if (now - envCacheTs < ENV_CACHE_TTL) return;
  envCacheTs = now;

  try {
    const content = await readFile(getRuntimeEnvFilePath(), "utf8");
    const parsed: Record<string, string> = {};

    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 0) continue;
      parsed[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
    }

    envCache = parsed;

    for (const [key, value] of Object.entries(parsed)) {
      if (value && !process.env[key]) process.env[key] = value;
    }
  } catch {
    // .env.local is optional in local-first installs.
  }
}

export async function getRuntimeEnvValue(key: string) {
  await patchProcessEnvFromFile();
  return (process.env[key] ?? envCache[key] ?? "").trim();
}
