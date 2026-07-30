#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";
import {
  NEXUS_MOTION_DURATION_BUDGETS_MS,
  decideNexusMotion,
} from "../lib/nexusMotionTaste.ts";

const root = process.cwd();
const fail = (message) => {
  console.error(`nexus-motion-taste validation failed: ${message}`);
  process.exit(1);
};
const requireDecision = (label, input, expectedAllowed, maximumMs) => {
  const decision = decideNexusMotion(input);
  if (decision.allowed !== expectedAllowed) {
    fail(`${label} returned allowed=${decision.allowed}`);
  }
  if (decision.durationBudgetMs > maximumMs) {
    fail(`${label} exceeded ${maximumMs}ms (${decision.durationBudgetMs}ms)`);
  }
};

requireDecision(
  "frequent keyboard operation",
  {
    frequency: "frequent",
    purpose: "state",
    inputMode: "keyboard",
    surface: "control",
  },
  false,
  0,
);
requireDecision(
  "decorative data motion",
  {
    frequency: "occasional",
    purpose: "decoration",
    inputMode: "passive",
    surface: "data",
  },
  false,
  0,
);
requireDecision(
  "frequent feedback",
  {
    frequency: "frequent",
    purpose: "feedback",
    inputMode: "pointer",
    surface: "control",
  },
  true,
  NEXUS_MOTION_DURATION_BUDGETS_MS.frequent,
);
requireDecision(
  "occasional state change",
  {
    frequency: "occasional",
    purpose: "state",
    inputMode: "passive",
    surface: "data",
  },
  true,
  NEXUS_MOTION_DURATION_BUDGETS_MS.occasional,
);
requireDecision(
  "rare overlay",
  {
    frequency: "rare",
    purpose: "spatial",
    inputMode: "pointer",
    surface: "overlay",
  },
  true,
  NEXUS_MOTION_DURATION_BUDGETS_MS.rareOverlay,
);

const sourceExtensions = new Set([".css", ".ts", ".tsx"]);
const findings = [];

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    const relative = `/${path.relative(root, absolute).replaceAll("\\", "/")}`;
    if (entry.isDirectory()) {
      walk(absolute);
      continue;
    }
    if (!sourceExtensions.has(path.extname(entry.name))) continue;
    const text = fs.readFileSync(absolute, "utf8");
    const checks = [
      ["transition-all", /\btransition-all\b/],
      ["unscoped var(--t) transition", /transition\s*:\s*["']var\(--t\)["']/],
      ["exact ease-in", /\bease-in\b(?!-out)/],
      ["scale(0)", /\bscale\(\s*0(?:\.0+)?\s*\)/],
    ];
    for (const [label, pattern] of checks) {
      if (pattern.test(text)) findings.push(`${relative}: ${label}`);
    }
  }
}

for (const directory of ["app", "components", "lib"]) {
  walk(path.join(root, directory));
}

if (findings.length > 0) {
  fail(`high-confidence anti-patterns found:\n- ${findings.join("\n- ")}`);
}

const globals = fs.readFileSync(path.join(root, "app/globals.css"), "utf8");
const tasteContract = fs.readFileSync(
  path.join(root, "docs/NEXUS_TASTE_CONTRACT.md"),
  "utf8",
);
if (!globals.includes("prefers-reduced-motion")) {
  fail("app/globals.css must preserve prefers-reduced-motion behavior");
}
if (!tasteContract.includes("## Motion Decision Gate")) {
  fail("docs/NEXUS_TASTE_CONTRACT.md is missing the motion decision gate");
}

console.log("Nexus motion taste contract and active source scan OK.");
