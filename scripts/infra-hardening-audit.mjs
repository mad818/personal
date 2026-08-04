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
import { join, relative } from "node:path";

const root = process.cwd();
const metricsDir = join(root, "docs", "metrics");

const checks = [
  {
    id: "publication-safety",
    script: "publication:safety:check",
    nodeScript: "scripts/validate-publication-safety.mjs",
    critical: true,
  },
  {
    id: "security-scan",
    script: "security-scan",
    nodeScript: "scripts/security-scan.js",
    critical: true,
  },
  {
    id: "tauri-security",
    script: "security:tauri",
    nodeScript: "scripts/check-tauri-security.mjs",
    critical: false,
  },
  {
    id: "security-boundaries",
    script: "security:boundaries",
    nodeScript: "scripts/validate-security-boundaries.mjs",
    critical: false,
  },
  {
    id: "dependency-risk-posture",
    script: "dependency:risk:posture",
    nodeScript: "scripts/dependency-risk-posture.mjs",
    critical: false,
  },
  {
    id: "dependabot-audit",
    script: "dependabot:audit:classify",
    nodeScript: "scripts/dependabot-security-audit.mjs",
    critical: false,
  },
  {
    id: "phone-lan-static",
    script: "phone:lan:check",
    nodeScript: "scripts/validate-phone-lan-readiness.mjs",
    critical: false,
  },
];

function sanitizeString(value) {
  return value
    .replace(
      /\b(?:10(?:\.\d{1,3}){3}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}|192\.168(?:\.\d{1,3}){2})\b/g,
      "<LAN-IP>",
    )
    .replace(/\b[A-Za-z]:\\Users\\[^\\\s`"']+(?:\\[^\s`"']*)?/g, "<repo-root>")
    .replace(/\bBearer\s+[A-Za-z0-9._-]{8,}\b/g, "Bearer <redacted-local-token>")
    .replace(
      /\b(?:TOKEN|SECRET|PASSWORD|API_KEY|AUTH_HEADER)\b[ \t]*=[ \t]*[^\s#]+/gi,
      "<redacted-secret-assignment>",
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

function summarizeOutput(result) {
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("> "))
    .slice(-6);
  return output.map(sanitizeString);
}

function runNpmScript(check) {
  const started = Date.now();
  const result = spawnSync(process.execPath, [check.nodeScript], {
    cwd: root,
    encoding: "utf8",
    shell: false,
  });

  return {
    id: check.id,
    command: `npm run ${check.script}`,
    delegatedCommand: `node ${check.nodeScript}`,
    critical: check.critical,
    ok: result.status === 0,
    exitCode: result.status ?? 1,
    durationMs: Date.now() - started,
    summary: summarizeOutput(result),
  };
}

function latestMetric(prefix) {
  if (!existsSync(metricsDir)) return null;
  const file = readdirSync(metricsDir)
    .filter((entry) => entry.startsWith(prefix) && entry.endsWith(".json"))
    .sort()
    .at(-1);
  if (!file) return null;
  const fullPath = join(metricsDir, file);
  let data = null;
  try {
    data = JSON.parse(readFileSync(fullPath, "utf8"));
  } catch {
    data = null;
  }
  return {
    file: relative(root, fullPath).replace(/\\/g, "/"),
    capturedAt: data?.capturedAt ?? null,
    ready:
      data?.riskReady === true ||
      data?.auditReady === true ||
      data?.hardeningReady === true ||
      data?.releaseProofReady === true,
    blocked: data?.blocked ?? [],
  };
}

function dockerStatus() {
  const result = spawnSync("docker", ["--version"], {
    cwd: root,
    encoding: "utf8",
    shell: false,
  });
  return {
    dockerfilePresent: existsSync(join(root, "Dockerfile")),
    dockerCliAvailable: result.status === 0,
    summary:
      result.status === 0
        ? sanitizeString(result.stdout.trim())
        : "Docker CLI unavailable from this shell.",
  };
}

function buildReleasePrerequisites() {
  return {
    docker: dockerStatus(),
    releaseBaseUrlConfiguredInProcess:
      typeof process.env.NEXUS_RELEASE_BASE_URL === "string" &&
      process.env.NEXUS_RELEASE_BASE_URL.length > 0,
    note:
      "This audit does not read .env.local; release host/token proof remains operator-local.",
  };
}

function main() {
  mkdirSync(metricsDir, { recursive: true });

  const capturedAt = new Date().toISOString();
  const checkResults = checks.map(runNpmScript);
  const criticalFailures = checkResults.filter((check) => check.critical && !check.ok);
  const blocked = [];

  for (const check of checkResults) {
    if (!check.ok) {
      blocked.push(`${check.id} exited ${check.exitCode}.`);
    }
  }

  const releasePrerequisites = buildReleasePrerequisites();
  if (!releasePrerequisites.docker.dockerCliAvailable) {
    blocked.push("Docker CLI is unavailable, so container proof remains blocked.");
  }
  if (!releasePrerequisites.releaseBaseUrlConfiguredInProcess) {
    blocked.push(
      "NEXUS_RELEASE_BASE_URL is not present in the current process; staged-host proof remains blocked.",
    );
  }

  const artifact = sanitize({
    capturedAt,
    auditName: "SECURITY-INFRASTRUCTURE-HARDENING",
    checks: checkResults,
    artifacts: {
      dependencyRiskPosture: latestMetric("dependency-risk-posture-"),
      dependabotAudit: latestMetric("dependabot-security-audit-"),
      releaseDiagnostics: latestMetric("release-diagnostics-"),
      readinessRollup: latestMetric("readiness-rollup-"),
    },
    releasePrerequisites,
    criticalFailures,
    blocked,
    hardeningReady: criticalFailures.length === 0,
    nextActions: [
      "Review lifecycle-script packages before dependency upgrades.",
      "Use GitHub Dependabot metadata to classify package alerts before upgrading.",
      "Keep package upgrades in one minimal batch at a time.",
      "Run npm run verify after any package change.",
    ],
  });

  const fileName = "infra-hardening-latest.json";
  const outPath = join(metricsDir, fileName);
  writeFileSync(outPath, `${JSON.stringify(artifact, null, 2)}\n`);

  console.log(`Infra hardening audit written: ${relative(root, outPath).replace(/\\/g, "/")}`);
  if (criticalFailures.length > 0) {
    console.log(`Critical failures: ${criticalFailures.length}`);
    for (const failure of criticalFailures) {
      console.log(`- ${failure.id} exited ${failure.exitCode}`);
    }
    process.exit(1);
  }
  if (blocked.length > 0) {
    console.log(`Blocked/non-critical items: ${blocked.length}`);
    for (const blocker of blocked) {
      console.log(`- ${blocker}`);
    }
  }
}

main();
