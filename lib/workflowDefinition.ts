import type {
  SweepTheater,
  WorkflowDefinition,
  WorkflowEdge,
  WorkflowNode,
  WorkflowNodeType,
} from "@/lib/assimilation/types";

export const WORKFLOW_NODE_TYPES = [
  "source",
  "agent",
  "transform",
  "approval",
  "scheduler",
  "sink",
] as const satisfies readonly WorkflowNodeType[];

const WORKFLOW_THEATERS = [
  "markets",
  "cyber",
  "geopolitics",
  "air-sea",
  "infra",
  "watchlist",
] as const satisfies readonly SweepTheater[];

const APPROVAL_MODES = [
  "human_gate",
  "approve_on_write",
  "observe",
] as const satisfies readonly WorkflowDefinition["approvalMode"][];

const ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,95}$/;
const MAX_NODES = 24;
const MAX_EDGES = 48;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function boundedText(
  value: unknown,
  label: string,
  min: number,
  max: number,
): string {
  if (typeof value !== "string") {
    throw new Error(`${label} must be text.`);
  }
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) {
    throw new Error(`${label} must be ${min}-${max} characters.`);
  }
  return trimmed;
}

function boundedId(value: unknown, label: string): string {
  const id = boundedText(value, label, 1, 96);
  if (!ID_PATTERN.test(id)) {
    throw new Error(`${label} contains unsupported characters.`);
  }
  return id;
}

function finiteCoordinate(value: unknown, label: string): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    Math.abs(value) > 1_000
  ) {
    throw new Error(`${label} must be a finite coordinate.`);
  }
  return value;
}

function parseNode(value: unknown, index: number): WorkflowNode {
  if (!isRecord(value)) throw new Error(`Node ${index + 1} is invalid.`);
  const type = value.type;
  if (
    typeof type !== "string" ||
    !WORKFLOW_NODE_TYPES.includes(type as WorkflowNodeType)
  ) {
    throw new Error(`Node ${index + 1} has an unsupported type.`);
  }
  return {
    id: boundedId(value.id, `Node ${index + 1} id`),
    type: type as WorkflowNodeType,
    title: boundedText(value.title, `Node ${index + 1} title`, 1, 100),
    detail: boundedText(value.detail, `Node ${index + 1} detail`, 1, 500),
    x: finiteCoordinate(value.x, `Node ${index + 1} x`),
    y: finiteCoordinate(value.y, `Node ${index + 1} y`),
  };
}

function parseEdge(
  value: unknown,
  index: number,
  nodeIds: Set<string>,
): WorkflowEdge {
  if (!isRecord(value)) throw new Error(`Edge ${index + 1} is invalid.`);
  const from = boundedId(value.from, `Edge ${index + 1} source`);
  const to = boundedId(value.to, `Edge ${index + 1} target`);
  if (from === to || !nodeIds.has(from) || !nodeIds.has(to)) {
    throw new Error(`Edge ${index + 1} must connect two different nodes.`);
  }
  return {
    id: boundedId(value.id, `Edge ${index + 1} id`),
    from,
    to,
    ...(value.label === undefined
      ? {}
      : { label: boundedText(value.label, `Edge ${index + 1} label`, 1, 120) }),
  };
}

export function normalizeWorkflowNodeOrder(
  nodes: readonly WorkflowNode[],
): WorkflowNode[] {
  return nodes.map((node, index) => ({ ...node, x: index, y: 0 }));
}

export function buildLinearWorkflowEdges(
  nodes: readonly WorkflowNode[],
): WorkflowEdge[] {
  return nodes.slice(0, -1).map((node, index) => ({
    id: `edge-${index + 1}-${node.id.slice(0, 32)}-${nodes[index + 1].id.slice(0, 32)}`,
    from: node.id,
    to: nodes[index + 1].id,
    label: "next",
  }));
}

export function moveWorkflowNode(
  nodes: readonly WorkflowNode[],
  nodeId: string,
  targetIndex: number,
): WorkflowNode[] {
  const sourceIndex = nodes.findIndex((node) => node.id === nodeId);
  if (sourceIndex === -1 || nodes.length < 2) return [...nodes];
  const next = [...nodes];
  const [moved] = next.splice(sourceIndex, 1);
  const boundedIndex = Math.max(0, Math.min(targetIndex, next.length));
  next.splice(boundedIndex, 0, moved);
  return normalizeWorkflowNodeOrder(next);
}

export function moveWorkflowNodeTo(
  nodes: readonly WorkflowNode[],
  nodeId: string,
  targetNodeId: string,
): WorkflowNode[] {
  const targetIndex = nodes.findIndex((node) => node.id === targetNodeId);
  if (targetIndex === -1 || nodeId === targetNodeId) return [...nodes];
  return moveWorkflowNode(nodes, nodeId, targetIndex);
}

export function mergeMissingWorkflowDefinitions(
  workflows: readonly WorkflowDefinition[],
  defaults: readonly WorkflowDefinition[],
): WorkflowDefinition[] {
  const existingIds = new Set(workflows.map((workflow) => workflow.id));
  return [
    ...workflows,
    ...defaults.filter((workflow) => !existingIds.has(workflow.id)),
  ];
}

export function parseWorkflowDefinition(input: unknown): WorkflowDefinition {
  if (!isRecord(input)) throw new Error("Workflow payload must be an object.");

  const theater = input.theater;
  if (
    typeof theater !== "string" ||
    !WORKFLOW_THEATERS.includes(theater as SweepTheater)
  ) {
    throw new Error("Workflow theater is invalid.");
  }
  const approvalMode = input.approvalMode;
  if (
    typeof approvalMode !== "string" ||
    !APPROVAL_MODES.includes(approvalMode as WorkflowDefinition["approvalMode"])
  ) {
    throw new Error("Workflow approval mode is invalid.");
  }
  if (!Array.isArray(input.tags) || input.tags.length > 12) {
    throw new Error("Workflow tags must contain no more than 12 entries.");
  }
  const tags = input.tags.map((tag, index) =>
    boundedText(tag, `Workflow tag ${index + 1}`, 1, 40),
  );
  if (new Set(tags).size !== tags.length) {
    throw new Error("Workflow tags must be unique.");
  }
  if (
    typeof input.version !== "number" ||
    !Number.isInteger(input.version) ||
    input.version < 1 ||
    input.version > 1_000_000
  ) {
    throw new Error("Workflow version is invalid.");
  }
  if (
    typeof input.updatedAt !== "string" ||
    !Number.isFinite(Date.parse(input.updatedAt))
  ) {
    throw new Error("Workflow updated timestamp is invalid.");
  }
  if (
    !Array.isArray(input.nodes) ||
    input.nodes.length < 1 ||
    input.nodes.length > MAX_NODES
  ) {
    throw new Error(`Workflow nodes must contain 1-${MAX_NODES} entries.`);
  }
  const nodes = input.nodes.map(parseNode);
  const nodeIds = new Set(nodes.map((node) => node.id));
  if (nodeIds.size !== nodes.length) {
    throw new Error("Workflow node IDs must be unique.");
  }
  if (!Array.isArray(input.edges) || input.edges.length > MAX_EDGES) {
    throw new Error(`Workflow edges must contain 0-${MAX_EDGES} entries.`);
  }
  const edges = input.edges.map((edge, index) =>
    parseEdge(edge, index, nodeIds),
  );
  if (new Set(edges.map((edge) => edge.id)).size !== edges.length) {
    throw new Error("Workflow edge IDs must be unique.");
  }
  if (
    tags.includes("campaign") &&
    approvalMode === "human_gate" &&
    !nodes.some((node) => node.type === "approval")
  ) {
    throw new Error("Human-gated campaign workflows need an approval node.");
  }

  return {
    id: boundedId(input.id, "Workflow id"),
    name: boundedText(input.name, "Workflow name", 1, 120),
    description: boundedText(
      input.description,
      "Workflow description",
      1,
      1_200,
    ),
    theater: theater as SweepTheater,
    tags,
    version: input.version as number,
    updatedAt: input.updatedAt,
    approvalMode: approvalMode as WorkflowDefinition["approvalMode"],
    nodes,
    edges,
  };
}
