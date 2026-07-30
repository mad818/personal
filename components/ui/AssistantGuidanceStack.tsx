"use client";

import CompactOperatorNote from "@/components/ui/CompactOperatorNote";
import type { AssistantGuidance } from "@/components/home/office/types";

interface AssistantGuidanceStackProps {
  items: AssistantGuidance[];
  maxWidth?: number | string;
}

export default function AssistantGuidanceStack({
  items,
  maxWidth = 720,
}: AssistantGuidanceStackProps) {
  if (items.length === 0) return null;

  return (
    <div className="nexus-assistant-guidance" style={{ maxWidth }}>
      {items.map((guidance, index) => (
        <CompactOperatorNote
          key={`${guidance.kind}-${guidance.title}-${index}`}
          label={guidance.title}
          summary={guidance.detail}
          tone={guidance.tone}
        />
      ))}
    </div>
  );
}
