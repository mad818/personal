"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import {
  getSpatialSurfaceDefinition,
  type SpatialAnchorDefinition,
  type SpatialSurface,
} from "@/lib/spatialCommandRegistry";

function normalizeHrefForMatch(href: string) {
  const [pathname, query = ""] = href.split("?");
  return {
    pathname,
    query,
  };
}

export default function SpatialCommandStrip({
  surface,
  className,
}: {
  surface: SpatialSurface;
  className?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const definition = getSpatialSurfaceDefinition(surface);
  const currentQuery = searchParams?.toString() ?? "";
  const currentHref = currentQuery ? `${pathname}?${currentQuery}` : pathname;

  const currentAnchor = useMemo(() => {
    return (
      definition.anchors.find((anchor) => {
        const target = normalizeHrefForMatch(anchor.href);
        const here = normalizeHrefForMatch(currentHref);
        if (target.pathname !== here.pathname) return false;
        if (target.query.length === 0) return true;
        return target.query === here.query;
      }) ?? null
    );
  }, [currentHref, definition.anchors]);

  const activeAnchor =
    definition.anchors.find((anchor) => anchor.id === focusedId) ??
    definition.anchors.find((anchor) => anchor.id === previewId) ??
    currentAnchor ??
    definition.anchors[0];

  if (!activeAnchor) return null;

  return (
    <section
      className={cn(
        "nexus-spatial-strip",
        "nexus-motion-enter",
        "nexus-motion-enter--primary",
        className,
      )}
      data-surface={surface}
      aria-label={`${surface} spatial command strip`}
    >
      <div className="nexus-spatial-strip__meta">
        <span className="nexus-spatial-strip__eyebrow">{definition.kicker}</span>
        <span className="nexus-spatial-strip__note">{definition.note}</span>
      </div>
      <div className="nexus-spatial-strip__anchors" aria-label={`${surface} anchors`}>
        {definition.anchors.map((anchor) => {
          const isCurrent = currentAnchor?.id === anchor.id;
          const state =
            focusedId === anchor.id
              ? "focused"
              : previewId === anchor.id
                ? "preview"
                : isCurrent
                  ? "active"
                  : "idle";

          return (
            <button
              key={anchor.id}
              type="button"
              aria-pressed={state === "focused"}
              className="nexus-spatial-strip__anchor"
              data-state={state}
              data-tone={anchor.tone}
              onMouseEnter={() => setPreviewId(anchor.id)}
              onMouseLeave={() => setPreviewId(null)}
              onFocus={() => setPreviewId(anchor.id)}
              onBlur={() => setPreviewId(null)}
              onClick={() =>
                setFocusedId((current) => (current === anchor.id ? null : anchor.id))
              }
            >
              <span className="nexus-spatial-strip__anchorLabel">{anchor.label}</span>
              <span className="nexus-spatial-strip__anchorStatus">{anchor.status}</span>
            </button>
          );
        })}
      </div>
      <SpatialCommandDock anchor={activeAnchor} />
    </section>
  );
}

function SpatialCommandDock({ anchor }: { anchor: SpatialAnchorDefinition }) {
  return (
    <div className="nexus-spatial-strip__dock" data-tone={anchor.tone}>
      <div className="nexus-spatial-strip__dockSignal">
        <span className="nexus-spatial-strip__dockLabel">Current state</span>
        <span className="nexus-spatial-strip__dockValue">{anchor.status}</span>
      </div>
      <div className="nexus-spatial-strip__dockSignal">
        <span className="nexus-spatial-strip__dockLabel">Next move</span>
        <span className="nexus-spatial-strip__dockValue">{anchor.nextAction}</span>
      </div>
      <details className="nexus-spatial-strip__dockDisclosure">
        <summary>Why this lane</summary>
        <p>{anchor.detail}</p>
      </details>
      <Link href={anchor.href} className="nexus-spatial-strip__dockLink">
        Open
      </Link>
    </div>
  );
}
