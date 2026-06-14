#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const defaultMetricsDir = path.join(root, "docs", "metrics");
const artifactPrefix = "phone-local-acceptance-";
const artifactSuffix = ".json";
const PRIVATE_LAN_IP_RE =
  /\b(?:10(?:\.\d{1,3}){3}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}|192\.168(?:\.\d{1,3}){2})\b/g;
const WINDOWS_HOME_RE = /\b[A-Za-z]:\\Users\\[^\\\s`"']+(?:\\[^\s`"']*)?/g;

export const PHONE_ACCEPTANCE_REPORT_FIELDS = [
  "capturedAt",
  "baseUrl",
  "routes",
  "readinessSummary",
  "receiptPhoneProof",
  "combinedPhoneProof",
  "receiptLiveStatus",
  "missingReceiptProofItems",
  "blocked",
  "acceptanceReady",
];

function parseArgs(argv) {
  const args = {};
  for (const arg of argv) {
    if (arg.startsWith("--file=")) {
      args.file = arg.slice("--file=".length);
    } else if (arg.startsWith("--dir=")) {
      args.dir = arg.slice("--dir=".length);
    }
  }
  return args;
}

function sanitizeText(value) {
  return String(value ?? "")
    .replace(PRIVATE_LAN_IP_RE, "<LAN-IP>")
    .replace(WINDOWS_HOME_RE, "<repo-root>");
}

function relativePath(filePath) {
  return sanitizeText(path.relative(root, filePath) || filePath);
}

function boolLabel(value) {
  if (value === true) return "yes";
  if (value === false) return "no";
  return "unknown";
}

function statusLabel(value) {
  return sanitizeText(value || "unknown");
}

function resolveArtifactPath(args) {
  if (args.file) {
    return path.resolve(root, args.file);
  }

  const dir = path.resolve(root, args.dir ?? defaultMetricsDir);
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

function readArtifact(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    console.log(`Could not read sanitized artifact: ${relativePath(filePath)}`);
    console.log(sanitizeText(error instanceof Error ? error.message : String(error)));
    return null;
  }
}

function printRoutes(routes) {
  if (!Array.isArray(routes) || routes.length === 0) {
    console.log("Routes: none captured");
    return;
  }

  const passed = routes.filter((route) => route?.ok === true).length;
  console.log(`Routes: ${passed}/${routes.length} healthy`);
  for (const route of routes) {
    const state = route?.ok === true ? "OK" : "BLOCKED";
    const code = route?.status || "ERR";
    const duration = Number.isFinite(route?.durationMs)
      ? `${route.durationMs}ms`
      : "unknown";
    console.log(`  [${state}] ${sanitizeText(route?.route)} ${code} ${duration}`);
  }
}

function printReadiness(summary) {
  if (!summary) {
    console.log("Local/free readiness: unavailable");
    return;
  }

  console.log("Local/free readiness:");
  console.log(
    `  Free invariant: ${statusLabel(summary.freeInvariant?.status)} / charges users ${boolLabel(
      summary.freeInvariant?.chargesEndUsers,
    )}`,
  );
  console.log(
    `  Network mode: ${statusLabel(summary.networkMode?.status)} / ${statusLabel(
      summary.networkMode?.mode,
    )}`,
  );
  console.log(
    `  Paid APIs allowed: ${boolLabel(summary.paidApisAllowed?.allowed)}`,
  );
  console.log(
    `  Ollama: ${statusLabel(summary.ollama?.status)} / reachable ${boolLabel(
      summary.ollama?.reachable,
    )}`,
  );
  console.log(
    `  Model: ${statusLabel(summary.resolvedModel?.resolvedModel)}`,
  );
  console.log(
    `  Session authenticated: ${boolLabel(summary.session?.authenticated)}`,
  );
  console.log(
    `  Phone LAN: ${statusLabel(summary.phoneLan?.status)} / enabled ${boolLabel(
      summary.phoneLan?.enabled,
    )}`,
  );
}

function printProof(proof) {
  if (!proof) {
    console.log("Phone proof: unavailable");
    return;
  }

  console.log("Phone proof:");
  console.log(`  Phone opened: ${boolLabel(proof.phoneOpened)}`);
  console.log(`  Phone login: ${boolLabel(proof.phoneLogin)}`);
  console.log(`  Browser storage: ${boolLabel(proof.browserStorageReady)}`);
  console.log(`  PWA capable: ${boolLabel(proof.pwaCapable)}`);
  console.log(`  Ping receipt: ${boolLabel(proof.pingReceipt)}`);
  console.log(`  Local AI receipt: ${boolLabel(proof.localAiReceipt)}`);
  console.log(`  PWA installed: ${boolLabel(proof.pwaInstalled)}`);
  console.log(`  Receipt count: ${proof.receiptCount ?? 0}`);
  console.log(`  Mobile receipt count: ${proof.mobileReceiptCount ?? 0}`);
}

function printLiveStatus(status) {
  if (!status) {
    console.log("Live receipt status: unavailable");
    return;
  }

  console.log(
    `Live receipt status: ${status.acceptanceReady === true ? "ready" : "not ready"}`,
  );

  if (!Array.isArray(status.items) || status.items.length === 0) return;

  for (const item of status.items) {
    const state = item?.passed === true ? "OK" : "MISSING";
    console.log(`  [${state}] ${sanitizeText(item?.label || "Unnamed proof item")}`);
  }
}

function printMissingLabels(items) {
  if (!Array.isArray(items) || items.length === 0) {
    console.log("Missing receipt proof: none listed");
    return;
  }

  console.log("Missing receipt proof:");
  for (const item of items) console.log(`  - ${sanitizeText(item)}`);
}

function printBlocked(blocked) {
  if (!Array.isArray(blocked) || blocked.length === 0) {
    console.log("Blocked items: none");
    return;
  }

  console.log("Blocked items:");
  for (const item of blocked) console.log(`  - ${sanitizeText(item)}`);
}

function printNextAction(artifact) {
  if (artifact?.acceptanceReady === true) {
    console.log("Next action: phone/iPad acceptance is ready. Keep the artifact for proof.");
    return;
  }

  const blockers = Array.isArray(artifact?.blocked) ? artifact.blocked : [];
  if (blockers.some((item) => String(item).includes("Route "))) {
    console.log(
      "Next action: start the local phone runtime with npm run phone:lan:start, then rerun capture and this report.",
    );
    return;
  }

  if (
    blockers.some((item) =>
      String(item).toLowerCase().includes("phone proof missing"),
    )
  ) {
    console.log(
      "Next action: use the phone/iPad to open HQ, log in, send ping, ask one local AI prompt, install the PWA, rerun capture, then rerun this report.",
    );
    return;
  }

  console.log(
    "Next action: rerun npm run phone:acceptance:capture after the phone/iPad flow changes, then rerun this report.",
  );
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const artifactPath = resolveArtifactPath(args);

  console.log("Nexus phone acceptance report");
  console.log("No network calls are made. This command reads sanitized capture artifacts only.");
  console.log("");

  if (!artifactPath) {
    console.log("No sanitized phone acceptance capture artifact found.");
    console.log(
      "Next action: run npm run phone:acceptance:capture after attempting the phone/iPad flow.",
    );
    process.exit(0);
  }

  const artifact = readArtifact(artifactPath);
  if (!artifact) process.exit(1);

  console.log(`Artifact: ${relativePath(artifactPath)}`);
  console.log(`Captured: ${sanitizeText(artifact.capturedAt || "unknown")}`);
  console.log(`Base URL: ${sanitizeText(artifact.baseUrl || "unknown")}`);
  console.log(`Acceptance ready: ${artifact.acceptanceReady === true ? "true" : "false"}`);
  console.log("");

  printRoutes(artifact.routes);
  console.log("");
  printReadiness(artifact.readinessSummary);
  console.log("");
  printProof(artifact.combinedPhoneProof ?? artifact.receiptPhoneProof);
  console.log("");
  printLiveStatus(artifact.receiptLiveStatus);
  console.log("");
  printMissingLabels(artifact.missingReceiptProofItems);
  console.log("");
  printBlocked(artifact.blocked);
  console.log("");
  printNextAction(artifact);

  process.exit(0);
}

main();
