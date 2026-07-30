"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const surfaceCalloutVariants = cva("nexus-surface-callout", {
  variants: {
    tone: {
      default: "nexus-surface-callout--default",
      info: "nexus-surface-callout--info",
      success: "nexus-surface-callout--success",
      warning: "nexus-surface-callout--warning",
      critical: "nexus-surface-callout--critical",
    },
    compact: {
      true: "nexus-surface-callout--compact",
      false: "",
    },
  },
  defaultVariants: {
    tone: "default",
    compact: false,
  },
});

const surfaceEmptyVariants = cva("nexus-surface-empty", {
  variants: {
    tone: {
      default: "nexus-surface-empty--default",
      info: "nexus-surface-empty--info",
      accent: "nexus-surface-empty--accent",
      muted: "nexus-surface-empty--muted",
    },
    compact: {
      true: "nexus-surface-empty--compact",
      false: "",
    },
  },
  defaultVariants: {
    tone: "default",
    compact: false,
  },
});

type SurfaceCalloutProps = HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof surfaceCalloutVariants> & {
    icon?: ReactNode;
    title?: ReactNode;
    description?: ReactNode;
  };

export function SurfaceCallout({
  className,
  tone,
  compact,
  icon,
  title,
  description,
  children,
  ...props
}: SurfaceCalloutProps) {
  return (
    <div
      className={cn(surfaceCalloutVariants({ tone, compact }), className)}
      {...props}
    >
      {icon ? (
        <div className="nexus-surface-callout__icon" aria-hidden="true">
          {icon}
        </div>
      ) : null}
      <div className="nexus-surface-callout__body">
        {title ? (
          <div className="nexus-surface-callout__title">{title}</div>
        ) : null}
        {description ? (
          <div className="nexus-surface-callout__description">
            {description}
          </div>
        ) : null}
        {children ? (
          <div className="nexus-surface-callout__content">{children}</div>
        ) : null}
      </div>
    </div>
  );
}

type SurfaceEmptyProps = HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof surfaceEmptyVariants> & {
    icon?: ReactNode;
    title: ReactNode;
    description?: ReactNode;
    action?: ReactNode;
  };

export function SurfaceEmpty({
  className,
  tone,
  compact,
  icon,
  title,
  description,
  action,
  children,
  ...props
}: SurfaceEmptyProps) {
  return (
    <div
      className={cn(surfaceEmptyVariants({ tone, compact }), className)}
      {...props}
    >
      {icon ? (
        <div className="nexus-surface-empty__icon" aria-hidden="true">
          {icon}
        </div>
      ) : null}
      <div className="nexus-surface-empty__title">{title}</div>
      {description ? (
        <div className="nexus-surface-empty__description">{description}</div>
      ) : null}
      {children ? (
        <div className="nexus-surface-empty__content">{children}</div>
      ) : null}
      {action ? (
        <div className="nexus-surface-empty__actions">{action}</div>
      ) : null}
    </div>
  );
}

export function SurfaceSkeletonRows({
  rows = 4,
  height = 48,
  className,
}: {
  rows?: number;
  height?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("nexus-surface-skeleton-rows", className)}
      aria-hidden="true"
    >
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={`surface-skeleton-${index}`}
          className="nexus-surface-skeleton-rows__row"
          style={{ height: `${height}px` }}
        />
      ))}
    </div>
  );
}
