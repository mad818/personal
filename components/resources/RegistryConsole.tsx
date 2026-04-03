"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { SectionLabel, ShellBadge } from "@/components/ui/shell";
import type { AssetKit, RegistryCostTier, RegistryItem } from "@/lib/assimilation/types";

interface Props {
  compact?: boolean;
  view?: "all" | "items" | "kits";
}

const COST_LABELS: Record<RegistryCostTier, string> = {
  free: "Free",
  limited_free: "Limited free",
  open_source: "Open source",
  byok: "BYOK",
  free_local: "Local only",
  license_check: "License check",
};

export default function RegistryConsole({ compact = false, view = "all" }: Props) {
  const [items, setItems] = useState<RegistryItem[]>([]);
  const [kits, setKits] = useState<AssetKit[]>([]);
  const [search, setSearch] = useState("");
  const [costFilter, setCostFilter] = useState<RegistryCostTier | "all">("all");
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    let active = true;
    void fetch("/api/registry", { cache: "no-store" })
      .then((response) => response.json() as Promise<{ items: RegistryItem[]; kits: AssetKit[] }>)
      .then((payload) => {
        if (!active) return;
        setItems(payload.items);
        setKits(payload.kits);
      });
    return () => {
      active = false;
    };
  }, []);

  const visibleItems = useMemo(() => {
    const term = deferredSearch.trim().toLowerCase();
    return items.filter((item) => {
      const matchesTerm =
        !term ||
        [item.title, item.summary, item.tags.join(" "), item.owner, item.custody]
          .join(" ")
          .toLowerCase()
          .includes(term);
      const matchesCost = costFilter === "all" || item.costTier === costFilter;
      return matchesTerm && matchesCost;
    });
  }, [costFilter, deferredSearch, items]);

  const visibleKits = useMemo(() => {
    const term = deferredSearch.trim().toLowerCase();
    return kits.filter((kit) =>
      !term
        ? true
        : [kit.title, kit.summary, kit.owner].join(" ").toLowerCase().includes(term),
    );
  }, [deferredSearch, kits]);

  return (
    <div style={{ display: "grid", gap: compact ? "12px" : "16px" }}>
      {!compact && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) auto",
            gap: "12px",
            alignItems: "end",
          }}
        >
          <label style={{ display: "grid", gap: "6px" }}>
            <span style={{ fontSize: "10px", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Search registry
            </span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search tools, datasets, prompts, kits"
              style={{
                padding: "10px 12px",
                borderRadius: "10px",
                border: "1px solid var(--border)",
                background: "var(--surf2)",
                color: "var(--text)",
              }}
            />
          </label>
          <label style={{ display: "grid", gap: "6px", minWidth: "180px" }}>
            <span style={{ fontSize: "10px", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Cost posture
            </span>
            <select
              value={costFilter}
              onChange={(event) =>
                setCostFilter(event.target.value as RegistryCostTier | "all")
              }
              style={{
                padding: "10px 12px",
                borderRadius: "10px",
                border: "1px solid var(--border)",
                background: "var(--surf2)",
                color: "var(--text)",
              }}
            >
              <option value="all">All tiers</option>
              {Object.entries(COST_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {view !== "kits" && (
        <div style={{ display: "grid", gap: "10px" }}>
          <SectionLabel detail={`${visibleItems.length} assets`}>Registry items</SectionLabel>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: compact
                ? "repeat(auto-fit, minmax(220px, 1fr))"
                : "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "12px",
            }}
          >
            {visibleItems.map((item) => (
              <article
                key={item.id}
                style={{
                  padding: "12px",
                  borderRadius: "12px",
                  border: "1px solid var(--border)",
                  background: "rgba(10, 15, 30, 0.62)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "center" }}>
                  <strong style={{ fontSize: "13px" }}>{item.title}</strong>
                  <ShellBadge tone={item.status === "ready" ? "success" : item.status === "watch" ? "accent" : "muted"}>
                    {item.status}
                  </ShellBadge>
                </div>
                <p style={{ margin: "8px 0 0", fontSize: "11px", color: "var(--text2)", lineHeight: 1.55 }}>
                  {item.summary}
                </p>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "10px" }}>
                  <ShellBadge tone="muted">{item.type}</ShellBadge>
                  <ShellBadge tone="accent">{COST_LABELS[item.costTier]}</ShellBadge>
                  <ShellBadge tone="muted">{item.custody}</ShellBadge>
                </div>
                <div style={{ marginTop: "10px", fontSize: "10px", color: "var(--text3)", lineHeight: 1.55 }}>
                  Owner: {item.owner}
                  <br />
                  License: {item.license}
                  {item.reminder ? (
                    <>
                      <br />
                      Reminder: {item.reminder}
                    </>
                  ) : null}
                </div>
                {item.sourceUrl ? (
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "inline-flex",
                      marginTop: "10px",
                      fontSize: "11px",
                      color: "var(--accent)",
                    }}
                  >
                    Open source ↗
                  </a>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      )}

      {view !== "items" && (
        <div style={{ display: "grid", gap: "10px" }}>
          <SectionLabel detail={`${visibleKits.length} bundles`}>Registry kits</SectionLabel>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: compact
                ? "repeat(auto-fit, minmax(220px, 1fr))"
                : "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "12px",
            }}
          >
            {visibleKits.map((kit) => (
              <article
                key={kit.id}
                style={{
                  padding: "12px",
                  borderRadius: "12px",
                  border: "1px solid rgba(214, 165, 109, 0.38)",
                  background: "rgba(214, 165, 109, 0.08)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "center" }}>
                  <strong style={{ fontSize: "13px" }}>{kit.title}</strong>
                  <ShellBadge tone={kit.status === "ready" ? "success" : "accent"}>
                    {kit.status}
                  </ShellBadge>
                </div>
                <p style={{ margin: "8px 0 0", fontSize: "11px", color: "var(--text2)", lineHeight: 1.55 }}>
                  {kit.summary}
                </p>
                <div style={{ marginTop: "10px", fontSize: "10px", color: "var(--text3)", lineHeight: 1.55 }}>
                  Owner: {kit.owner}
                  <br />
                  Items: {kit.itemIds.length}
                  {kit.reminder ? (
                    <>
                      <br />
                      Reminder: {kit.reminder}
                    </>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
