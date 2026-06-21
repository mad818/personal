#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";
import { getProjectGraph } from "../lib/projectArchitecture.ts";

const root = process.cwd();
const outDir = path.join(root, "docs", "metrics");
const outFile = path.join(outDir, "codegraph-latest.json");

const snapshot = getProjectGraph(root, null);
const payload = {
  generatedAt: new Date().toISOString(),
  ...snapshot,
};

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(
  `ok codegraph snapshot → ${path.relative(root, outFile)} (${snapshot.stats.nodeCount} nodes, ${snapshot.stats.edgeCount} edges)`,
);
