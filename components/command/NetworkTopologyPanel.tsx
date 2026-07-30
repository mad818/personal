"use client";

import {
  buildNetworkTopologyLayout,
  topologyStatusColor,
} from "@/lib/networkTopology";
import { designTokens } from "@/lib/designTokens";
import type {
  NetworkHealthResult,
  NetworkHealthTarget,
} from "@/lib/networkHealthTargets";

interface NetworkTopologyPanelProps {
  targets: NetworkHealthTarget[];
  results: Record<string, NetworkHealthResult>;
}

export default function NetworkTopologyPanel({
  targets,
  results,
}: NetworkTopologyPanelProps) {
  const layout = buildNetworkTopologyLayout(targets, results);
  const width = 320;
  const height = 220;

  return (
    <div
      style={{
        background: "var(--surf)",
        border: "1px solid var(--border)",
        borderRadius: "10px",
        padding: "10px 12px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "8px",
        }}
      >
        <div>
          <div
            style={{ fontSize: "12px", fontWeight: 700, color: "var(--text)" }}
          >
            Route topology
          </div>
          <div
            style={{
              fontSize: "10px",
              color: "var(--text3)",
              marginTop: "2px",
            }}
          >
            Read-only hub view — homelable topology posture
          </div>
        </div>
        <span style={{ fontSize: "10px", color: "var(--text3)" }}>
          {targets.length} spokes
        </span>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        role="img"
        aria-label="Network route topology"
        style={{ display: "block" }}
      >
        {layout.edges.map((edge) => {
          const from = layout.nodes.find((node) => node.id === edge.fromId);
          const to = layout.nodes.find((node) => node.id === edge.toId);
          if (!from || !to) return null;
          const stroke =
            to.status === "fail"
              ? designTokens.critical
              : to.status === "warn"
                ? designTokens.warning
                : "var(--border)";
          const strokeOpacity =
            to.status === "fail" ? 0.53 : to.status === "warn" ? 0.4 : 1;
          return (
            <line
              key={`${edge.fromId}-${edge.toId}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={stroke}
              strokeOpacity={strokeOpacity}
              strokeWidth={1.5}
            />
          );
        })}

        {layout.nodes.map((node) => {
          const radius = node.isHub ? 16 : 11;
          const color = topologyStatusColor(node.status);
          return (
            <g key={node.id}>
              <circle
                cx={node.x}
                cy={node.y}
                r={radius}
                fill={node.isHub ? "var(--surf2)" : "var(--surf)"}
                stroke={color}
                strokeWidth={node.isHub ? 2.5 : 2}
              />
              <text
                x={node.x}
                y={node.y + radius + 12}
                textAnchor="middle"
                fill="var(--text3)"
                fontSize="8"
              >
                {node.label.length > 18
                  ? `${node.label.slice(0, 17)}…`
                  : node.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
