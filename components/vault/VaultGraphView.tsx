"use client";
// ── VaultGraphView ────────────────────────────────────────────────────────────
// Force-directed knowledge graph visualization using HTML5 Canvas.
// No external dependencies — pure canvas + requestAnimationFrame.

import { useEffect, useRef, useState } from "react";
import type {
  VaultGraphData,
  VaultItemMetadata,
} from "@/components/home/office/types";

interface NodeState {
  id: string;
  title: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  mass: number;
  color: string;
}

const TYPE_COLORS: Record<string, string> = {
  note: "#4f6ef7",
  report: "#10b981",
  clip: "#f59e0b",
  task: "#ef4444",
  other: "#6875a0",
};

interface VaultGraphViewProps {
  graph: VaultGraphData;
  onNode?: (id: string) => void;
}

export function VaultGraphView({ graph, onNode }: VaultGraphViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<NodeState[]>([]);
  const frameRef = useRef<number>(0);
  const [hovered, setHovered] = useState<string | null>(null);

  // Initialise node positions
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;

    stateRef.current = graph.nodes.map((n, i) => ({
      id: n.id,
      title: n.title,
      x: W / 2 + Math.cos((i / graph.nodes.length) * Math.PI * 2) * 120,
      y: H / 2 + Math.sin((i / graph.nodes.length) * Math.PI * 2) * 120,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      mass:
        1 +
        graph.edges.filter((e) => e.source === n.id || e.target === n.id)
          .length *
          0.2,
      color: TYPE_COLORS[n.type ?? "other"] ?? TYPE_COLORS.other,
    }));
  }, [graph]);

  // Force simulation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const edgeMap: Record<
      string,
      Array<{ target: string; weight: number }>
    > = {};
    for (const e of graph.edges) {
      (edgeMap[e.source] ??= []).push({ target: e.target, weight: e.weight });
      (edgeMap[e.target] ??= []).push({ target: e.source, weight: e.weight });
    }

    let running = true;
    const tick = () => {
      if (!running) return;
      const nodes = stateRef.current;
      const W = canvas.offsetWidth;
      const H = canvas.offsetHeight;
      canvas.width = W;
      canvas.height = H;

      // Apply forces
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        // Repulsion between all nodes
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = -800 / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          a.vx += fx / a.mass;
          a.vy += fy / a.mass;
          b.vx -= fx / b.mass;
          b.vy -= fy / b.mass;
        }
        // Attraction along edges
        for (const { target, weight } of edgeMap[a.id] ?? []) {
          const b = nodes.find((n) => n.id === target);
          if (!b) continue;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const ideal = 80 + (1 - weight) * 60;
          const force = (dist - ideal) * 0.05 * weight;
          a.vx += (dx / dist) * force;
          a.vy += (dy / dist) * force;
          b.vx -= (dx / dist) * force;
          b.vy -= (dy / dist) * force;
        }
        // Centre gravity
        a.vx += (W / 2 - a.x) * 0.002;
        a.vy += (H / 2 - a.y) * 0.002;
        // Damping
        a.vx *= 0.9;
        a.vy *= 0.9;
        a.x += a.vx;
        a.y += a.vy;
        // Boundary
        a.x = Math.max(20, Math.min(W - 20, a.x));
        a.y = Math.max(20, Math.min(H - 20, a.y));
      }

      // Draw
      ctx.clearRect(0, 0, W, H);

      // Edges
      for (const e of graph.edges) {
        const src = nodes.find((n) => n.id === e.source);
        const tgt = nodes.find((n) => n.id === e.target);
        if (!src || !tgt) continue;
        ctx.beginPath();
        ctx.moveTo(src.x, src.y);
        ctx.lineTo(tgt.x, tgt.y);
        ctx.strokeStyle = `rgba(78,110,247,${e.weight * 0.5})`;
        ctx.lineWidth = e.weight * 2;
        ctx.stroke();
      }

      // Nodes
      for (const n of nodes) {
        const r = 6 + n.mass * 3;
        const isHov = n.id === hovered;
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = isHov ? "#fff" : n.color;
        ctx.fill();
        if (isHov) {
          ctx.strokeStyle = n.color;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        // Label
        if (isHov || n.mass > 2) {
          ctx.fillStyle = "#dde1f0";
          ctx.font = "10px sans-serif";
          ctx.textAlign = "center";
          const label =
            n.title.length > 20 ? n.title.slice(0, 18) + "…" : n.title;
          ctx.fillText(label, n.x, n.y - r - 4);
        }
      }

      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(frameRef.current);
    };
  }, [graph, hovered]);

  // Mouse hover
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const hit = stateRef.current.find((n) => {
      const dx = n.x - mx;
      const dy = n.y - my;
      return Math.sqrt(dx * dx + dy * dy) < 16;
    });
    setHovered(hit?.id ?? null);
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const hit = stateRef.current.find((n) => {
      const dx = n.x - mx;
      const dy = n.y - my;
      return Math.sqrt(dx * dx + dy * dy) < 16;
    });
    if (hit) onNode?.(hit.id);
  };

  return (
    <canvas
      ref={canvasRef}
      onMouseMove={handleMouseMove}
      onClick={handleClick}
      style={{
        width: "100%",
        height: "100%",
        cursor: hovered ? "pointer" : "default",
        borderRadius: "var(--r)",
      }}
    />
  );
}
