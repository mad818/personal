"use client";

// ── components/ui/LoadingSkeleton.tsx ─────────────────────────────────────────
// Reusable skeleton loading component with shared cinematic shell shimmer.

import { cn } from "@/lib/cn";
import React from "react";

export interface LoadingSkeletonProps {
  width?: string | number;
  height?: string | number;
  variant?: "card" | "chart" | "text" | "circle";
  style?: React.CSSProperties;
}

function getVariantStyle(
  variant: LoadingSkeletonProps["variant"],
): React.CSSProperties {
  switch (variant) {
    case "circle":
      return { borderRadius: "50%" };
    case "text":
      return { borderRadius: "4px", height: "12px" };
    case "chart":
      return { borderRadius: "8px", minHeight: "200px" };
    case "card":
    default:
      return { borderRadius: "10px" };
  }
}

export function LoadingSkeleton({
  width = "100%",
  height = "100%",
  variant = "card",
  style,
}: LoadingSkeletonProps) {
  const variantStyle = getVariantStyle(variant);

  return (
    <div
      className={cn(
        "nexus-loading-skeleton",
        `nexus-loading-skeleton--${variant}`,
      )}
      style={{
        width,
        height,
        ...variantStyle,
        ...style,
      }}
      data-cinematic-state="loading"
      aria-hidden="true"
    />
  );
}

// ── Preset: chart area skeleton ────────────────────────────────────────────────
export function ChartSkeleton({
  height = 280,
  style,
}: {
  height?: number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className="nexus-chart-skeleton"
      style={{
        ...style,
      }}
    >
      {/* Header skeleton */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          marginBottom: "16px",
        }}
      >
        <LoadingSkeleton variant="text" width="35%" height={12} />
        <LoadingSkeleton variant="text" width="55%" height={10} />
      </div>

      {/* Chart area skeleton */}
      <LoadingSkeleton variant="chart" height={height} />

      {/* Footer skeleton */}
      <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
        <LoadingSkeleton variant="text" width="18%" height={9} />
        <LoadingSkeleton variant="text" width="18%" height={9} />
        <LoadingSkeleton variant="text" width="18%" height={9} />
      </div>
    </div>
  );
}

export default LoadingSkeleton;
