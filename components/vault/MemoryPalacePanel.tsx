"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";
import type { MinedMemory, MemoryCompartment } from "@/lib/memoryMining";
import {
  SurfaceCallout,
  SurfaceEmpty,
  SurfaceSkeletonRows,
} from "@/components/ui/surfacePrimitives";
import { ShellBadge, ShellStack } from "@/components/ui/shell";

const MEMORY_QUERIES: Record<MemoryCompartment, string> = {
  project: "project memory",
  conversation: "conversation memory",
  general: "general memory",
  research: "research memory",
  study: "study memory",
};

const MEMORY_LABELS: Record<MemoryCompartment, string> = {
  project: "Project memory",
  conversation: "Conversation memory",
  general: "General memory",
  research: "Research memory",
  study: "Study memory",
};

interface MemoryPalacePanelProps {
  compartment: MemoryCompartment;
}

export default function MemoryPalacePanel({
  compartment,
}: MemoryPalacePanelProps) {
  const [items, setItems] = useState<MinedMemory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          q: MEMORY_QUERIES[compartment],
          compartment,
          limit: "3",
        });
        const response = await apiFetch(`/api/memory/mine?${params.toString()}`);
        if (!response.ok) return;
        const data = (await response.json()) as { mined?: MinedMemory[] };
        if (!cancelled) {
          setItems(Array.isArray(data.mined) ? data.mined : []);
        }
      } catch {
        if (!cancelled) {
          setItems([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [compartment]);

  if (loading) {
    return <SurfaceSkeletonRows rows={3} />;
  }

  if (items.length === 0) {
    return (
      <SurfaceEmpty
        title={`${MEMORY_LABELS[compartment]} is still thin`}
        description="Local mining is ready, but this compartment does not have strong durable matches yet."
      />
    );
  }

  return (
    <ShellStack gap="10px">
      <SurfaceCallout
        title={`${MEMORY_LABELS[compartment]} overview`}
        description="Local-first mined memory, ranked by continuity and freshness."
        tone="default"
      />
      {items.map((item) => (
        <article
          key={item.id}
          style={{
            border: "1px solid rgba(123, 167, 212, 0.16)",
            borderRadius: "12px",
            padding: "12px",
            display: "grid",
            gap: "8px",
            background: "rgba(9, 18, 31, 0.58)",
          }}
        >
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <ShellBadge tone="muted">{item.compartment}</ShellBadge>
            <ShellBadge tone={item.inferred ? "muted" : "success"}>
              {item.inferred ? "Inferred" : "Source-backed"}
            </ShellBadge>
            <ShellBadge tone="muted">{item.evidenceStrength}</ShellBadge>
            <ShellBadge tone="accent">{item.confidence}% match</ShellBadge>
          </div>
          <div style={{ fontWeight: 700, color: "var(--text1)" }}>{item.title}</div>
          <p className="nexus-shell-copy nexus-shell-copy--compact">{item.summary}</p>
          {item.facts.length > 0 ? (
            <ul
              style={{
                margin: 0,
                paddingLeft: "18px",
                color: "var(--text2)",
                fontSize: "12px",
                lineHeight: 1.6,
              }}
            >
              {item.facts.slice(0, 2).map((fact) => (
                <li key={fact}>{fact}</li>
              ))}
            </ul>
          ) : null}
        </article>
      ))}
    </ShellStack>
  );
}
