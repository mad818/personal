#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import { networkInterfaces } from "node:os";
import path from "node:path";

const root = process.cwd();
const defaultMetricsDir = path.join(root, "docs", "metrics");
const artifactPrefix = "phone-local-acceptance-";
const artifactSuffix = ".json";
const port = process.env.NEXUS_PHONE_LAN_PORT ?? process.env.NEXUS_RUNTIME_PORT ?? "3100";
const args = process.argv.slice(2);
const jsonOutput = args.includes("--json");
const checkOnly = args.includes("--check");
const PRIVATE_LAN_IP_RE =
  /\b(?:10(?:\.\d{1,3}){3}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}|192\.168(?:\.\d{1,3}){2})\b/g;
const WINDOWS_HOME_RE = /\b[A-Za-z]:\\Users\\[^\\\s`"']+(?:\\[^\s`"']*)?/g;

export const PHONE_ACCEPTANCE_GUIDE_FIELDS = [
  "artifact",
  "lanHqUrls",
  "proofChecklist",
  "desktopCommands",
  "phoneActions",
  "manualFallbackCommand",
  "nextAction",
];

function parseArgs(argv) {
  const parsed = {};
  for (const arg of argv) {
    if (arg.startsWith("--file=")) parsed.file = arg.slice("--file=".length);
    if (arg.startsWith("--dir=")) parsed.dir = arg.slice("--dir=".length);
  }
  return parsed;
}

function sanitizeText(value) {
  return String(value ?? "")
    .replace(PRIVATE_LAN_IP_RE, "<LAN-IP>")
    .replace(WINDOWS_HOME_RE, "<repo-root>")
    .replace(/\bBearer\s+[A-Za-z0-9._-]{8,}\b/g, "Bearer <redacted-local-token>");
}

function relativePath(filePath) {
  if (!filePath) return null;
  return sanitizeText(path.relative(root, filePath) || filePath).replace(/\\/g, "/");
}

function readLanAddresses() {
  const addresses = [];
  for (const entries of Object.values(networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (entry.family !== "IPv4" || entry.internal) continue;
      if (!entry.address || entry.address.startsWith("169.254.")) continue;
      addresses.push(entry.address);
    }
  }
  return Array.from(new Set(addresses)).sort();
}

function latestArtifact(dir) {
  if (!fs.existsSync(dir)) return null;
  const candidates = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .filter(
      (entry) =>
        entry.name.startsWith(artifactPrefix) && entry.name.endsWith(artifactSuffix),
    )
    .map((entry) => {
      const filePath = path.join(dir, entry.name);
      const stat = fs.statSync(filePath);
      return { filePath, mtimeMs: stat.mtimeMs, name: entry.name };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs || b.name.localeCompare(a.name));

  return candidates[0]?.filePath ?? null;
}

function resolveArtifact(parsedArgs) {
  if (parsedArgs.file) return path.resolve(root, parsedArgs.file);
  const dir = path.resolve(root, parsedArgs.dir ?? defaultMetricsDir);
  return latestArtifact(dir);
}

function readArtifact(filePath) {
  if (!filePath) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function proofSource(artifact) {
  return (
    artifact?.combinedPhoneProof ??
    artifact?.receiptPhoneProof ??
    artifact?.manualPhoneProof ??
    null
  );
}

function proofState(value) {
  if (value === true) return "done";
  if (value === false) return "missing";
  return "unknown";
}

function routeBlocked(artifact) {
  const blocked = Array.isArray(artifact?.blocked) ? artifact.blocked : [];
  return blocked.some((item) => /Route /i.test(String(item)));
}

function buildProofChecklist(artifact) {
  const proof = proofSource(artifact);
  const liveItems = Array.isArray(artifact?.receiptLiveStatus?.items)
    ? artifact.receiptLiveStatus.items
    : [];
  const liveByLabel = new Map(
    liveItems.map((item) => [String(item?.key ?? item?.label ?? ""), item]),
  );
  const lookupLive = (keys) => keys.map((key) => liveByLabel.get(key)).find(Boolean);
  const items = [
    {
      id: "phone-opened",
      label: "Open HQ from the phone/iPad LAN URL",
      state: proofState(proof?.phoneOpened ?? lookupLive(["phoneOpened"])?.passed),
    },
    {
      id: "phone-login",
      label: "Log in on the phone/iPad with your Nexus token",
      state: proofState(proof?.phoneLogin ?? lookupLive(["phoneLogin"])?.passed),
    },
    {
      id: "browser-storage",
      label: "Let the browser storage receipt save locally",
      state: proofState(
        proof?.browserStorageReady ?? lookupLive(["browserStorageReady"])?.passed,
      ),
    },
    {
      id: "ping",
      label: "Send ping from HQ or COMMAND",
      state: proofState(proof?.pingReceipt ?? lookupLive(["pingReceipt"])?.passed),
    },
    {
      id: "local-ai",
      label: "Ask one local Ollama prompt from the phone/iPad",
      state: proofState(
        proof?.localAiReceipt ?? lookupLive(["localAiReceipt"])?.passed,
      ),
    },
    {
      id: "pwa",
      label: "Install the PWA from the phone/iPad browser",
      state: proofState(proof?.pwaInstalled ?? lookupLive(["pwaInstalled"])?.passed),
    },
  ];

  return items;
}

function buildGuide(parsedArgs) {
  const artifactPath = resolveArtifact(parsedArgs);
  const artifact = readArtifact(artifactPath);
  const lanUrls = readLanAddresses().map((address) => `http://${address}:${port}`);
  const lanHqUrls = lanUrls.map((url) => `${url}/hq?focus=hq-chronicle`);
  const desktopHqUrl = `http://127.0.0.1:${port}/hq?focus=hq-chronicle`;
  const proofChecklist = buildProofChecklist(artifact);
  const missingProof = proofChecklist.filter((item) => item.state !== "done");
  const acceptanceReady =
    artifact?.acceptanceReady === true &&
    artifact?.receiptLiveStatus?.acceptanceReady === true;
  const runtimeBlocked = routeBlocked(artifact);
  const manualFallbackCommand =
    "npm run phone:acceptance:capture -- --phone-opened --phone-login --ping-receipt --local-ai-receipt --pwa-installed";
  const desktopCommands = [
    "npm run phone:lan:start",
    "npm run phone:acceptance:capture",
    "npm run phone:acceptance:report",
    "npm run offline:local:report",
    "npm run ops:first-three",
  ];
  const phoneActions = [
    "Open the HQ LAN URL on the phone or iPad.",
    "Log in with the configured Nexus token; do not paste the token into chat.",
    "Send ping from HQ or COMMAND.",
    "Ask one local AI prompt so the Ollama receipt can be recorded.",
    "Install the PWA from the browser menu.",
  ];
  const nextAction = acceptanceReady
    ? "Phone/iPad acceptance is complete in the latest sanitized artifact."
    : runtimeBlocked
      ? "Start the LAN runtime with npm run phone:lan:start, then use a phone/iPad to complete the checklist."
      : "Complete the missing phone/iPad checklist items, rerun capture, then rerun report and ops:first-three.";

  return {
    ok: true,
    artifact: artifact
      ? {
          path: relativePath(artifactPath),
          capturedAt: sanitizeText(artifact.capturedAt ?? "unknown"),
          acceptanceReady,
          receiptLiveReady: artifact?.receiptLiveStatus?.acceptanceReady === true,
        }
      : null,
    urls: {
      desktopHqUrl,
      lanHqUrls,
    },
    proofChecklist,
    missingProof,
    desktopCommands,
    phoneActions,
    manualFallbackCommand,
    nextAction,
  };
}

function printGuide(guide) {
  console.log("Nexus phone/iPad acceptance guide");
  console.log("No network calls are made. This command reads sanitized artifacts only.");
  console.log("No services are launched and no proof files are written.");
  console.log("");

  if (guide.artifact) {
    console.log(`Artifact: ${guide.artifact.path}`);
    console.log(`Captured: ${guide.artifact.capturedAt}`);
    console.log(`Acceptance ready: ${guide.artifact.acceptanceReady ? "true" : "false"}`);
  } else {
    console.log("Artifact: none found");
    console.log("Acceptance ready: false");
  }
  console.log("");

  console.log("Desktop start command:");
  console.log(`  ${guide.desktopCommands[0]}`);
  console.log("");
  console.log(`Desktop HQ URL: ${guide.urls.desktopHqUrl}`);
  if (guide.urls.lanHqUrls.length) {
    console.log("Phone/iPad HQ URL candidates:");
    for (const url of guide.urls.lanHqUrls) console.log(`  ${url}`);
  } else {
    console.log("Phone/iPad HQ URL candidates: no LAN IPv4 address detected yet");
  }
  console.log("");

  console.log("Phone/iPad checklist:");
  for (const item of guide.proofChecklist) {
    const tag = item.state === "done" ? "DONE" : item.state === "missing" ? "MISSING" : "UNKNOWN";
    console.log(`  [${tag}] ${item.label}`);
  }
  console.log("");

  console.log("After the phone/iPad steps, run:");
  for (const command of guide.desktopCommands.slice(1)) console.log(`  ${command}`);
  console.log("");
  console.log("Manual fallback only if you actually completed every phone/iPad step:");
  console.log(`  ${guide.manualFallbackCommand}`);
  console.log("");
  console.log(`Next action: ${sanitizeText(guide.nextAction)}`);
}

const parsedArgs = parseArgs(args);
const guide = buildGuide(parsedArgs);

if (checkOnly) {
  console.log(
    `ok phone-acceptance-guide (${guide.artifact?.acceptanceReady ? "ready" : "not-ready"})`,
  );
} else if (jsonOutput) {
  console.log(JSON.stringify(guide, null, 2));
} else {
  printGuide(guide);
}

process.exit(0);
