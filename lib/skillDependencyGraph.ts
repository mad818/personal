import {
  SKILL_CAPABILITY_POLICIES,
  type SkillRiskLevel,
} from "./skillSpectrumPolicy.ts";

export type SkillGraphRiskLevel = SkillRiskLevel | "none";

export interface SkillDependencyNode {
  id: string;
  capabilities: string[];
  dependencies: string[];
}

export interface UnresolvedSkillDependency {
  from: string;
  dependency: string;
}

export interface SkillDependencyCycle {
  path: string[];
}

export interface SkillPrivilegeEscalation {
  skillId: string;
  directRisk: SkillGraphRiskLevel;
  inheritedRisk: SkillGraphRiskLevel;
  via: string[];
  capabilities: string[];
}

export interface SkillDependencyGraphReport {
  nodeCount: number;
  edgeCount: number;
  unresolved: UnresolvedSkillDependency[];
  cycles: SkillDependencyCycle[];
  escalations: SkillPrivilegeEscalation[];
}

export const SKILL_DEPENDENCY_GRAPH_GUARDRAILS = [
  "missing dependencies",
  "dependency cycles",
  "transitive blocked-capability chains",
] as const;

const RISK_RANK: Record<SkillGraphRiskLevel, number> = {
  none: 0,
  safe: 0,
  review: 1,
  blocked: 2,
};

const CAPABILITY_RISK = new Map(
  SKILL_CAPABILITY_POLICIES.map((policy) => [
    policy.capability,
    policy.riskLevel,
  ]),
);

function riskForCapabilities(capabilities: string[]): SkillGraphRiskLevel {
  let risk: SkillGraphRiskLevel = capabilities.length > 0 ? "safe" : "none";

  for (const capability of capabilities) {
    const capabilityRisk = CAPABILITY_RISK.get(capability) ?? "none";
    if (RISK_RANK[capabilityRisk] > RISK_RANK[risk]) {
      risk = capabilityRisk;
    }
  }

  return risk;
}

function canonicalizeCycle(path: string[]): string[] {
  const body = path.slice(0, -1);
  if (body.length === 0) return path;

  const rotations = body.map((_, index) => [
    ...body.slice(index),
    ...body.slice(0, index),
  ]);
  rotations.sort((left, right) =>
    left.join("\u0000").localeCompare(right.join("\u0000")),
  );
  const canonical = rotations[0];
  return [...canonical, canonical[0]];
}

export function analyzeSkillDependencyGraph(
  inputNodes: SkillDependencyNode[],
): SkillDependencyGraphReport {
  const nodes = [...inputNodes]
    .map((node) => ({
      ...node,
      capabilities: [...new Set(node.capabilities)].sort(),
      dependencies: [...new Set(node.dependencies)].sort(),
    }))
    .sort((left, right) => left.id.localeCompare(right.id));
  const nodeById = new Map(nodes.map((node) => [node.id, node]));

  const unresolved = nodes
    .flatMap((node) =>
      node.dependencies
        .filter((dependency) => !nodeById.has(dependency))
        .map((dependency) => ({ from: node.id, dependency })),
    )
    .sort(
      (left, right) =>
        left.from.localeCompare(right.from) ||
        left.dependency.localeCompare(right.dependency),
    );

  const resolvedDependencies = new Map(
    nodes.map((node) => [
      node.id,
      node.dependencies.filter((dependency) => nodeById.has(dependency)),
    ]),
  );

  const visitState = new Map<string, "visiting" | "visited">();
  const cycleByKey = new Map<string, SkillDependencyCycle>();

  const visit = (nodeId: string, stack: string[]) => {
    visitState.set(nodeId, "visiting");
    const nextStack = [...stack, nodeId];

    for (const dependency of resolvedDependencies.get(nodeId) ?? []) {
      const state = visitState.get(dependency);
      if (state === "visiting") {
        const cycleStart = nextStack.indexOf(dependency);
        const cycle = canonicalizeCycle([
          ...nextStack.slice(cycleStart),
          dependency,
        ]);
        cycleByKey.set(cycle.join("\u0000"), { path: cycle });
        continue;
      }
      if (state !== "visited") visit(dependency, nextStack);
    }

    visitState.set(nodeId, "visited");
  };

  for (const node of nodes) {
    if (!visitState.has(node.id)) visit(node.id, []);
  }

  const escalations: SkillPrivilegeEscalation[] = [];

  for (const node of nodes) {
    const directRisk = riskForCapabilities(node.capabilities);
    let inheritedRisk: SkillGraphRiskLevel = "none";
    let inheritedCapabilities: string[] = [];
    let via: string[] = [];
    const visited = new Set<string>();
    const queue = (resolvedDependencies.get(node.id) ?? []).map(
      (dependency) => ({
        dependency,
        path: [node.id, dependency],
      }),
    );

    while (queue.length > 0) {
      const next = queue.shift();
      if (!next || visited.has(next.dependency)) continue;
      visited.add(next.dependency);

      const dependencyNode = nodeById.get(next.dependency);
      if (!dependencyNode) continue;

      for (const capability of dependencyNode.capabilities) {
        const capabilityRisk = CAPABILITY_RISK.get(capability) ?? "none";
        const rank = RISK_RANK[capabilityRisk];
        const inheritedRank = RISK_RANK[inheritedRisk];
        const evidence = `${dependencyNode.id}:${capability}`;

        if (rank > inheritedRank) {
          inheritedRisk = capabilityRisk;
          inheritedCapabilities = [evidence];
          via = next.path;
        } else if (rank === inheritedRank && rank > 0) {
          inheritedCapabilities.push(evidence);
        }
      }

      for (const dependency of resolvedDependencies.get(dependencyNode.id) ??
        []) {
        if (!visited.has(dependency)) {
          queue.push({
            dependency,
            path: [...next.path, dependency],
          });
        }
      }
    }

    if (RISK_RANK[inheritedRisk] > RISK_RANK[directRisk]) {
      escalations.push({
        skillId: node.id,
        directRisk,
        inheritedRisk,
        via,
        capabilities: [...new Set(inheritedCapabilities)].sort(),
      });
    }
  }

  return {
    nodeCount: nodes.length,
    edgeCount: [...resolvedDependencies.values()].reduce(
      (total, dependencies) => total + dependencies.length,
      0,
    ),
    unresolved,
    cycles: [...cycleByKey.values()].sort((left, right) =>
      left.path.join("\u0000").localeCompare(right.path.join("\u0000")),
    ),
    escalations,
  };
}
