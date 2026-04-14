"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type {
  SurfaceModuleRole,
  SurfaceModuleSpec,
} from "@/lib/surfaceRedesignRegistry";
import {
  SectionLabel,
  ShellBadge,
  ShellButton,
  ShellPanel,
} from "@/components/ui/shell";

const ROLE_LABELS: Record<SurfaceModuleRole, string> = {
  brief: "Doctrine",
  workspace: "Station",
  signals: "Signals",
  continuity: "Handoff",
  guidance: "Briefing",
  overflow: "Reserve",
};

const ROLE_TONES: Record<
  SurfaceModuleRole,
  "default" | "success" | "accent" | "muted"
> = {
  brief: "accent",
  workspace: "success",
  signals: "muted",
  continuity: "accent",
  guidance: "muted",
  overflow: "muted",
};

interface SurfaceModuleCardProps {
  spec: SurfaceModuleSpec;
  tone?: "default" | "muted" | "hero";
  className?: string;
  children?: ReactNode;
  action?: ReactNode;
  onPrimaryAction?: () => void;
  primaryActionLabel?: string;
  footer?: ReactNode;
  compact?: boolean;
}

export default function SurfaceModuleCard({
  spec,
  tone = "default",
  className,
  children,
  action,
  onPrimaryAction,
  primaryActionLabel,
  footer,
  compact = false,
}: SurfaceModuleCardProps) {
  const strongestActionLabel =
    primaryActionLabel ?? spec.strongestAction?.label ?? "Continue";

  return (
    <ShellPanel
      tone={tone}
      className={cn(
        "nexus-surface-module-card",
        "nexus-motion-enter",
        (spec.role === "brief" || spec.role === "workspace")
          ? "nexus-motion-enter--primary"
          : "nexus-motion-enter--support",
        className,
      )}
      data-module-role={spec.role}
      data-module-tone={tone}
    >
      <div className={cn("nexus-surface-module", compact && "nexus-surface-module--compact")}>
        <div className="nexus-surface-module__header">
          <div className="nexus-surface-module__meta">
            <SectionLabel detail={spec.detail}>{spec.title}</SectionLabel>
            <ShellBadge tone={ROLE_TONES[spec.role]}>{ROLE_LABELS[spec.role]}</ShellBadge>
          </div>
          <p className="nexus-shell-copy nexus-shell-copy--compact nexus-surface-module__summary">
            {spec.summary}
          </p>
        </div>

        {children ? <div className="nexus-surface-module__body">{children}</div> : null}

        {action ? (
          <div className="nexus-surface-module__action">{action}</div>
        ) : onPrimaryAction ? (
          <div className="nexus-surface-module__action">
            <div className="nexus-surface-module__hint">
              {spec.strongestAction?.note ?? "Use the strongest next action from this module."}
            </div>
            <div className="nexus-surface-module__actionButton">
              <ShellButton onClick={onPrimaryAction}>{strongestActionLabel}</ShellButton>
            </div>
          </div>
        ) : spec.strongestAction?.note ? (
          <div className="nexus-surface-module__hint">
            {spec.strongestAction.note}
          </div>
        ) : null}

        {footer ? <div className="nexus-surface-module__footer">{footer}</div> : null}
      </div>
    </ShellPanel>
  );
}
