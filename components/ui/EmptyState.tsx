// ── components/ui/EmptyState ───────────────────────────────
// Placeholder UI component for empty data states with icon and message.

"use client";

import { CSSProperties } from "react";
import { SurfaceEmpty } from "@/components/ui/surfacePrimitives";

interface EmptyStateProps {
  icon: string;
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: CSSProperties;
}

export default function EmptyState({
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
  style,
}: EmptyStateProps) {
  const action =
    actionLabel && onAction ? (
      <button
        type="button"
        onClick={onAction}
        className="nexus-shell-button"
        style={{ minHeight: "32px", padding: "0 12px", fontSize: "11px" }}
      >
        {actionLabel}
      </button>
    ) : undefined;

  return (
    <SurfaceEmpty
      icon={icon}
      title={title}
      description={subtitle}
      action={action}
      style={style}
    />
  );
}
