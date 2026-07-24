#!/usr/bin/env node
/* eslint-disable no-console */
import assert from "node:assert/strict";
import { analyzeSkillDependencyGraph } from "../lib/skillDependencyGraph.ts";

const clean = analyzeSkillDependencyGraph([
  {
    id: "root",
    capabilities: ["tool:web_search"],
    dependencies: ["helper"],
  },
  {
    id: "helper",
    capabilities: ["memory:write"],
    dependencies: [],
  },
]);
assert.equal(clean.nodeCount, 2);
assert.equal(clean.edgeCount, 1);
assert.deepEqual(clean.unresolved, []);
assert.deepEqual(clean.cycles, []);
assert.deepEqual(clean.escalations, []);

const unresolved = analyzeSkillDependencyGraph([
  { id: "root", capabilities: [], dependencies: ["missing"] },
]);
assert.deepEqual(unresolved.unresolved, [
  { from: "root", dependency: "missing" },
]);

const cyclic = analyzeSkillDependencyGraph([
  { id: "alpha", capabilities: [], dependencies: ["beta"] },
  { id: "beta", capabilities: [], dependencies: ["gamma"] },
  { id: "gamma", capabilities: [], dependencies: ["alpha"] },
]);
assert.deepEqual(cyclic.cycles, [
  { path: ["alpha", "beta", "gamma", "alpha"] },
]);

const reviewEscalation = analyzeSkillDependencyGraph([
  { id: "root", capabilities: [], dependencies: ["middle"] },
  { id: "middle", capabilities: [], dependencies: ["network-helper"] },
  {
    id: "network-helper",
    capabilities: ["network:external"],
    dependencies: [],
  },
]);
assert.deepEqual(reviewEscalation.escalations, [
  {
    skillId: "middle",
    directRisk: "none",
    inheritedRisk: "review",
    via: ["middle", "network-helper"],
    capabilities: ["network-helper:network:external"],
  },
  {
    skillId: "root",
    directRisk: "none",
    inheritedRisk: "review",
    via: ["root", "middle", "network-helper"],
    capabilities: ["network-helper:network:external"],
  },
]);

const blockedEscalation = analyzeSkillDependencyGraph([
  { id: "root", capabilities: ["network:external"], dependencies: ["shell"] },
  {
    id: "shell",
    capabilities: ["process:exec"],
    dependencies: [],
  },
]);
assert.equal(blockedEscalation.escalations.length, 1);
assert.equal(blockedEscalation.escalations[0]?.inheritedRisk, "blocked");
assert.deepEqual(blockedEscalation.escalations[0]?.via, ["root", "shell"]);

console.log(
  "ok skill-dependency-graph-runtime (clean, unresolved, cycle, review, blocked)",
);
