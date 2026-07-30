#!/usr/bin/env node
/* eslint-disable no-console */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  isFirecrawlConfigured,
  resolveFirecrawlApiKey,
} from "../lib/firecrawlReadiness.ts";
import {
  isMarkItDownConfigured,
  resolveMarkItDownBin,
} from "../lib/markitdownReadiness.ts";
import {
  evaluateTimesFmReadiness,
  readTimesFmEndpoint,
} from "../lib/timesFmReadiness.ts";

const root = process.cwd();
const envKeys = [
  "FIRECRAWL_KEY",
  "MARKITDOWN_BIN",
  "TIMESFM_ENDPOINT",
  "PATH",
];
const originalEnv = Object.fromEntries(
  envKeys.map((key) => [key, process.env[key]]),
);

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

try {
  delete process.env.FIRECRAWL_KEY;
  delete process.env.MARKITDOWN_BIN;
  delete process.env.TIMESFM_ENDPOINT;
  process.env.PATH = "";

  assert.equal(resolveFirecrawlApiKey(), null);
  assert.equal(isFirecrawlConfigured(), false);
  assert.equal(resolveMarkItDownBin(), null);
  assert.equal(isMarkItDownConfigured(), false);
  assert.equal(readTimesFmEndpoint(), null);
  assert.deepEqual(evaluateTimesFmReadiness(), {
    version: "timesfm-readiness.v1",
    available: false,
    endpointUrl: null,
    advisoryOnly: true,
    model: "google/timesfm-2.0-500m-pytorch",
    note: "TimesFM is not configured. Set TIMESFM_ENDPOINT to advertise an operator-managed advisory endpoint.",
  });

  process.env.FIRECRAWL_KEY = "fixture-firecrawl-key";
  process.env.MARKITDOWN_BIN = "markitdown";
  process.env.TIMESFM_ENDPOINT = "http://fixture.internal:8000";

  assert.equal(isFirecrawlConfigured(), true);
  assert.equal(resolveMarkItDownBin(), "markitdown");
  assert.equal(isMarkItDownConfigured(), true);
  assert.equal(evaluateTimesFmReadiness().available, true);

  const statusRoute = read("app/api/status/route.ts");
  const aggregate = read("lib/agentPlatformReadiness.ts");
  const badges = read("components/ui/AgentPlatformReadinessBadges.tsx");
  const panel = read("components/intel/ForecastLabReadinessPanel.tsx");
  const readinessSources = [
    read("lib/firecrawlReadiness.ts"),
    read("lib/markitdownReadiness.ts"),
    read("lib/timesFmReadiness.ts"),
  ].join("\n");

  assert.match(statusRoute, /readAgentPlatformReadiness/);
  assert.match(statusRoute, /readiness:\s*\{\s*agentPlatform,/s);
  assert.match(aggregate, /timesfm:\s*\{/);
  assert.doesNotMatch(aggregate, /endpointUrl/);
  assert.doesNotMatch(badges, /endpointUrl|Endpoint:/);
  assert.match(panel, /Nexus does not call it from this panel/);
  assert.doesNotMatch(
    readinessSources,
    /\b(?:fetch|spawn|exec|scrapeUrlWithFirecrawl|convertBinaryWithMarkItDown|callTimesFmForecast)\b/,
  );
} finally {
  for (const key of envKeys) {
    const value = originalEnv[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

console.log(
  "ok agent-platform-readiness-runtime (unknown/configured fixtures, sanitized status, no execution surface)",
);
