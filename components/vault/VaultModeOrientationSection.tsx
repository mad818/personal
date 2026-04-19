"use client";

import CompactOperatorNote from "@/components/ui/CompactOperatorNote";
import { ShellBadge } from "@/components/ui/shell";

type VaultMode = "archive" | "relations" | "publish";

const MODE_CONTENT: Record<
  VaultMode,
  {
    label: string;
    summary: string;
    detail: string;
    tone: "info" | "neutral";
    actions: string[];
  }
> = {
  archive: {
    label: "ARCHIVE CHAMBER",
    summary:
      "Use the archive chamber to intake local material, browse saved clips, and query durable memory without breaking the broader VAULT posture.",
    detail:
      "Start here when the next move is curation-first: bring new material in, reopen the right memory compartment, or ask local archive memory before you widen into relations or publication.",
    tone: "info",
    actions: ["Intake", "Recall", "Preserve"],
  },
  relations: {
    label: "RELATIONS CHAMBER",
    summary:
      "Use the relations chamber to inspect topology, recover orphans, and trace how clips, compiled pages, and briefs connect.",
    detail:
      "Start here when topology changes the next action. Filter the visible graph, inspect one node deeply, then let librarian and stewardship context explain what the archive is missing.",
    tone: "neutral",
    actions: ["Filter", "Inspect", "Recover"],
  },
  publish: {
    label: "PUBLISH CHAMBER",
    summary:
      "Use the publish chamber to promote compiled memory, repair durable notes, and export archive bundles once the archive state is ready.",
    detail:
      "Start here when the work is about reuse and output: compiled pages, export packs, second-brain bundles, and durable archive follow-through all live in the same publication lane.",
    tone: "neutral",
    actions: ["Promote", "Bundle", "Export"],
  },
};

export default function VaultModeOrientationSection({ mode }: { mode: VaultMode }) {
  const content = MODE_CONTENT[mode];

  return (
    <CompactOperatorNote
      label={content.label}
      tone={content.tone}
      summary={content.summary}
      detail={content.detail}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
        {content.actions.map((action) => (
          <ShellBadge key={action} tone="accent">
            {action}
          </ShellBadge>
        ))}
      </div>
    </CompactOperatorNote>
  );
}
