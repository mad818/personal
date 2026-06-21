/**
 * Codegraph query layer — wraps project import graph for ORBIT/RECON agents.
 * Adapted from colbymchenry/codegraph (static symbol/import graph, no runtime).
 */

import {
  getProjectGraph,
  type ProjectGraphResult,
} from "@/lib/projectArchitecture";

export interface CodegraphQueryResult {
  path: string;
  importers: string[];
  imports: string[];
  coupling: number;
}

function normalizeRepoPath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\//, "");
}

export function buildCodegraphSnapshot(
  root: string,
  focusPath?: string | null,
): ProjectGraphResult {
  return getProjectGraph(root, focusPath ?? null);
}

export function queryCodegraphNeighbors(
  root: string,
  filePath: string,
): CodegraphQueryResult | null {
  const normalized = normalizeRepoPath(filePath);
  const graph = getProjectGraph(root, normalized);
  const node = graph.nodes.find((entry) => entry.path === normalized);
  if (!node) return null;

  const importers = graph.edges
    .filter((edge) => edge.target === normalized)
    .map((edge) => edge.source)
    .slice(0, 12);
  const imports = graph.edges
    .filter((edge) => edge.source === normalized)
    .map((edge) => edge.target)
    .slice(0, 12);

  return {
    path: normalized,
    importers,
    imports,
    coupling: node.coupling,
  };
}

export function queryCodegraphDefinitions(
  root: string,
  symbol: string,
): string[] {
  const needle = symbol.trim().toLowerCase();
  if (!needle) return [];
  const graph = getProjectGraph(root);
  return graph.nodes
    .filter((node) => node.path.toLowerCase().includes(needle))
    .map((node) => node.path)
    .slice(0, 12);
}

export function formatCodegraphBlock(result: CodegraphQueryResult): string {
  return (
    `\n[CODEGRAPH — ${result.path}]\n` +
    `Coupling: ${result.coupling}\n` +
    `Importers (${result.importers.length}): ${result.importers.join(", ") || "none"}\n` +
    `Imports (${result.imports.length}): ${result.imports.join(", ") || "none"}\n` +
    `[END CODEGRAPH]\n`
  );
}
