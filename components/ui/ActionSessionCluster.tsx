"use client";

import type { CSSProperties } from "react";
import { ShellBadge } from "@/components/ui/shell";
import {
  getSessionTargetLabel,
  isExactSessionHref,
  normalizeSessionHref,
} from "@/lib/exactSessionLinks";

export interface ActionSessionItem {
  href: string;
  label: string;
  detail: string;
  context?: string;
}

function defaultButtonStyle() {
  return {
    padding: "8px 10px",
    borderRadius: "999px",
    border: "1px solid var(--border)",
    background: "rgba(10, 15, 30, 0.58)",
    color: "var(--text)",
    fontSize: "11px",
    cursor: "pointer",
    textDecoration: "none",
  } as const;
}

function detailCardStyle() {
  return {
    padding: "12px",
    borderRadius: "12px",
    border: "1px solid var(--border)",
    background: "rgba(10, 15, 30, 0.62)",
  } as const;
}

export default function ActionSessionCluster({
  items,
  onOpen,
  buttonClassName,
  buttonStyle,
  showHref = false,
  maxPrimaryItems,
  showPrimaryCards = true,
}: {
  items: ActionSessionItem[];
  onOpen: (href: string) => void;
  buttonClassName?: string;
  buttonStyle?: CSSProperties;
  showHref?: boolean;
  maxPrimaryItems?: number;
  showPrimaryCards?: boolean;
}) {
  if (items.length === 0) return null;

  const primaryItems =
    typeof maxPrimaryItems === "number" && maxPrimaryItems > 0
      ? items.slice(0, maxPrimaryItems)
      : items;
  const overflowItems =
    typeof maxPrimaryItems === "number" && maxPrimaryItems > 0
      ? items.slice(maxPrimaryItems)
      : [];

  const renderItemCard = (item: ActionSessionItem) => (
    <article key={`${item.href}-detail`} style={detailCardStyle()}>
      <div style={{ display: "grid", gap: "6px" }}>
        {(() => {
          const normalizedHref = normalizeSessionHref(item.href);
          return (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "8px",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ fontSize: "12px", color: "var(--text)" }}>
                  {item.label}
                </div>
                <ShellBadge
                  tone={isExactSessionHref(normalizedHref) ? "accent" : "muted"}
                >
                  {getSessionTargetLabel(normalizedHref)}
                </ShellBadge>
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--text2)",
                  lineHeight: 1.5,
                }}
              >
                {item.detail}
              </div>
              {item.context ? (
                <div
                  style={{
                    fontSize: "10px",
                    color: "var(--text3)",
                    wordBreak: "break-word",
                  }}
                >
                  {item.context}
                </div>
              ) : null}
              {showHref ? (
                <div
                  style={{
                    fontSize: "10px",
                    color: "var(--text3)",
                    wordBreak: "break-word",
                  }}
                >
                  {normalizedHref}
                </div>
              ) : null}
            </>
          );
        })()}
      </div>
    </article>
  );

  return (
    <>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {primaryItems.map((item) => (
          <button
            key={item.href}
            type="button"
            onClick={() => onOpen(normalizeSessionHref(item.href))}
            style={buttonStyle ?? defaultButtonStyle()}
            className={buttonClassName}
            title={item.detail}
          >
            {item.label}
          </button>
        ))}
        {overflowItems.length > 0 ? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              minHeight: "34px",
              padding: "0 10px",
              borderRadius: "999px",
              border: "1px solid var(--border)",
              background: "rgba(10, 15, 30, 0.38)",
              color: "var(--text3)",
              fontSize: "11px",
            }}
          >
            +{overflowItems.length} more session
            {overflowItems.length === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>
      {showPrimaryCards ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "10px",
          }}
        >
          {primaryItems.map(renderItemCard)}
        </div>
      ) : null}
      {overflowItems.length > 0 ? (
        <details
          style={{
            padding: "10px 12px",
            borderRadius: "12px",
            border: "1px solid var(--border)",
            background: "rgba(10, 15, 30, 0.42)",
          }}
        >
          <summary
            style={{
              cursor: "pointer",
              fontSize: "11px",
              fontWeight: 700,
              color: "var(--text2)",
            }}
          >
            More exact sessions ({overflowItems.length})
          </summary>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "10px",
              marginTop: "10px",
            }}
          >
            {overflowItems.map(renderItemCard)}
          </div>
        </details>
      ) : null}
    </>
  );
}
