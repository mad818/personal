"use client";

import type { CSSProperties } from "react";
import {
  SurfaceCallout,
  SurfaceSkeletonRows,
} from "@/components/ui/surfacePrimitives";

interface DataLoadingStateProps {
  dataName: string;
  height?: number;
  style?: CSSProperties;
}

export default function DataLoadingState({
  dataName,
  height = 200,
  style,
}: DataLoadingStateProps) {
  return (
    <SurfaceCallout
      tone="info"
      className="nexus-surface-loading-state"
      icon={<span>...</span>}
      title={`Loading ${dataName}`}
      description="Preparing the local/free-first operating picture."
      style={{ minHeight: `${height}px`, ...style }}
      data-cinematic-state="loading"
    >
      <div className="nexus-surface-loading-state__pulse" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <SurfaceSkeletonRows rows={3} height={10} />
    </SurfaceCallout>
  );
}
