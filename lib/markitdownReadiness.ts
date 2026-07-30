/** Server-side MarkItDown configuration posture without subprocess execution. */
import { existsSync } from "node:fs";
import { delimiter, join } from "node:path";

/** Resolve an explicit binary or a matching executable already on PATH. */
export function resolveMarkItDownBin(): string | null {
  const envBin = process.env.MARKITDOWN_BIN?.trim();
  if (envBin && existsSync(envBin)) return envBin;
  if (envBin && !envBin.includes("/") && !envBin.includes("\\")) {
    return envBin;
  }

  const executableNames =
    process.platform === "win32"
      ? ["markitdown.exe", "markitdown.cmd", "markitdown.bat"]
      : ["markitdown"];
  for (const rawDirectory of (process.env.PATH ?? "").split(delimiter)) {
    const directory = rawDirectory.trim().replace(/^"|"$/g, "");
    if (!directory) continue;
    for (const executableName of executableNames) {
      const candidate = join(directory, executableName);
      if (existsSync(candidate)) return candidate;
    }
  }
  return null;
}

export function isMarkItDownConfigured(): boolean {
  return Boolean(resolveMarkItDownBin());
}
