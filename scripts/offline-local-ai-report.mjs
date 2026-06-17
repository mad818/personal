#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const defaultMetricsDir = path.join(root, "docs", "metrics");
const rollupPrefix = "readiness-rollup-";
const phonePrefix = "phone-local-acceptance-";
const jsonSuffix = ".json";
const PRIVATE_LAN_IP_RE =
  /\b(?:10(?:\.\d{1,3}){3}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}|192\.168(?:\.\d{1,3}){2})\b/g;
const WINDOWS_HOME_RE = /\b[A-Za-z]:\\Users\\[^\\\s`"']+(?:\\[^\s`"']*)?/g;

export const OFFLINE_LOCAL_AI_REPORT_FIELDS = [
  "readinessSummary",
  "combinedPhoneProof",
  "manualPhoneProof",
  "receiptPhoneProof",
  "localAiOfflineReady",
  "localAiReceipt",
  "blocked",
];

function parseArgs(argv) {
  const args = {};
  for (const arg of argv) {
    if (arg.startsWith("--rollup=")) {
      args.rollup = arg.slice("--rollup=".length);
    } else if (arg.startsWith("--phone=")) {
      args.phone = arg.slice("--phone=".length);
    } else if (arg.startsWith("--dir=")) {
      args.dir = arg.slice("--dir=".length);
    }
  }
  return args;
}

function sanitizeText(value) {
  return String(value ?? "")
    .replace(PRIVATE_LAN_IP_RE, "<LAN-IP>")
    .replace(WINDOWS_HOME_RE, "<repo-root>")
    .replace(/\bBearer\s+[A-Za-z0-9._-]{8,}\b/g, "Bearer <redacted-local-token>");
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

function latestArtifact(dir, prefix) {
  if (!fs.existsSync(dir)) return null;

  const candidates = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .filter((entry) => entry.name.startsWith(prefix) && entry.name.endsWith(jsonSuffix))
    .map((entry) => {
      const filePath = path.join(dir, entry.name);
      const stat = fs.statSync(filePath);
      return { filePath, mtimeMs: stat.mtimeMs, name: entry.name };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs || b.name.localeCompare(a.name));

  return candidates[0]?.filePath ?? null;
}

function resolveArtifacts(args) {
  const dir = path.resolve(root, args.dir ?? defaultMetricsDir);
  return {
    rollupPath: args.rollup ? path.resolve(root, args.rollup) : latestArtifact(dir, rollupPrefix),
    phonePath: args.phone ? path.resolve(root, args.phone) : latestArtifact(dir, phonePrefix),
  };
}

function readJson(filePath) {
  if (!filePath) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    console.log(`Could not read sanitized artifact: ${relativePath(filePath)}`);
    console.log(sanitizeText(error instanceof Error ? error.message : String(error)));
    return null;
  }
}

function getPhoneEvidence(rollup, phone) {
  return phone ?? rollup?.latestEvidence?.phoneAcceptance ?? null;
}

function getReadinessSummary(rollup, phoneEvidence) {
  return (
    phoneEvidence?.readinessSummary ??
    rollup?.latestEvidence?.phoneAcceptance?.readinessSummary ??
    null
  );
}

function getProof(phoneEvidence) {
  return (
    phoneEvidence?.combinedPhoneProof ??
    phoneEvidence?.receiptPhoneProof ??
    phoneEvidence?.manualPhoneProof ??
    null
  );
}

function localDesktopReady(summary) {
  return localDesktopBaseReady(summary) && (browserSessionReady(summary) || protectedCliReady(summary));
}

function localDesktopBaseReady(summary) {
  if (!summary) return false;
  return (
    summary.freeInvariant?.chargesEndUsers === false &&
    summary.networkMode?.mode === "isolated" &&
    summary.paidApisAllowed?.allowed === false &&
    summary.ollama?.reachable === true &&
    Boolean(summary.resolvedModel?.resolvedModel)
  );
}

function browserSessionReady(summary) {
  return summary?.session?.authenticated === true;
}

function protectedCliReady(summary) {
  return summary?.session?.tokenConfigured === true;
}

function localAiReceiptReady(proof) {
  return proof?.localAiReceipt === true;
}

function shouldSkipPhoneLocalReadinessBlocker(text, summary) {
  return /free local readiness is not fully local\/free/i.test(text) && localDesktopReady(summary);
}

function printArtifacts(paths) {
  console.log(`Rollup artifact: ${paths.rollupPath ? relativePath(paths.rollupPath) : "none"}`);
  console.log(`Phone artifact: ${paths.phonePath ? relativePath(paths.phonePath) : "none"}`);
}

function printDesktop(summary) {
  if (!summary) {
    console.log("Desktop local AI proof: unavailable");
    return;
  }

  console.log("Desktop local AI proof:");
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
  console.log(`  Paid APIs allowed: ${boolLabel(summary.paidApisAllowed?.allowed)}`);
  console.log(
    `  Ollama reachable: ${boolLabel(summary.ollama?.reachable)} / ${statusLabel(
      summary.ollama?.status,
    )}`,
  );
  console.log(`  Resolved model: ${statusLabel(summary.resolvedModel?.resolvedModel)}`);
  console.log(`  Browser session: ${boolLabel(browserSessionReady(summary))}`);
  console.log(
    `  Protected CLI route: ${boolLabel(protectedCliReady(summary))} / token configured ${boolLabel(
      summary.session?.tokenConfigured,
    )}`,
  );
  console.log(`  Phone LAN enabled: ${boolLabel(summary.phoneLan?.enabled)}`);
}

function printPhoneProof(proof) {
  if (!proof) {
    console.log("Phone-side local AI proof: unavailable");
    return;
  }

  console.log("Phone-side local AI proof:");
  console.log(`  Phone opened: ${boolLabel(proof.phoneOpened)}`);
  console.log(`  Phone login: ${boolLabel(proof.phoneLogin)}`);
  console.log(`  Ping receipt: ${boolLabel(proof.pingReceipt)}`);
  console.log(`  Local AI receipt: ${boolLabel(proof.localAiReceipt)}`);
  console.log(`  PWA installed: ${boolLabel(proof.pwaInstalled)}`);
}

function collectBlocked(rollup, phoneEvidence, summary, proof) {
  const blocked = [];

  if (!summary) {
    blocked.push("Desktop readiness summary is missing from the latest sanitized artifacts.");
  } else if (!localDesktopBaseReady(summary)) {
    blocked.push("Desktop local/free AI posture is not fully proven in the latest artifact.");
  } else if (!browserSessionReady(summary) && !protectedCliReady(summary)) {
    blocked.push("Desktop protected route proof is missing from the latest artifact.");
  }

  if (!proof) {
    blocked.push("Phone proof is missing from the latest sanitized artifacts.");
  } else if (!localAiReceiptReady(proof)) {
    blocked.push("Phone proof missing: local AI receipt.");
  }

  if (rollup?.posture?.localAiOfflineReady === false) {
    blocked.push("Readiness rollup still marks localAiOfflineReady as false.");
  }

  const phoneBlocked = Array.isArray(phoneEvidence?.blocked) ? phoneEvidence.blocked : [];
  for (const item of phoneBlocked) {
    const text = String(item);
    if (shouldSkipPhoneLocalReadinessBlocker(text, summary)) continue;
    if (/local ai|free local readiness|phone proof/i.test(text)) {
      blocked.push(sanitizeText(text));
    }
  }

  return Array.from(new Set(blocked));
}

function printBlocked(blocked) {
  if (blocked.length === 0) {
    console.log("Blocked items: none");
    return;
  }

  console.log("Blocked items:");
  for (const item of blocked) console.log(`  - ${sanitizeText(item)}`);
}

function printNextAction(blocked, summary, proof) {
  if (blocked.length === 0) {
    console.log("Next action: local AI offline proof is complete in the latest artifacts.");
    return;
  }

  if (!summary || !localDesktopBaseReady(summary)) {
    console.log(
      "Next action: start the local runtime, confirm Ollama is reachable, then rerun phone acceptance capture and this report.",
    );
    return;
  }

  if (!browserSessionReady(summary) && !protectedCliReady(summary)) {
    console.log(
      "Next action: run npm run phone:acceptance:desktop-proof to prove the protected local route, then rerun this report.",
    );
    return;
  }

  if (!proof || !localAiReceiptReady(proof)) {
    console.log(
      "Next action: from the phone or iPad, ask one local AI prompt, rerun phone acceptance capture, then rerun this report.",
    );
    return;
  }

  console.log(
    "Next action: rerun readiness rollup after the phone/local AI proof changes, then rerun this report.",
  );
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const paths = resolveArtifacts(args);
  const rollup = readJson(paths.rollupPath);
  const phone = readJson(paths.phonePath);
  const phoneEvidence = getPhoneEvidence(rollup, phone);
  const summary = getReadinessSummary(rollup, phoneEvidence);
  const proof = getProof(phoneEvidence);
  const ready =
    rollup?.posture?.localAiOfflineReady === true ||
    (localDesktopReady(summary) && localAiReceiptReady(proof));
  const blocked = ready ? [] : collectBlocked(rollup, phoneEvidence, summary, proof);

  console.log("Nexus offline local AI report");
  console.log("No network calls are made. This command reads sanitized artifacts only.");
  console.log("");
  printArtifacts(paths);
  console.log(`Local AI offline ready: ${ready ? "true" : "false"}`);
  console.log("");
  printDesktop(summary);
  console.log("");
  printPhoneProof(proof);
  console.log("");
  printBlocked(blocked);
  console.log("");
  printNextAction(blocked, summary, proof);

  process.exit(0);
}

main();
