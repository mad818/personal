#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x geodeep-assimilation: ${message}`);
  process.exit(1);
}

function readRequired(...parts) {
  const filePath = path.join(root, ...parts);
  if (!fs.existsSync(filePath)) {
    fail(`${parts.join("/")} is missing`);
  }
  return fs.readFileSync(filePath, "utf8");
}

function requireText(source, needle, label) {
  if (!source.includes(needle)) {
    fail(`${label} is missing "${needle}"`);
  }
}

const route = readRequired("app", "api", "geo-scan", "route.ts");
const opsMap = readRequired("components", "ops", "OpsMap.tsx");
const parity = JSON.parse(readRequired("docs", "ideas", "source-parity", "geodeep.json"));

requireText(route, "/api/geo-scan", "geo-scan route");
requireText(route, "GEODEP_SERVICE_URL", "geo-scan route");
requireText(route, "detections", "geo-scan route");
requireText(opsMap, "/api/geo-scan", "OpsMap.tsx");
requireText(opsMap, "fetchGeoDepData", "OpsMap.tsx");

if (parity.status !== "complete") {
  fail("geodeep.json status must be complete");
}

const proxyRow = parity.capabilities?.find((c) => c.id === "geo-scan-api-proxy");
if (!proxyRow || proxyRow.disposition !== "implemented") {
  fail("geodeep.json geo-scan-api-proxy must be implemented");
}

console.log("ok geodeep-assimilation (geo-scan proxy + OPS map layer wired)");
