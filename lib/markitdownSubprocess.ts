/**
 * Server-only: optional MarkItDown binary subprocess for binary PDF/DOCX/PPTX intake.
 * microsoft/markitdown — pip install markitdown or set MARKITDOWN_BIN to binary path.
 * Graceful fallback: returns error string, never throws or blocks.
 */
import "server-only";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

export interface MarkItDownResult {
  ok: boolean;
  markdown: string;
  error?: string;
  binUsed: string | null;
}

const MAX_OUTPUT_BYTES = 50_000;

/** Resolve the MarkItDown binary: MARKITDOWN_BIN env, then PATH probe. */
export function resolveMarkItDownBin(): string | null {
  const envBin = process.env.MARKITDOWN_BIN?.trim();
  if (envBin && existsSync(envBin)) return envBin;
  if (envBin) return envBin; // trust non-path value (e.g. "markitdown" on PATH)

  // Probe PATH on Windows and Unix
  const probeCmd = process.platform === "win32" ? "where" : "which";
  const probe = spawnSync(probeCmd, ["markitdown"], {
    encoding: "utf8",
    windowsHide: true,
    timeout: 3_000,
  });
  if (probe.status === 0 && probe.stdout.trim()) {
    return probe.stdout.trim().split(/\r?\n/)[0];
  }

  return null;
}

export function isMarkItDownConfigured(): boolean {
  return Boolean(resolveMarkItDownBin());
}

/**
 * Convert a binary file to markdown via the MarkItDown CLI subprocess.
 * filePath must be an absolute path to the file on disk.
 */
export function convertBinaryWithMarkItDown(filePath: string): MarkItDownResult {
  const bin = resolveMarkItDownBin();
  if (!bin) {
    return {
      ok: false,
      markdown: "",
      error:
        "MarkItDown binary not found. Set MARKITDOWN_BIN or install: pip install markitdown",
      binUsed: null,
    };
  }

  try {
    const result = spawnSync(bin, [filePath], {
      encoding: "utf8",
      timeout: 30_000,
      windowsHide: true,
      maxBuffer: MAX_OUTPUT_BYTES * 2,
    });

    if (result.error || result.status !== 0) {
      return {
        ok: false,
        markdown: "",
        error:
          result.stderr?.trim() ||
          result.error?.message ||
          "MarkItDown conversion failed.",
        binUsed: bin,
      };
    }

    const markdown = (result.stdout ?? "").trim().slice(0, MAX_OUTPUT_BYTES);
    return { ok: true, markdown, binUsed: bin };
  } catch {
    return {
      ok: false,
      markdown: "",
      error: "MarkItDown subprocess error.",
      binUsed: bin,
    };
  }
}

export function buildMarkItDownIntakeNote(): string {
  const bin = resolveMarkItDownBin();
  return (
    `[MARKITDOWN SUBPROCESS — binary PDF/DOCX/PPTX intake]\n` +
    `Status: ${bin ? "configured" : "not configured"}\n` +
    `${bin ? `Binary: ${bin}` : "Set MARKITDOWN_BIN or install: pip install markitdown"}\n` +
    `Fallback: graceful — unsupported formats return an intake note without blocking.\n`
  );
}
