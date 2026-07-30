#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (...parts) => {
  const relativePath = parts.join("/");
  const filePath = path.join(root, ...parts);
  if (!fs.existsSync(filePath)) {
    console.error(`x media-sensor: missing ${relativePath}`);
    process.exit(1);
  }
  return fs.readFileSync(filePath, "utf8");
};
const fail = (message) => {
  console.error(`x media-sensor: ${message}`);
  process.exit(1);
};

const ids = [
  "aidc-ai-pixelle-video",
  "hkuds-vimax",
  "supertone-inc-supertonic",
  "pear-devs-pear-desktop",
  "ruvnet-ruview",
];
const matrices = ids.map((id) =>
  JSON.parse(read("docs", "ideas", "source-parity", `${id}.json`)),
);
for (const matrix of matrices) {
  if (matrix.status !== "complete") fail(`${matrix.id} must be complete`);
  if (matrix.source.reviewedAt !== "2026-07-27") {
    fail(`${matrix.id} source review is stale`);
  }
  if (
    matrix.capabilities.some(
      (capability) => capability.disposition === "pending",
    )
  ) {
    fail(`${matrix.id} still has pending capabilities`);
  }
}

const pixelle = matrices.find(
  (matrix) => matrix.id === "aidc-ai-pixelle-video",
);
if (pixelle?.source.url !== "https://github.com/ATH-MaaS/Pixelle-Video") {
  fail("Pixelle redirect is stale");
}
const supertonic = matrices.find(
  (matrix) => matrix.id === "supertone-inc-supertonic",
);
if (!String(supertonic?.source.version).includes("archive-notice")) {
  fail("Supertonic archive notice is missing");
}
if (!String(supertonic?.source.license).includes("OpenRAIL-M")) {
  fail("Supertonic model license boundary is missing");
}
const ruview = matrices.find((matrix) => matrix.id === "ruvnet-ruview");
for (const id of [
  "wifi-spatial-sensing",
  "passive-motion-detection",
  "real-time-occupancy-dashboard",
]) {
  const capability = ruview?.capabilities.find((entry) => entry.id === id);
  if (
    capability?.disposition !== "excluded" ||
    capability?.conflict !== "security"
  ) {
    fail(`RuView ${id} must remain security-excluded`);
  }
}

const spec = read("specs", "features", "media-sensor-source-closure.md");
for (const needle of [
  "agentic video generation",
  "July 23, 2026 archive notice",
  "through-wall occupancy",
  "does not authorize sensitive human-sensing",
]) {
  if (!spec.includes(needle)) fail(`spec missing ${needle}`);
}

const packageJson = JSON.parse(read("package.json"));
if (
  packageJson.scripts?.["media-sensor:check"] !==
  "node scripts/validate-media-sensor-source-closure.mjs"
) {
  fail("focused command is missing");
}
if (
  !String(packageJson.scripts?.verify ?? "").includes(
    "npm run media-sensor:check",
  )
) {
  fail("canonical verify wiring is missing");
}

console.log(
  `ok media-sensor (matrices=${matrices.length}; pending=0; video-lane=false; surveillance-lane=false)`,
);
