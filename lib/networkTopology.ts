import type {
  NetworkHealthResult,
  NetworkHealthTarget,
} from "@/lib/networkHealthTargets";
import { networkHealthStatusColor } from "@/lib/designTokens";

export interface TopologyNode {
  id: string;
  label: string;
  status: NetworkHealthResult["status"];
  ms: number | null;
  x: number;
  y: number;
  isHub?: boolean;
}

export interface TopologyEdge {
  fromId: string;
  toId: string;
}

export interface TopologyLayout {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
  hubId: string;
}

const HUB_ID = "nexus-hub";

function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  index: number,
  total: number,
) {
  const angle = (Math.PI * 2 * index) / Math.max(total, 1) - Math.PI / 2;
  return {
    x: centerX + radius * Math.cos(angle),
    y: centerY + radius * Math.sin(angle),
  };
}

export function buildNetworkTopologyLayout(
  targets: NetworkHealthTarget[],
  results: Record<string, NetworkHealthResult>,
  opts: { width?: number; height?: number; hubLabel?: string } = {},
): TopologyLayout {
  const width = opts.width ?? 320;
  const height = opts.height ?? 220;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.34;
  const hubLabel = opts.hubLabel ?? "Nexus HQ";

  const nodes: TopologyNode[] = [
    {
      id: HUB_ID,
      label: hubLabel,
      status: results.nexus?.status ?? "idle",
      ms: results.nexus?.ms ?? null,
      x: centerX,
      y: centerY,
      isHub: true,
    },
  ];

  const edges: TopologyEdge[] = [];

  targets.forEach((target, index) => {
    const result = results[target.id];
    const { x, y } = polarToCartesian(
      centerX,
      centerY,
      radius,
      index,
      targets.length,
    );
    nodes.push({
      id: target.id,
      label: target.label,
      status: result?.status ?? "idle",
      ms: result?.ms ?? null,
      x,
      y,
    });
    edges.push({ fromId: HUB_ID, toId: target.id });
  });

  return { nodes, edges, hubId: HUB_ID };
}

export function topologyStatusColor(
  status: NetworkHealthResult["status"],
): string {
  return networkHealthStatusColor(status);
}
