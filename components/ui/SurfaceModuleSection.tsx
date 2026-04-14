"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { SectionLabel } from "@/components/ui/shell";

interface SurfaceModuleSectionProps {
  title: ReactNode;
  detail?: ReactNode;
  tone?: "default" | "muted";
  children: ReactNode;
  id?: string;
  compact?: boolean;
  className?: string;
}

export default function SurfaceModuleSection({
  title,
  detail,
  tone = "default",
  children,
  id,
  compact = false,
  className,
}: SurfaceModuleSectionProps) {
  return (
    <div
      id={id}
      className={cn(
        "nexus-surface-module-section",
        "nexus-motion-enter",
        "nexus-motion-enter--support",
        tone === "muted" && "nexus-surface-module-section--muted",
        compact && "nexus-surface-module-section--compact",
        className,
      )}
      data-tone={tone}
      data-section-tone={tone}
      data-section-compact={compact ? "true" : "false"}
    >
      <SectionLabel detail={detail}>{title}</SectionLabel>
      <div className="nexus-surface-module-section__body">{children}</div>
    </div>
  );
}
