"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type CompactOperatorNoteTone = "info" | "caution" | "positive" | "neutral";

interface CompactOperatorNoteProps {
  label?: string;
  summary: string;
  detail?: string;
  tone?: CompactOperatorNoteTone;
  defaultOpen?: boolean;
  children?: ReactNode;
}

export default function CompactOperatorNote({
  label,
  summary,
  detail,
  tone = "neutral",
  defaultOpen = false,
  children,
}: CompactOperatorNoteProps) {
  const hasExpandableContent = Boolean(detail || children);

  if (!hasExpandableContent) {
    return (
      <div className="nexus-ops-note" data-tone={tone}>
        {label ? <div className="nexus-ops-note__label">{label}</div> : null}
        <div className="nexus-ops-note__summary">{summary}</div>
      </div>
    );
  }

  return (
    <details
      className={cn("nexus-ops-note", "nexus-ops-note--expandable")}
      data-tone={tone}
      open={defaultOpen}
    >
      <summary className="nexus-ops-note__summaryRow">
        <div className="nexus-ops-note__summaryStack">
          {label ? <div className="nexus-ops-note__label">{label}</div> : null}
          <div className="nexus-ops-note__summary">{summary}</div>
        </div>
        <span className="nexus-ops-note__toggle">Expand</span>
      </summary>
      <div className="nexus-ops-note__body">
        {detail ? <div className="nexus-ops-note__detail">{detail}</div> : null}
        {children}
      </div>
    </details>
  );
}
