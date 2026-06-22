#!/usr/bin/env node
/* eslint-disable no-console */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { detectCveKillChainStage } from "../lib/cveKillChain.ts";
import { classifyMemoryArtifact } from "../lib/artifactClassification.ts";

const root = process.cwd();
const exposureSource = fs.readFileSync(
  path.join(root, "lib", "aiExposureReview.ts"),
  "utf8",
);
const liveContextSource = fs.readFileSync(
  path.join(root, "lib", "liveContext.ts"),
  "utf8",
);

const packIds = [
  "llm-endpoint",
  "leaked-key",
  "vector-store",
  "mcp-exposure",
  "unsafe-agent",
];
for (const packId of packIds) {
  assert.ok(exposureSource.includes(`id: "${packId}"`), `missing pack ${packId}`);
}

assert.ok(
  exposureSource.includes("buildAiExposureReviewMarkdown"),
  "missing buildAiExposureReviewMarkdown",
);
assert.ok(
  exposureSource.includes("rankAiExposureReviewPages"),
  "missing rankAiExposureReviewPages",
);

const stage = detectCveKillChainStage(
  "Remote code execution via command injection in authentication bypass",
);
assert.ok(
  stage === "Execution" || stage === "Initial Access",
  `unexpected kill-chain stage: ${stage}`,
);

const classification = classifyMemoryArtifact({
  workflowId: "ai-exposure-review",
  route: "/cyber",
  visibility: "internal",
  tags: ["ai-exposure-review"],
  content: "## Subject\nexample",
});
assert.equal(classification.artifactType, "ai_exposure_review");
assert.ok(classification.confidence >= 0.9);

assert.ok(liveContextSource.includes("queryText"), "liveContext missing queryText");
assert.ok(liveContextSource.includes("allowByQuery"), "liveContext missing allowByQuery");

console.log("ok ai-exposure-assimilation-runtime");
