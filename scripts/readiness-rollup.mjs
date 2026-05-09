#!/usr/bin/env node
/* eslint-disable no-console */

import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { basename, join, relative } from "node:path";

const root = process.cwd();
const metricsDir = join(root, "docs", "metrics");

function sanitizeString(value) {
  return value
    .replace(
      /\b(?:10(?:\.\d{1,3}){3}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}|192\.168(?:\.\d{1,3}){2})\b/g,
      "<LAN-IP>",
    )
    .replace(/\b[A-Za-z]:\\Users\\[^\\\s`"']+(?:\\[^\s`"']*)?/g, "<repo-root>")
    .replace(/\bBearer\s+[A-Za-z0-9._-]{8,}\b/g, "Bearer <redacted-local-token>")
    .replace(
      /\b(?:token|secret|password|apiKey|authHeader)\b["']?\s*[:=]\s*["'][^"']+["']/gi,
      '$1: "<redacted-local-token>"',
    );
}

function sanitize(value) {
  if (typeof value === "string") return sanitizeString(value);
  if (Array.isArray(value)) return value.map(sanitize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, sanitize(entry)]),
  );
}

function readJsonSafe(filePath) {
  try {
    return sanitize(JSON.parse(readFileSync(filePath, "utf8")));
  } catch {
    return null;
  }
}

function latestMetric(prefix) {
  if (!existsSync(metricsDir)) return null;
  const files = readdirSync(metricsDir)
    .filter((file) => file.startsWith(prefix) && file.endsWith(".json"))
    .sort();
  const file = files.at(-1);
  if (!file) return null;
  const fullPath = join(metricsDir, file);
  return {
    file: relative(root, fullPath).replace(/\\/g, "/"),
    data: readJsonSafe(fullPath),
  };
}

function runNodeCheck(scriptPath) {
  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: root,
    encoding: "utf8",
  });
  return {
    command: `node ${scriptPath}`,
    ok: result.status === 0,
    exitCode: result.status ?? 1,
    summary:
      result.status === 0
        ? sanitizeString(result.stdout.trim().split(/\r?\n/).at(-1) ?? "OK")
        : sanitizeString(
            (result.stderr || result.stdout || "check failed")
              .trim()
              .split(/\r?\n/)
              .at(-1) ?? "check failed",
          ),
  };
}

function artifactSummary(metric) {
  if (!metric) return null;
  const data = metric.data ?? {};
  return {
    file: metric.file,
    capturedAt: data.capturedAt ?? null,
  };
}

function collectBlocked({
  phone,
  release,
  dependencyAudit,
  dependencyPosture,
  infraHardening,
  publicationSafety,
}) {
  const blocked = [];

  if (!publicationSafety.ok) {
    blocked.push("Publication safety check is not passing.");
  }

  if (!phone?.data) {
    blocked.push("No phone acceptance artifact is available.");
  } else if (phone.data.acceptanceReady !== true) {
    blocked.push(
      "Phone/PWA acceptance is still open because the latest sanitized phone artifact is not acceptanceReady.",
    );
  }

  if (!release?.data) {
    blocked.push("No release diagnostics artifact is available.");
  } else if (release.data.releaseProofReady !== true) {
    blocked.push(
      "Release diagnostics are still blocked by staged-host or Docker proof gaps.",
    );
  }

  if (!dependencyAudit?.data) {
    blocked.push("No Dependabot security audit artifact is available.");
  } else if (dependencyAudit.data.auditReady !== true) {
    blocked.push(
      "Dependabot audit is started but detailed GitHub alert metadata is still pending.",
    );
  }

  if (!dependencyPosture?.data) {
    blocked.push("No dependency risk posture artifact is available.");
  } else if (dependencyPosture.data.riskReady !== true) {
    blocked.push("Dependency risk posture has blocking package graph issues.");
  }

  if (!infraHardening?.data) {
    blocked.push("No infra hardening artifact is available.");
  } else if (infraHardening.data.hardeningReady !== true) {
    blocked.push("Infra hardening audit has critical failures.");
  }

  return blocked;
}

function main() {
  mkdirSync(metricsDir, { recursive: true });

  const capturedAt = new Date().toISOString();
  const phone = latestMetric("phone-local-acceptance-");
  const release = latestMetric("release-diagnostics-");
  const dependencyAudit = latestMetric("dependabot-security-audit-");
  const dependencyPosture = latestMetric("dependency-risk-posture-");
  const infraHardening = latestMetric("infra-hardening-");
  const agentRuntime = latestMetric("agent-runtime-");
  const runtimeExperiment = latestMetric("runtime-experiment-");
  const publicationSafety = runNodeCheck("scripts/validate-publication-safety.mjs");

  const blocked = collectBlocked({
    phone,
    release,
    dependencyAudit,
    dependencyPosture,
    infraHardening,
    publicationSafety,
  });

  const artifact = {
    capturedAt,
    rollupName: "WIDE-STABILIZATION-READINESS-ROLLUP",
    artifacts: {
      phoneAcceptance: artifactSummary(phone),
      releaseDiagnostics: artifactSummary(release),
      dependencyAudit: artifactSummary(dependencyAudit),
      dependencyPosture: artifactSummary(dependencyPosture),
      infraHardening: artifactSummary(infraHardening),
      agentRuntime: artifactSummary(agentRuntime),
      runtimeExperiment: artifactSummary(runtimeExperiment),
    },
    posture: {
      publicationSafety,
      phoneAcceptanceReady: phone?.data?.acceptanceReady === true,
      localAiOfflineReady:
        phone?.data?.acceptanceReady === true &&
        phone?.data?.manualPhoneProof?.localAiReceipt === true,
      releaseDiagnosticsReady: release?.data?.releaseProofReady === true,
      dependencyAuditReady: dependencyAudit?.data?.auditReady === true,
      dependencyRiskReady: dependencyPosture?.data?.riskReady === true,
      infraHardeningReady: infraHardening?.data?.hardeningReady === true,
    },
    latestEvidence: {
      phoneAcceptance: phone?.data
        ? {
            baseUrl: phone.data.baseUrl ?? null,
            routes: phone.data.routes ?? null,
            readinessSummary: phone.data.readinessSummary ?? null,
            manualPhoneProof: phone.data.manualPhoneProof ?? null,
            blocked: phone.data.blocked ?? [],
            acceptanceReady: phone.data.acceptanceReady === true,
          }
        : null,
      releaseDiagnostics: release?.data
        ? {
            baseUrl: release.data.baseUrl ?? null,
            routes: release.data.routes ?? null,
            docker: release.data.docker ?? null,
            blocked: release.data.blocked ?? [],
            releaseProofReady: release.data.releaseProofReady === true,
          }
        : null,
      dependencyAudit: dependencyAudit?.data
        ? {
            knownWarning: dependencyAudit.data.knownWarning ?? null,
            classification: dependencyAudit.data.classification ?? null,
            upgradePolicy: dependencyAudit.data.upgradePolicy ?? null,
            metadataSource: dependencyAudit.data.metadataSource ?? null,
            blocked: dependencyAudit.data.blocked ?? [],
            auditReady: dependencyAudit.data.auditReady === true,
          }
        : null,
      dependencyPosture: dependencyPosture?.data
        ? {
            packageGraph: dependencyPosture.data.packageGraph ?? null,
            lifecycleScriptPackageCount:
              dependencyPosture.data.lifecycleScriptPackageCount ?? null,
            warnings: dependencyPosture.data.warnings ?? [],
            blocked: dependencyPosture.data.blocked ?? [],
            riskReady: dependencyPosture.data.riskReady === true,
          }
        : null,
      infraHardening: infraHardening?.data
        ? {
            checks: infraHardening.data.checks ?? [],
            releasePrerequisites: infraHardening.data.releasePrerequisites ?? null,
            criticalFailures: infraHardening.data.criticalFailures ?? [],
            blocked: infraHardening.data.blocked ?? [],
            hardeningReady: infraHardening.data.hardeningReady === true,
          }
        : null,
    },
    blocked,
    releaseCandidateReady: blocked.length === 0,
    nextCommands: [
      "npm run git:safe -- push",
      "npm run phone:lan:start",
      "npm run phone:acceptance:capture -- --phone-opened --phone-login --ping-receipt --local-ai-receipt --pwa-installed",
      "npm run release:diagnostics:capture",
      "npm run dependabot:audit:classify",
      "npm run dependency:risk:posture",
      "npm run infra:hardening:audit",
      "npm run readiness:rollup",
      "npm run verify",
    ],
  };

  const fileName = `readiness-rollup-${capturedAt.replace(/[:.]/g, "-")}.json`;
  const outPath = join(metricsDir, fileName);
  writeFileSync(outPath, `${JSON.stringify(sanitize(artifact), null, 2)}\n`);

  console.log(
    `Readiness rollup written: ${relative(root, outPath).replace(/\\/g, "/")}`,
  );
  if (artifact.releaseCandidateReady) {
    console.log("Release-candidate rollup is ready.");
  } else {
    console.log(
      `Release-candidate rollup blocked by ${artifact.blocked.length} item(s).`,
    );
    for (const blocker of artifact.blocked) {
      console.log(`- ${blocker}`);
    }
  }

  if (basename(outPath).includes("<LAN-IP>")) {
    throw new Error("Unexpected placeholder replacement in artifact file name.");
  }
}

main();
