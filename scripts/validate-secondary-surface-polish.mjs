import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const checks = [
  {
    file: "components/security/CameraGrid.tsx",
    forbidden: ["Feed placeholder"],
    required: ["Passive feed tile", "PASSIVE PREVIEW", "RTSP/ONVIF READY"],
  },
  {
    file: "components/security/DronePanel.tsx",
    forbidden: ["Map placeholder"],
    required: ["Passive position plot", "Simulation only - no arm/steer/mode switch"],
  },
  {
    file: "components/iot/SensorDashboard.tsx",
    forbidden: ["SparklinePlaceholder", "placeholder mapping"],
    required: ["SensorSparkline", "deterministic sparklines"],
  },
  {
    file: "lib/voiceLab.ts",
    forbidden: ["Voice briefing placeholder"],
    required: ["Draft a short local-first command briefing"],
  },
];

const errors = [];

for (const check of checks) {
  const source = fs.readFileSync(path.join(repoRoot, check.file), "utf8");
  for (const phrase of check.forbidden) {
    if (source.includes(phrase)) {
      errors.push(`${check.file}: remove stale phrase "${phrase}"`);
    }
  }
  for (const phrase of check.required) {
    if (!source.includes(phrase)) {
      errors.push(`${check.file}: missing polish proof phrase "${phrase}"`);
    }
  }
}

if (errors.length > 0) {
  console.error("Secondary surface polish validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Secondary surface polish OK (camera, drone, IoT, and voice states are explicit).");
