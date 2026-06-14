#!/usr/bin/env node
/* eslint-disable no-console */

import assert from "node:assert/strict";
import {
  buildWindowsOptimizationAdvisor,
  normalizeWindowsOptimizationSnapshot,
} from "../lib/windowsOptimizationAdvisor.ts";

const snapshot = normalizeWindowsOptimizationSnapshot({
  platform: "win32",
  generatedAt: "2026-06-14T00:00:00.000Z",
  processorCount: 8,
  uptimeHours: 240,
  memory: {
    totalBytes: 16 * 1024 ** 3,
    freeBytes: 1 * 1024 ** 3,
  },
  disks: [{ usedPercent: 92 }, { usedPercent: 40 }],
  services: { total: 260, running: 170, automatic: 180, disabled: 20 },
  startupEntries: 31,
  scheduledTasks: { total: 350, running: 2, ready: 230, disabled: 40 },
  availability: {
    disks: true,
    services: true,
    startupEntries: true,
    scheduledTasks: true,
  },
});

assert.equal(snapshot.platform, "win32");
assert.equal(snapshot.memory.freePercent, 6);
assert.equal(snapshot.disks.length, 2);
assert.equal("name" in snapshot.disks[0], false);

const advisor = buildWindowsOptimizationAdvisor(snapshot);
assert.equal(advisor.supported, true);
assert.equal(advisor.readOnly, true);
assert.equal(advisor.requiresElevation, false);
assert.ok(advisor.recommendations.some((item) => item.id === "memory-pressure"));
assert.ok(advisor.recommendations.some((item) => item.id === "disk-pressure"));
assert.ok(advisor.recommendations.some((item) => item.id === "startup-pressure"));
assert.ok(advisor.recommendations.every((item) => item.execution === "external-review-only"));
assert.ok(advisor.prerequisites.includes("Create and verify a Windows restore point."));

const incomplete = buildWindowsOptimizationAdvisor(
  normalizeWindowsOptimizationSnapshot({
    platform: "win32",
    processorCount: 8,
    uptimeHours: 12,
    memory: { totalBytes: 16 * 1024 ** 3, freeBytes: 8 * 1024 ** 3 },
    availability: {
      disks: false,
      services: true,
      startupEntries: false,
      scheduledTasks: false,
    },
  }),
);
assert.equal(incomplete.status, "review");
assert.match(incomplete.summary, /incomplete/i);
assert.ok(incomplete.collectionWarnings.length > 0);

const unsupported = buildWindowsOptimizationAdvisor(
  normalizeWindowsOptimizationSnapshot({ platform: "darwin" }),
);
assert.equal(unsupported.supported, false);
assert.equal(unsupported.recommendations.length, 0);

console.log("ok windows-optimization-advisor-runtime");
