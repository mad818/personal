#!/usr/bin/env node
/* eslint-disable no-console */

import { readdirSync } from "node:fs";
import { join } from "node:path";

const metricsDir = join(process.cwd(), "docs", "metrics");
const recurringTimestampedArtifact =
  /^(?:cp2-operational-live-gate|dependabot-security-audit|dependency-risk-posture|desktop-trust-chain|infra-hardening|phone-local-acceptance|readiness-rollup|release-diagnostics)-\d{4}-\d{2}-\d{2}.*\.json$/;
const findings = readdirSync(metricsDir)
  .filter((name) => recurringTimestampedArtifact.test(name))
  .sort();

if (findings.length > 0) {
  console.error(
    `Metrics retention found ${findings.length} recurring timestamped artifact(s):`,
  );
  for (const finding of findings) {
    console.error(`- docs/metrics/${finding}`);
  }
  console.error(
    "Recurring reports must overwrite their stable *-latest.json path.",
  );
  process.exit(1);
}

console.log("Metrics retention OK (stable latest artifacts only).");
