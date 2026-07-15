import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveRuntimeProjectRoot } from "@/lib/serverEnvRuntime";

export interface DesktopSigningPlatformHint {
  platform: "macOS" | "Windows";
  configured: boolean;
  source: "tauri_config" | "env" | "none";
  note: string;
}

export interface DesktopSigningConfigHints {
  platforms: DesktopSigningPlatformHint[];
  signingConfigured: boolean;
  operatorEnvKeys: string[];
}

function readTauriBundleConfig(): {
  macIdentity: string | null;
  windowsDigest: string | null;
} {
  try {
    const root = resolveRuntimeProjectRoot();
    const raw = JSON.parse(
      readFileSync(
        join(root, "desktop", "src-tauri", "tauri.conf.json"),
        "utf8",
      ),
    ) as {
      bundle?: {
        macOS?: { signingIdentity?: string | null };
        windows?: { digestAlgorithm?: string };
      };
    };
    const macIdentity = raw.bundle?.macOS?.signingIdentity ?? null;
    return {
      macIdentity:
        typeof macIdentity === "string" && macIdentity.trim()
          ? macIdentity.trim()
          : null,
      windowsDigest: raw.bundle?.windows?.digestAlgorithm ?? null,
    };
  } catch {
    return { macIdentity: null, windowsDigest: null };
  }
}

export function readDesktopSigningConfigHints(): DesktopSigningConfigHints {
  const tauri = readTauriBundleConfig();
  const macFromConfig = Boolean(tauri.macIdentity);
  const macFromEnv = Boolean(process.env.NEXUS_MACOS_SIGNING_IDENTITY?.trim());
  const winFromEnv = Boolean(
    process.env.NEXUS_WINDOWS_SIGNING_THUMBPRINT?.trim(),
  );

  const platforms: DesktopSigningPlatformHint[] = [
    {
      platform: "macOS",
      configured: macFromConfig || macFromEnv,
      source: macFromConfig ? "tauri_config" : macFromEnv ? "env" : "none",
      note: macFromConfig
        ? "macOS signing identity present in tauri.conf.json."
        : macFromEnv
          ? "NEXUS_MACOS_SIGNING_IDENTITY is set (value not exposed)."
          : "Set bundle.macOS.signingIdentity or NEXUS_MACOS_SIGNING_IDENTITY.",
    },
    {
      platform: "Windows",
      configured: winFromEnv,
      source: winFromEnv ? "env" : "none",
      note: winFromEnv
        ? "NEXUS_WINDOWS_SIGNING_THUMBPRINT is set (value not exposed)."
        : "Install a code-signing cert and set NEXUS_WINDOWS_SIGNING_THUMBPRINT for release builds.",
    },
  ];

  const trustPath = join(
    resolveRuntimeProjectRoot(),
    "docs",
    "metrics",
    "desktop-trust-chain-status.json",
  );
  let trustConfigured = false;
  if (existsSync(trustPath)) {
    try {
      const raw = JSON.parse(readFileSync(trustPath, "utf8")) as {
        signingIdentity?: { configured?: boolean };
        signing?: { status?: string };
      };
      trustConfigured =
        Boolean(raw.signingIdentity?.configured) ||
        raw.signing?.status === "configured";
    } catch {
      /* unreadable */
    }
  }

  const signingConfigured =
    trustConfigured || platforms.some((platform) => platform.configured);

  return {
    platforms,
    signingConfigured,
    operatorEnvKeys: [
      "NEXUS_MACOS_SIGNING_IDENTITY",
      "NEXUS_WINDOWS_SIGNING_THUMBPRINT",
    ],
  };
}
