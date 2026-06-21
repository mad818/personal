#!/usr/bin/env node
/* eslint-disable no-console */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";

const root = process.cwd();
loadEnv({ path: join(root, ".env.local"), override: false });

const metricsDir = join(root, "docs", "metrics");

function readTauriMacIdentity() {
  try {
    const conf = JSON.parse(
      readFileSync(join(root, "desktop", "src-tauri", "tauri.conf.json"), "utf8"),
    );
    const identity = conf?.bundle?.macOS?.signingIdentity;
    return typeof identity === "string" && identity.trim() ? identity.trim() : null;
  } catch {
    return null;
  }
}

function probeWindowsCodeSigningCerts(thumbprint) {
  if (process.platform !== "win32") {
    return {
      platform: "win32",
      available: false,
      codeSigningCertCount: null,
      thumbprintMatchesStore: null,
      suggestedThumbprint: null,
    };
  }

  const ps = [
    "$codeSigningOids = @('1.3.6.1.5.5.7.3.3')",
    "$certs = @()",
    "foreach ($store in @('Cert:\\CurrentUser\\My','Cert:\\LocalMachine\\My')) {",
    "  $certs += Get-ChildItem $store -ErrorAction SilentlyContinue | Where-Object {",
    "    $eku = $_.EnhancedKeyUsageList",
    "    if (-not $eku) { return $false }",
    "    foreach ($usage in $eku) {",
    "      if ($codeSigningOids -contains $usage.Value) { return $true }",
    "      if ($usage.FriendlyName -match 'Code Signing') { return $true }",
    "    }",
    "    return $false",
    "  }",
    "}",
    "$certs = $certs | Sort-Object Thumbprint -Unique",
    "$count = @($certs).Count",
    "$first = $certs | Select-Object -First 1",
    "$suggested = if ($first) { $first.Thumbprint } else { '' }",
    "$match = $false",
    thumbprint
      ? `$match = @($certs | Where-Object { $_.Thumbprint -ieq '${thumbprint.replace(/'/g, "''")}' }).Count -gt 0`
      : "",
    "Write-Output \"count=$count\"",
    "Write-Output \"suggested=$suggested\"",
    "Write-Output \"match=$match\"",
  ]
    .filter(Boolean)
    .join("; ");

  const result = spawnSync(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-Command", ps],
    { encoding: "utf8", windowsHide: true },
  );

  if (result.status !== 0) {
    return {
      platform: "win32",
      available: true,
      codeSigningCertCount: null,
      thumbprintMatchesStore: null,
      error: (result.stderr || result.stdout || "probe failed").trim(),
    };
  }

  const lines = (result.stdout || "").split(/\r?\n/);
  const countLine = lines.find((line) => line.startsWith("count="));
  const matchLine = lines.find((line) => line.startsWith("match="));
  const suggestedLine = lines.find((line) => line.startsWith("suggested="));
  const suggested = suggestedLine?.split("=")[1]?.trim() || null;
  return {
    platform: "win32",
    available: true,
    codeSigningCertCount: Number.parseInt(countLine?.split("=")[1] ?? "0", 10),
    thumbprintMatchesStore: matchLine?.split("=")[1] === "True",
    suggestedThumbprint: suggested && /^[a-f0-9]{40}$/i.test(suggested) ? suggested : null,
  };
}

function main() {
  const winThumb = process.env.NEXUS_WINDOWS_SIGNING_THUMBPRINT?.trim() ?? "";
  const macEnv = process.env.NEXUS_MACOS_SIGNING_IDENTITY?.trim() ?? "";
  const macConfig = readTauriMacIdentity();
  const thumbprintValid = /^[a-f0-9]{40}$/i.test(winThumb);
  const windowsProbe = probeWindowsCodeSigningCerts(thumbprintValid ? winThumb : "");

  const macosIdentityConfigured = Boolean(macEnv || macConfig);
  const prepared =
    thumbprintValid ||
    macosIdentityConfigured ||
    (windowsProbe.codeSigningCertCount ?? 0) > 0;

  const releaseReady =
    (thumbprintValid && windowsProbe.thumbprintMatchesStore === true) ||
    macosIdentityConfigured;

  const artifact = {
    generatedAt: new Date().toISOString(),
    slice: "CP2.3-SIGNING-PREFLIGHT",
    windowsThumbprintConfigured: Boolean(winThumb),
    windowsThumbprintValidFormat: thumbprintValid,
    windowsCodeSigningCertCount: windowsProbe.codeSigningCertCount,
    windowsThumbprintMatchesStore: windowsProbe.thumbprintMatchesStore,
    suggestedWindowsThumbprint: windowsProbe.suggestedThumbprint,
    macosIdentityConfigured,
    macosSource: macConfig ? "tauri_config" : macEnv ? "env" : "none",
    prepared,
    releaseReady,
    operatorNext: releaseReady
      ? ["npm run desktop:tauri:build", "npm run desktop:trust-chain"]
      : [
          "npm run desktop:signing:guide",
          "Install code-signing cert and set NEXUS_WINDOWS_SIGNING_THUMBPRINT",
          "Set bundle.macOS.signingIdentity or NEXUS_MACOS_SIGNING_IDENTITY",
        ],
  };

  mkdirSync(metricsDir, { recursive: true });
  const latestPath = join(metricsDir, "desktop-signing-preflight-latest.json");
  writeFileSync(latestPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");

  console.log("Desktop signing preflight");
  console.log(`  Windows thumbprint configured: ${artifact.windowsThumbprintConfigured}`);
  console.log(`  Windows thumbprint valid format: ${artifact.windowsThumbprintValidFormat}`);
  console.log(
    `  Windows code-signing certs in store: ${
      artifact.windowsCodeSigningCertCount ?? "n/a (non-Windows or probe failed)"
    }`,
  );
  console.log(`  macOS identity configured: ${artifact.macosIdentityConfigured}`);
  console.log(`  Prepared: ${artifact.prepared}`);
  console.log(`  Release-ready signing: ${artifact.releaseReady}`);
  console.log(`  Wrote ${latestPath.replace(/\\/g, "/")}`);

  if (!prepared) {
    console.log("");
    console.log("Signing not prepared — run: npm run desktop:signing:guide");
    process.exit(0);
  }

  if (!winThumb && artifact.suggestedWindowsThumbprint) {
    console.log("");
    console.log(
      `Suggested thumbprint (first code-signing cert): ${artifact.suggestedWindowsThumbprint}`,
    );
    console.log("Set NEXUS_WINDOWS_SIGNING_THUMBPRINT in .env.local or build shell, then rerun.");
  }

  console.log("ok desktop-signing-preflight");
}

main();
