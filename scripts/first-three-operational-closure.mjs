#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const metricsDir = path.join(root, "docs", "metrics");
const args = process.argv.slice(2);
const jsonOutput = args.includes("--json");
const checkOnly = args.includes("--check");
const PRIVATE_LAN_IP_RE =
  /\b(?:10(?:\.\d{1,3}){3}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}|192\.168(?:\.\d{1,3}){2})\b/g;
const WINDOWS_HOME_RE = /\b[A-Za-z]:\\Users\\[^\\\s`"']+(?:\\[^\s`"']*)?/g;

export const FIRST_THREE_OPERATIONAL_CLOSURE_FIELDS = [
  "dependabotPostcss",
  "phoneAcceptance",
  "localAiOffline",
  "externalIdeasIntake",
  "status",
  "blockerClass",
  "nextAction",
];

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

function readJson(relativeOrAbsolutePath) {
  if (!relativeOrAbsolutePath) return null;
  const filePath = path.isAbsolute(relativeOrAbsolutePath)
    ? relativeOrAbsolutePath
    : path.join(root, relativeOrAbsolutePath);
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function latestMetric(prefix) {
  if (!fs.existsSync(metricsDir)) return null;
  const candidates = fs
    .readdirSync(metricsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .filter((entry) => entry.name.startsWith(prefix) && entry.name.endsWith(".json"))
    .map((entry) => {
      const filePath = path.join(metricsDir, entry.name);
      const stat = fs.statSync(filePath);
      return { filePath, mtimeMs: stat.mtimeMs, name: entry.name };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs || b.name.localeCompare(a.name));

  return candidates[0]?.filePath ?? null;
}

function normalizeVersion(value) {
  if (typeof value !== "string") return null;
  const match = value.match(/\d+(?:\.\d+){0,3}(?:[-+][0-9A-Za-z.-]+)?/);
  return match?.[0] ?? null;
}

function versionParts(version) {
  return (
    normalizeVersion(version)
      ?.split(/[.+-]/)
      .slice(0, 4)
      .map((part) => Number.parseInt(part, 10))
      .map((part) => (Number.isFinite(part) ? part : 0)) ?? []
  );
}

function compareVersions(left, right) {
  const leftParts = versionParts(left);
  const rightParts = versionParts(right);
  const length = Math.max(leftParts.length, rightParts.length, 3);
  for (let index = 0; index < length; index += 1) {
    const a = leftParts[index] ?? 0;
    const b = rightParts[index] ?? 0;
    if (a > b) return 1;
    if (a < b) return -1;
  }
  return 0;
}

function packagePathForName(name) {
  return `node_modules/${name}`;
}

function currentLockVersion(packageName, pkg, lock) {
  const packages =
    lock?.packages && typeof lock.packages === "object" ? lock.packages : {};
  const directLock = packages[packagePathForName(packageName)]?.version;
  if (directLock) return directLock;

  for (const group of [
    "dependencies",
    "devDependencies",
    "optionalDependencies",
    "peerDependencies",
  ]) {
    const version = pkg?.[group]?.[packageName];
    if (version) return normalizeVersion(version);
  }

  return null;
}

function runtimeAlerts(audit) {
  const queue = audit?.upgradeQueue?.runtimeCritical;
  if (Array.isArray(queue)) return queue;

  const classified = audit?.classification?.runtimeCritical?.alerts;
  return Array.isArray(classified) ? classified : [];
}

function installFlag(group) {
  if (group === "dependencies") return "--save";
  if (group === "optionalDependencies") return "--save-optional";
  return "--save-dev";
}

function postcssClosure() {
  const auditPath = latestMetric("dependabot-security-audit-");
  const audit = readJson(auditPath);
  const pkg = readJson("package.json");
  const lock = readJson("package-lock.json");
  const alert = runtimeAlerts(audit).find(
    (item) =>
      item?.ecosystem === "npm" &&
      item?.packageName === "postcss" &&
      item?.retiredManifest !== true,
  );
  const currentVersion = currentLockVersion("postcss", pkg, lock);
  const patchedFloor = alert?.firstPatchedVersion ?? "8.5.10";
  const patched =
    Boolean(currentVersion) && compareVersions(currentVersion, patchedFloor) >= 0;
  const installCommand = `npm install postcss@${patchedFloor} ${installFlag(
    alert?.directDependencyGroup,
  )} --no-audit --no-fund --legacy-peer-deps --cache .npm-cache`;

  if (!pkg || !lock) {
    return {
      id: "DEPENDABOT-POSTCSS-RUNTIME-PATCH",
      status: "blocked_evidence_missing",
      blockerClass: "local_package_metadata_missing",
      proofSource: "package.json / package-lock.json",
      currentVersion,
      patchedFloor,
      nextAction: "Restore readable package metadata, then rerun this command.",
    };
  }

  if (!audit || !alert) {
    return {
      id: "DEPENDABOT-POSTCSS-RUNTIME-PATCH",
      status: patched ? "complete" : "blocked_evidence_missing",
      blockerClass: patched ? "none" : "dependabot_audit_missing",
      proofSource: relativePath(auditPath) ?? "none",
      currentVersion,
      patchedFloor,
      nextAction: patched
        ? "Postcss is at or above the patched floor. Run the Dependabot classifier after GitHub rescans."
        : "Run npm run dependabot:audit:classify with the sanitized Dependabot alert export, then rerun this command.",
    };
  }

  return {
    id: "DEPENDABOT-POSTCSS-RUNTIME-PATCH",
    status: patched ? "complete" : "blocked_external",
    blockerClass: patched ? "none" : "package_registry_or_normal_shell_required",
    proofSource: relativePath(auditPath),
    alertNumber: alert.alertNumber ?? null,
    currentVersion,
    patchedFloor,
    installCommand,
    proofCommands: [
      "npm run dependabot:audit:classify -- --alerts=docs\\metrics\\dependabot-alerts-source.json",
      "npm run dependency:risk:check",
      "npm run dependabot:audit:check",
      "npm run validate:infra-hardening",
      "npx tsc --noEmit",
      "npm run verify",
      "npm run build",
    ],
    nextAction: patched
      ? "Postcss is patched locally. Run the proof commands and wait for GitHub Dependabot to rescan."
      : `Run from normal PowerShell: ${installCommand}`,
  };
}

function phoneProof(artifact) {
  return artifact?.combinedPhoneProof ?? artifact?.receiptPhoneProof ?? null;
}

function phoneClosure() {
  const phonePath = latestMetric("phone-local-acceptance-");
  const artifact = readJson(phonePath);

  if (!artifact) {
    return {
      id: "FREE-LOCAL-PHONE-ACCEPTANCE",
      status: "blocked_manual",
      blockerClass: "phone_acceptance_artifact_missing",
      proofSource: "none",
      acceptanceReady: false,
      missing: ["Sanitized phone acceptance capture artifact"],
      nextAction:
        "Run npm run phone:lan:start, complete the phone/iPad flow, then run npm run phone:acceptance:capture.",
    };
  }

  const liveReady = artifact?.receiptLiveStatus?.acceptanceReady === true;
  const ready = artifact?.acceptanceReady === true && liveReady;
  const missing = [];
  const missingLabels = Array.isArray(artifact?.missingReceiptProofItems)
    ? artifact.missingReceiptProofItems
    : [];
  const blocked = Array.isArray(artifact?.blocked) ? artifact.blocked : [];
  for (const item of missingLabels) missing.push(sanitizeText(item));
  for (const item of blocked) missing.push(sanitizeText(item));
  const hasRouteBlocker = blocked.some((item) => /Route /i.test(String(item)));

  return {
    id: "FREE-LOCAL-PHONE-ACCEPTANCE",
    status: ready ? "complete" : hasRouteBlocker ? "blocked_runtime" : "blocked_manual",
    blockerClass: ready
      ? "none"
      : hasRouteBlocker
        ? "local_runtime_not_reachable"
        : "physical_phone_or_ipad_proof_required",
    proofSource: relativePath(phonePath),
    capturedAt: sanitizeText(artifact?.capturedAt ?? "unknown"),
    acceptanceReady: ready,
    receiptLiveReady: liveReady,
    proof: phoneProof(artifact),
    missing: Array.from(new Set(missing)),
    nextAction: ready
      ? "Phone/iPad acceptance is complete in the latest sanitized artifact."
      : hasRouteBlocker
        ? "Run npm run phone:acceptance:guide, start the LAN runtime with npm run phone:lan:start, rerun capture, then rerun npm run phone:acceptance:report."
        : "Run npm run phone:acceptance:guide, then from the phone/iPad: open HQ, log in, send ping, ask one local AI prompt, install the PWA, rerun capture, then rerun npm run phone:acceptance:report.",
  };
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

function localDesktopReady(summary) {
  if (!summary) return false;
  return (
    summary.freeInvariant?.chargesEndUsers === false &&
    summary.networkMode?.mode === "isolated" &&
    summary.paidApisAllowed?.allowed === false &&
    summary.ollama?.reachable === true &&
    Boolean(summary.resolvedModel?.resolvedModel) &&
    summary.session?.authenticated === true
  );
}

function localAiClosure() {
  const rollupPath = latestMetric("readiness-rollup-");
  const phonePath = latestMetric("phone-local-acceptance-");
  const rollup = readJson(rollupPath);
  const phone = readJson(phonePath);
  const phoneEvidence = getPhoneEvidence(rollup, phone);
  const summary = getReadinessSummary(rollup, phoneEvidence);
  const proof = phoneProof(phoneEvidence);
  const desktopReady = localDesktopReady(summary);
  const phoneAiReady = proof?.localAiReceipt === true;
  const ready = rollup?.posture?.localAiOfflineReady === true || (desktopReady && phoneAiReady);
  const blocked = [];

  if (!rollup) blocked.push("Readiness rollup artifact is missing.");
  if (!summary) blocked.push("Desktop readiness summary is missing.");
  if (summary && !desktopReady) {
    blocked.push("Desktop local/free AI posture is not fully proven.");
  }
  if (!proof) blocked.push("Phone-side local AI proof is missing.");
  if (proof && !phoneAiReady) blocked.push("Phone proof missing: local AI receipt.");
  if (rollup?.posture?.localAiOfflineReady === false) {
    blocked.push("Readiness rollup still marks localAiOfflineReady as false.");
  }

  return {
    id: "LOCAL-AI-OFFLINE-OPERATIONS",
    status: ready ? "complete" : "blocked_manual",
    blockerClass: ready ? "none" : "physical_phone_or_ipad_local_ai_proof_required",
    proofSource: {
      rollup: relativePath(rollupPath) ?? "none",
      phone: relativePath(phonePath) ?? "none",
    },
    localAiOfflineReady: ready,
    desktopReady,
    phoneAiReceiptReady: phoneAiReady,
    model: sanitizeText(summary?.resolvedModel?.resolvedModel ?? "unknown"),
    blocked: Array.from(new Set(blocked.map(sanitizeText))),
    nextAction: ready
      ? "Local AI offline operations are complete in the latest sanitized artifacts."
      : "From the phone/iPad, ask one local Ollama prompt, rerun phone acceptance capture, then rerun npm run offline:local:report.",
  };
}

function externalIdeasIntake() {
  return {
    id: "EXTERNAL-IDEAS-INTAKE",
    status: "mapped_not_active_scope",
    blockerClass: "selection_and_triage_required",
    proofSource: [
      "docs/ideas/external-links-mapping.md",
      "docs/plans/nexus-ideas-assimilation-master-backlog.md",
      "docs/plans/unfinished-ideas-triage-2026-05-07.md",
      "Resources source ledger",
    ],
    summary:
      "Yes, the GitHub/X/YouTube source pool is larger than the active queue. Those links are idea intake until a specific tranche is selected and mapped to existing Nexus seams.",
    nextAction:
      "After these first three are closed, choose one source-intake tranche by priority instead of mixing link backlog work into phone, local AI, or dependency proof.",
  };
}

function buildClosure() {
  const dependabotPostcss = postcssClosure();
  const phoneAcceptance = phoneClosure();
  const localAiOffline = localAiClosure();
  const externalIdeas = externalIdeasIntake();
  const openItems = [dependabotPostcss, phoneAcceptance, localAiOffline].filter(
    (item) => item.status !== "complete",
  );

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    overallStatus: openItems.length === 0 ? "complete" : "blocked_or_manual",
    lanes: {
      dependabotPostcss,
      phoneAcceptance,
      localAiOffline,
      externalIdeasIntake: externalIdeas,
    },
    nextPriority:
      openItems[0]?.nextAction ??
      "The first three are closed. Move to the next selected source-intake or security tranche.",
  };
}

function printLane(lane) {
  console.log(`[${lane.status}] ${lane.id}`);
  console.log(`  Blocker: ${lane.blockerClass}`);
  if (Array.isArray(lane.proofSource)) {
    console.log(`  Proof source: ${lane.proofSource.join(", ")}`);
  } else if (typeof lane.proofSource === "object" && lane.proofSource) {
    console.log(`  Proof source: ${JSON.stringify(lane.proofSource)}`);
  } else {
    console.log(`  Proof source: ${lane.proofSource ?? "none"}`);
  }

  if (lane.currentVersion || lane.patchedFloor) {
    console.log(
      `  Version: ${lane.currentVersion ?? "unknown"} -> ${lane.patchedFloor ?? "unknown"}`,
    );
  }
  if (lane.acceptanceReady !== undefined) {
    console.log(`  Acceptance ready: ${lane.acceptanceReady ? "true" : "false"}`);
  }
  if (lane.desktopReady !== undefined) {
    console.log(`  Desktop local AI ready: ${lane.desktopReady ? "true" : "false"}`);
    console.log(
      `  Phone local AI receipt: ${lane.phoneAiReceiptReady ? "true" : "false"}`,
    );
    console.log(`  Model: ${lane.model}`);
  }

  const details = lane.missing ?? lane.blocked ?? [];
  if (Array.isArray(details) && details.length > 0) {
    console.log("  Missing/blocking proof:");
    for (const item of details.slice(0, 8)) console.log(`    - ${sanitizeText(item)}`);
    if (details.length > 8) console.log(`    - ...${details.length - 8} more`);
  }

  if (lane.summary) console.log(`  Note: ${sanitizeText(lane.summary)}`);
  console.log(`  Next action: ${sanitizeText(lane.nextAction)}`);
  console.log("");
}

function printClosure(closure) {
  console.log("Nexus first three operational closure");
  console.log("No network calls are made. This command reads local sanitized artifacts only.");
  console.log(`Overall: ${closure.overallStatus}`);
  console.log("");

  printLane(closure.lanes.dependabotPostcss);
  printLane(closure.lanes.phoneAcceptance);
  printLane(closure.lanes.localAiOffline);
  printLane(closure.lanes.externalIdeasIntake);

  console.log(`Top next action: ${sanitizeText(closure.nextPriority)}`);
}

const closure = buildClosure();

if (checkOnly) {
  console.log(`ok first-three-operational-closure (${closure.overallStatus})`);
} else if (jsonOutput) {
  console.log(JSON.stringify(closure, null, 2));
} else {
  printClosure(closure);
}

process.exit(0);
