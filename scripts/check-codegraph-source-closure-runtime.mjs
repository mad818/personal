#!/usr/bin/env node
/* eslint-disable no-console */
import assert from "node:assert/strict";
import {
  explainProjectGraphFile,
  findProjectGraphPath,
  getProjectGraph,
} from "../lib/projectArchitecture.ts";

const root = process.cwd();
const graph = getProjectGraph(root, "app/api/project/route.ts");

assert.ok(graph.stats.nodeCount > 0);
assert.ok(graph.stats.edgeCount > 0);
assert.ok(graph.edges.every((edge) => edge.provenance === "extracted"));
assert.ok(graph.communities.length > 0);
assert.ok(graph.centralFiles.length > 0);

const explanation = explainProjectGraphFile(
  root,
  "app/api/project/route.ts",
);
assert.ok(explanation);
assert.equal(explanation.path, "app/api/project/route.ts");
assert.ok(explanation.directImports.includes("lib/projectArchitecture.ts"));

const path = findProjectGraphPath(
  root,
  "app/api/project/route.ts",
  "lib/projectArchitecture.ts",
);
assert.ok(path);
assert.equal(path.found, true);
assert.deepEqual(path.path, [
  "app/api/project/route.ts",
  "lib/projectArchitecture.ts",
]);

const noPath = findProjectGraphPath(
  root,
  "lib/projectArchitecture.ts",
  "app/api/project/route.ts",
);
assert.ok(noPath);
assert.equal(noPath.found, false);
assert.deepEqual(noPath.path, []);

console.log(
  `ok codegraph-source-runtime (nodes=${graph.stats.nodeCount}; edges=${graph.stats.edgeCount}; communities=${graph.communities.length}; path=2)`,
);
