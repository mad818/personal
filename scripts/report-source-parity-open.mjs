#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const parityDirectory = path.join(root, "docs", "ideas", "source-parity");
const args = process.argv.slice(2);
const json = args.includes("--json");
const summaryOnly = args.includes("--summary");
const requireZero = args.includes("--require-zero");
const matrixArgument =
  args.find((arg) => arg.startsWith("--matrix="))?.slice("--matrix=".length) ??
  (() => {
    const index = args.indexOf("--matrix");
    return index >= 0 ? args[index + 1] : undefined;
  })();

if (!fs.existsSync(parityDirectory)) {
  console.error("Source parity directory is missing.");
  process.exit(2);
}

const matrices = fs
  .readdirSync(parityDirectory)
  .filter((file) => file.endsWith(".json"))
  .sort()
  .map((file) => {
    const filePath = path.join(parityDirectory, file);
    const matrix = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const capabilities = Array.isArray(matrix.capabilities)
      ? matrix.capabilities
      : [];
    const pending = capabilities
      .filter((capability) => capability.disposition === "pending")
      .map((capability) => ({
        id: String(capability.id ?? ""),
        title: String(capability.title ?? ""),
        reason: String(capability.reason ?? ""),
      }));
    return {
      id: String(matrix.id ?? path.basename(file, ".json")),
      name: String(matrix.name ?? matrix.id ?? file),
      file: path.posix.join("docs/ideas/source-parity", file),
      status: String(matrix.status ?? "unknown"),
      capabilityCount: capabilities.length,
      pending,
    };
  });

const selectedMatrices = matrixArgument
  ? matrices.filter((matrix) => matrix.id === matrixArgument)
  : matrices;

if (matrixArgument && selectedMatrices.length === 0) {
  console.error(`Unknown source parity matrix: ${matrixArgument}`);
  process.exit(2);
}

const openMatrices = selectedMatrices.filter(
  (matrix) => matrix.status !== "complete" || matrix.pending.length > 0,
);
const pendingCapabilities = openMatrices.flatMap((matrix) =>
  matrix.pending.map((capability) => ({
    matrixId: matrix.id,
    matrixName: matrix.name,
    ...capability,
  })),
);
const statusCounts = Object.fromEntries(
  [...new Set(selectedMatrices.map((matrix) => matrix.status))]
    .sort()
    .map((status) => [
      status,
      selectedMatrices.filter((matrix) => matrix.status === status).length,
    ]),
);
const report = {
  generatedFrom: "docs/ideas/source-parity/*.json",
  matrixCount: selectedMatrices.length,
  statusCounts,
  openMatrixCount: openMatrices.length,
  pendingCapabilityCount: pendingCapabilities.length,
  complete: openMatrices.length === 0 && pendingCapabilities.length === 0,
  matrices: openMatrices,
};

if (json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(
    `Source parity closure: ${report.matrixCount} matrices; ${statusCounts.complete ?? 0} complete; ${report.openMatrixCount} open; ${report.pendingCapabilityCount} pending capabilities.`,
  );
  for (const matrix of openMatrices) {
    console.log(
      `- ${matrix.id} [${matrix.status}] pending=${matrix.pending.length} capabilities=${matrix.capabilityCount}`,
    );
    if (!summaryOnly) {
      for (const capability of matrix.pending) {
        console.log(
          `  - ${capability.id}: ${capability.title}${capability.reason ? ` — ${capability.reason}` : ""}`,
        );
      }
    }
  }
}

if (requireZero && !report.complete) process.exitCode = 1;
