#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const metricsDir = path.join(root, "docs", "metrics");
const args = process.argv.slice(2);
const jsonOutput = args.includes("--json");
const checkOnly = args.includes("--check");
const jsYamlFloor = "4.1.1";
const glibFloor = "0.20.0";
const linuxBundleTargets = ["appimage", "deb", "rpm"];
const PRIVATE_LAN_IP_RE =
  /\b(?:10(?:\.\d{1,3}){3}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}|192\.168(?:\.\d{1,3}){2})\b/g;
const WINDOWS_HOME_RE = /\b[A-Za-z]:\\Users\\[^\\\s`"']+(?:\\[^\s`"']*)?/g;

export const FIRST_THREE_OPERATIONAL_CLOSURE_FIELDS = [
  "dependabotOpenAlerts",
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

function readText(relativeOrAbsolutePath) {
  if (!relativeOrAbsolutePath) return null;
  const filePath = path.isAbsolute(relativeOrAbsolutePath)
    ? relativeOrAbsolutePath
    : path.join(root, relativeOrAbsolutePath);
  try {
    return fs.readFileSync(filePath, "utf8");
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

function cargoPackageVersion(cargoLock, packageName) {
  if (typeof cargoLock !== "string") return null;
  const pattern = new RegExp(
    String.raw`\[\[package\]\]\r?\nname = "${packageName}"\r?\nversion = "([^"]+)"`,
  );
  return cargoLock.match(pattern)?.[1] ?? null;
}

function bundleTargets(config) {
  return Array.isArray(config?.bundle?.targets)
    ? config.bundle.targets.map((target) => String(target))
    : [];
}

function dependabotOpenAlertClosure() {
  const pkg = readJson("package.json");
  const lock = readJson("package-lock.json");
  const cargoLock = readText("desktop/src-tauri/Cargo.lock");
  const tauriConfig = readJson("desktop/src-tauri/tauri.conf.json");
  const secureTemplate = readJson("desktop/tauri-template/tauri.conf.secure.example.json");

  const jsYamlVersion = currentLockVersion("js-yaml", pkg, lock);
  const jsYamlOverride = pkg?.overrides?.["js-yaml"] ?? null;
  const jsYamlReady =
    Boolean(jsYamlVersion) &&
    compareVersions(jsYamlVersion, jsYamlFloor) >= 0 &&
    jsYamlOverride === jsYamlFloor;

  const glibVersion = cargoPackageVersion(cargoLock, "glib");
  const releaseTargets = bundleTargets(tauriConfig);
  const secureTemplateTargets = bundleTargets(secureTemplate);
  const activeLinuxTargets = releaseTargets.filter((target) =>
    linuxBundleTargets.includes(target),
  );
  const templateLinuxTargets = secureTemplateTargets.filter((target) =>
    linuxBundleTargets.includes(target),
  );
  const vulnerableGlib =
    Boolean(glibVersion) && compareVersions(glibVersion, glibFloor) < 0;
  const glibReleaseScopeSafe =
    Boolean(glibVersion) &&
    (!vulnerableGlib ||
      (activeLinuxTargets.length === 0 && templateLinuxTargets.length === 0));
  const blocked = [];

  if (!pkg || !lock) {
    blocked.push("Root package metadata is missing.");
  }
  if (!jsYamlReady) {
    blocked.push(
      `js-yaml must be package-lock >= ${jsYamlFloor} and package.json override ${jsYamlFloor}.`,
    );
  }
  if (!cargoLock || !tauriConfig || !secureTemplate) {
    blocked.push("Desktop Tauri release metadata is missing.");
  }
  if (!glibReleaseScopeSafe) {
    blocked.push(
      `glib ${glibVersion ?? "missing"} is below ${glibFloor} while Linux bundle targets are enabled.`,
    );
  }

  const locallyReady = blocked.length === 0;

  return {
    id: "DEPENDABOT-OPEN-ALERT-CLOSURE",
    status: locallyReady ? "ready_external" : "blocked_local_fix_required",
    blockerClass: locallyReady
      ? "github_rescan_or_alert_dismissal_required"
      : "local_manifest_or_release_scope_fix_required",
    proofSource: [
      "package.json",
      "package-lock.json",
      "desktop/src-tauri/Cargo.lock",
      "desktop/src-tauri/tauri.conf.json",
      "desktop/tauri-template/tauri.conf.secure.example.json",
    ],
    openAlertStatus: locallyReady
      ? "ready_for_github_rescan_or_dismissal"
      : "blocked_local_fix_required",
    jsYaml: {
      alertNumber: 124,
      lockVersion: jsYamlVersion,
      requiredFloor: jsYamlFloor,
      packageOverride: jsYamlOverride,
      localStatus: jsYamlReady ? "patched_locally" : "needs_local_patch",
    },
    glib: {
      alertNumber: 77,
      lockVersion: glibVersion,
      requiredFloor: glibFloor,
      releaseTargets,
      secureTemplateTargets,
      linuxBundleTargetsPresent: [...activeLinuxTargets, ...templateLinuxTargets],
      localStatus: glibReleaseScopeSafe
        ? "release_scope_safe_not_used"
        : "needs_local_release_scope_or_dependency_patch",
    },
    blocked,
    proofCommands: [
      "npm run dependabot:open:closure",
      "npm run dependabot:open:closure:check",
      "npm run dependency:risk:check",
      "npm run validate:infra-hardening",
      "npx tsc --noEmit",
      "npm run verify",
    ],
    nextAction: locallyReady
      ? "Run npm run dependabot:open:closure, push the local package metadata so GitHub rescans js-yaml, then dismiss glib #77 as not_used while Linux desktop bundles remain out of scope."
      : "Fix the listed local manifest or desktop release-scope blockers, then rerun npm run dependabot:open:closure.",
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
        "Run npm run phone:acceptance:desktop-proof to capture desktop-side runtime proof, then complete the phone/iPad flow.",
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
        ? "Run npm run phone:acceptance:desktop-proof to refresh desktop-side runtime proof, then rerun npm run phone:acceptance:report."
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
  if (summary && !localDesktopBaseReady(summary)) {
    blocked.push("Desktop local/free AI posture is not fully proven.");
  }
  if (summary && localDesktopBaseReady(summary) && !browserSessionReady(summary) && !protectedCliReady(summary)) {
    blocked.push("Desktop protected route proof is missing.");
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
  const dependabotOpenAlerts = dependabotOpenAlertClosure();
  const phoneAcceptance = phoneClosure();
  const localAiOffline = localAiClosure();
  const externalIdeas = externalIdeasIntake();
  const openItems = [dependabotOpenAlerts, phoneAcceptance, localAiOffline].filter(
    (item) => item.status !== "complete",
  );

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    overallStatus: openItems.length === 0 ? "complete" : "blocked_or_manual",
    lanes: {
      dependabotOpenAlerts,
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
  if (lane.openAlertStatus) {
    console.log(`  Open alert status: ${lane.openAlertStatus}`);
  }
  if (lane.jsYaml) {
    console.log(
      `  js-yaml #${lane.jsYaml.alertNumber}: ${lane.jsYaml.lockVersion ?? "missing"} -> ${lane.jsYaml.requiredFloor}; ${lane.jsYaml.localStatus}`,
    );
  }
  if (lane.glib) {
    const linuxTargets = lane.glib.linuxBundleTargetsPresent.join(", ") || "none";
    console.log(
      `  glib #${lane.glib.alertNumber}: ${lane.glib.lockVersion ?? "missing"} -> ${lane.glib.requiredFloor}; ${lane.glib.localStatus}`,
    );
    console.log(`  Linux bundle targets present: ${linuxTargets}`);
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

  printLane(closure.lanes.dependabotOpenAlerts);
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
