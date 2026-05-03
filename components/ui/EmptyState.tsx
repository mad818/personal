"use client";

import type { CSSProperties } from "react";
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
      <button type="button" className="nexus-shell-button" onClick={onAction}>
        {actionLabel}
      </button>
    ) : null;

  return (
    <SurfaceEmpty
      icon={<span>{icon}</span>}
      title={title}
      description={subtitle}
      action={action}
      tone="muted"
      style={style}
      data-cinematic-state="empty"
    />
  );
}
