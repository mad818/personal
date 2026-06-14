#!/usr/bin/env node
/* eslint-disable no-console */

import { collectWindowsOptimizationAdvisor } from "../lib/windowsOptimizationAdvisorServer.ts";

const json = process.argv.includes("--json");
const advisor = await collectWindowsOptimizationAdvisor();

if (json) {
  console.log(JSON.stringify(advisor, null, 2));
  process.exit(0);
}

console.log("Nexus Windows Optimization Advisor");
console.log("Read-only: no settings, services, tasks, apps, registry values, or files are changed.");
console.log(`Status: ${advisor.status}`);
console.log(advisor.summary);
console.log("");

if (!advisor.supported) {
  console.log("Run this command on the Windows host that runs Nexus for the full sanitized posture.");
  process.exit(0);
}

console.log(
  `Memory free: ${advisor.snapshot.memory.freePercent}% | Uptime: ${advisor.snapshot.uptimeHours.toFixed(1)}h | Startup entries: ${advisor.snapshot.startupEntries}`,
);
console.log(
  `Services: ${advisor.snapshot.services.total} total / ${advisor.snapshot.services.automatic} automatic | Scheduled tasks: ${advisor.snapshot.scheduledTasks.total}`,
);

if (advisor.collectionWarnings.length > 0) {
  console.log("");
  console.log("Collection warnings:");
  for (const warning of advisor.collectionWarnings) console.log(`- ${warning}`);
}

if (advisor.recommendations.length === 0) {
  console.log("No recommendations crossed the measured thresholds.");
} else {
  console.log("");
  console.log("Recommendations:");
  for (const item of advisor.recommendations) {
    console.log(`- [${item.risk.toUpperCase()}] ${item.title}`);
    console.log(`  Evidence: ${item.evidence}`);
    console.log(`  Next: ${item.recommendation}`);
  }
}

console.log("");
console.log("Prerequisites before any external change:");
for (const prerequisite of advisor.prerequisites) console.log(`- ${prerequisite}`);
