#!/usr/bin/env node
/* eslint-disable no-console */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function main() {
  console.log("Desktop code signing — operator guide");
  console.log("");
  console.log("Artifacts:");
  console.log("  npm run desktop:tauri:build");
  console.log("  npm run desktop:trust-chain");
  console.log("");
  console.log("macOS (notarization lane):");
  console.log("  1. Set bundle.macOS.signingIdentity in desktop/src-tauri/tauri.conf.json");
  console.log("     OR export NEXUS_MACOS_SIGNING_IDENTITY in the build shell.");
  console.log("  2. Run notarization after signed DMG build (Apple Developer account required).");
  console.log("");
  console.log("Windows (MSI lane):");
  console.log("  1. Install an Authenticode code-signing certificate.");
  console.log("  2. Export NEXUS_WINDOWS_SIGNING_THUMBPRINT=<cert thumbprint> before build.");
  console.log("  3. Rebuild MSI and verify signature with signtool verify.");
  console.log("");
  console.log("Posture check:");
  console.log("  npm run desktop:trust-chain:check");
  console.log("  GET /api/status → readiness.desktopTrust");
  console.log("");

  const confPath = join(root, "desktop", "src-tauri", "tauri.conf.json");
  if (existsSync(confPath)) {
    const conf = JSON.parse(readFileSync(confPath, "utf8"));
    const mac = conf?.bundle?.macOS?.signingIdentity;
    const targets = conf?.bundle?.targets ?? [];
    console.log(`Tauri targets: ${targets.join(", ") || "none"}`);
    console.log(`macOS signingIdentity: ${mac ? "configured" : "not configured"}`);
  }

  const winThumb = process.env.NEXUS_WINDOWS_SIGNING_THUMBPRINT?.trim();
  const macEnv = process.env.NEXUS_MACOS_SIGNING_IDENTITY?.trim();
  console.log(`NEXUS_WINDOWS_SIGNING_THUMBPRINT: ${winThumb ? "set" : "unset"}`);
  console.log(`NEXUS_MACOS_SIGNING_IDENTITY: ${macEnv ? "set" : "unset"}`);
}

main();
