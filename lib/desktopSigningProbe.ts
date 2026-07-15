import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveRuntimeProjectRoot } from "@/lib/serverEnvRuntime";

export interface DesktopSigningPreflightSummary {
  generatedAt: string | null;
  windowsThumbprintConfigured: boolean;
  windowsThumbprintValidFormat: boolean;
  windowsCodeSigningCertCount: number | null;
  windowsThumbprintMatchesStore: boolean | null;
  macosIdentityConfigured: boolean;
  prepared: boolean;
  releaseReady: boolean;
}

function readPreflightArtifact(): Record<string, unknown> | null {
  try {
    const path = join(
      resolveRuntimeProjectRoot(),
      "docs",
      "metrics",
      "desktop-signing-preflight-latest.json",
    );
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function readDesktopSigningPreflightSummary(): DesktopSigningPreflightSummary {
  const winThumb = process.env.NEXUS_WINDOWS_SIGNING_THUMBPRINT?.trim() ?? "";
  const macEnv = Boolean(process.env.NEXUS_MACOS_SIGNING_IDENTITY?.trim());
  const artifact = readPreflightArtifact();
  const thumbprintValid = /^[a-f0-9]{40}$/i.test(winThumb);

  const windowsCodeSigningCertCount =
    typeof artifact?.windowsCodeSigningCertCount === "number"
      ? artifact.windowsCodeSigningCertCount
      : null;
  const windowsThumbprintMatchesStore =
    typeof artifact?.windowsThumbprintMatchesStore === "boolean"
      ? artifact.windowsThumbprintMatchesStore
      : null;

  const macosIdentityConfigured =
    macEnv || Boolean(artifact?.macosIdentityConfigured);

  const prepared =
    thumbprintValid || macosIdentityConfigured || Boolean(artifact?.prepared);

  const releaseReady = Boolean(
    artifact?.releaseReady &&
    (windowsThumbprintMatchesStore === true || macosIdentityConfigured),
  );

  return {
    generatedAt:
      typeof artifact?.generatedAt === "string" ? artifact.generatedAt : null,
    windowsThumbprintConfigured: Boolean(winThumb),
    windowsThumbprintValidFormat: thumbprintValid,
    windowsCodeSigningCertCount,
    windowsThumbprintMatchesStore,
    macosIdentityConfigured,
    prepared,
    releaseReady,
  };
}
