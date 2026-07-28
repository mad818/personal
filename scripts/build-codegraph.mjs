#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";
import { getProjectGraph } from "../lib/projectArchitecture.ts";

const root = process.cwd();
const outDir = path.join(root, "data", "exports", "codegraph");
const jsonFile = path.join(outDir, "graph.json");
const reportFile = path.join(outDir, "GRAPH_REPORT.md");
const htmlFile = path.join(outDir, "graph.html");
const checkOnly = process.argv.includes("--check");

const snapshot = getProjectGraph(root, null);
const payload = {
  generatedAt: new Date().toISOString(),
  ...snapshot,
};

if (
  payload.stats.nodeCount < 1 ||
  payload.edges.some((edge) => edge.provenance !== "extracted") ||
  payload.communities.length < 1
) {
  console.error("x codegraph export contract is incomplete");
  process.exit(1);
}

if (checkOnly) {
  console.log(
    `ok codegraph-export (nodes=${payload.stats.nodeCount}; edges=${payload.stats.edgeCount}; communities=${payload.communities.length}; write=false)`,
  );
  process.exit(0);
}

const report = [
  "# Nexus Project Graph",
  "",
  `Generated: ${payload.generatedAt}`,
  `Scanned files: ${payload.stats.scannedFiles}`,
  `Extracted edges: ${payload.stats.edgeCount}`,
  `Import communities: ${payload.communities.length}`,
  "",
  "## Central files",
  "",
  ...payload.centralFiles.map((file) => `- ${file}`),
  "",
  "## Import communities",
  "",
  ...payload.communities.map(
    (community) =>
      `- ${community.id}: ${community.members.length} file${community.members.length === 1 ? "" : "s"}`,
  ),
  "",
].join("\n");
const safePayload = JSON.stringify(payload).replaceAll("<", "\\u003c");
const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Nexus project graph</title>
  <style>
    body{font:14px system-ui;margin:0;background:#090d14;color:#e5edf8}
    main{max-width:1100px;margin:auto;padding:32px}
    input{width:100%;box-sizing:border-box;padding:12px;background:#101827;color:inherit;border:1px solid #334155;border-radius:8px}
    table{width:100%;border-collapse:collapse;margin-top:18px}
    th,td{text-align:left;padding:8px;border-bottom:1px solid #1f2937}
    th{color:#93c5fd}
  </style>
</head>
<body>
<main>
  <h1>Nexus project graph</h1>
  <p>${payload.stats.nodeCount} files · ${payload.stats.edgeCount} extracted edges · ${payload.communities.length} import communities</p>
  <input id="query" type="search" placeholder="Filter file paths" aria-label="Filter file paths">
  <table><thead><tr><th>File</th><th>Imports</th><th>Importers</th><th>Coupling</th></tr></thead><tbody id="rows"></tbody></table>
</main>
<script>
const graph=${safePayload};
const rows=document.getElementById("rows");
const query=document.getElementById("query");
function render(){
  const term=query.value.trim().toLowerCase();
  rows.replaceChildren(...graph.nodes.filter(node=>node.path.toLowerCase().includes(term)).map(node=>{
    const row=document.createElement("tr");
    for(const value of [node.path,node.directImports,node.importers,node.coupling]){
      const cell=document.createElement("td");
      cell.textContent=String(value);
      row.appendChild(cell);
    }
    return row;
  }));
}
query.addEventListener("input",render);
render();
</script>
</body>
</html>
`;

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(jsonFile, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
fs.writeFileSync(reportFile, report, "utf8");
fs.writeFileSync(htmlFile, html, "utf8");
console.log(
  `ok codegraph export → ${path.relative(root, outDir)} (${snapshot.stats.nodeCount} nodes, ${snapshot.stats.edgeCount} edges)`,
);
