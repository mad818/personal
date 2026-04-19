"use client";

import MissionContinuationActions from "@/components/ui/MissionContinuationActions";

export function AskMemoryFromReplyButton({
  query,
  promptText,
}: {
  query?: string;
  promptText?: string;
}) {
  const trimmed = query?.trim() ?? "";

  if (!trimmed) return null;

  return (
    <MissionContinuationActions memoryQuery={trimmed} promptText={promptText} />
  );
}
