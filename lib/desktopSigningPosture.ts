import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  readDesktopSigningConfigHints,
  type DesktopSigningConfigHints,
} from "@/lib/desktopSigningConfig";
import { resolveRuntimeProjectRoot } from "@/lib/serverEnvRuntime";

export interface DesktopSigningPosture {
  signingConfigured: boolean;
  checksumsPresent: boolean;
  sbomPresent: boolean;
  headline: string;
  advisories: string[];
  platforms: DesktopSigningConfigHints["platforms"];
}

export function readDesktopSigningPosture(): DesktopSigningPosture {
  const root = resolveRuntimeProjectRoot();
  const signingHints = readDesktopSigningConfigHints();
  const checksumsPresent = existsSync(join(root, "desktop", "dist", "SHA256SUMS.txt"));
  const sbomPresent = existsSync(join(root, "docs", "metrics", "desktop-sbom.cdx.json"));
  let signingConfigured = signingHints.signingConfigured;
  const advisories: string[] = [];

  try {
    const trustPath = join(root, "docs", "metrics", "desktop-trust-chain-status.json");
    if (existsSync(trustPath)) {
      const raw = JSON.parse(readFileSync(trustPath, "utf8")) as {
        signingIdentity?: { configured?: boolean };
        signing?: { status?: string };
      };
      signingConfigured =
        signingConfigured ||
        Boolean(raw.signingIdentity?.configured) ||
        raw.signing?.status === "configured";
    }
  } catch {
    advisories.push("Trust-chain status artifact unreadable.");
  }

  if (!checksumsPresent) {
    advisories.push("Desktop SHA256SUMS.txt missing — run desktop packaging lane.");
  }
  if (!sbomPresent) {
    advisories.push("Desktop SBOM artifact missing — run npm run desktop:sbom.");
  }
  if (!signingConfigured) {
    advisories.push("Code signing not configured — run npm run desktop:signing:guide.");
  }

  const headline =
    signingConfigured && checksumsPresent && sbomPresent
      ? "Desktop trust artifacts ready; signing configured."
      : "Desktop artifacts partially ready — signing or packaging still open.";

  return {
    signingConfigured,
    checksumsPresent,
    sbomPresent,
    headline,
    advisories,
    platforms: signingHints.platforms,
  };
}
