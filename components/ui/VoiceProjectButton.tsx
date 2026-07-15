"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { buildVoiceProjectFromText } from "@/lib/voiceLab";
import { useStore } from "@/store/useStore";

export default function VoiceProjectButton({
  text,
  title,
  sourceKey,
  sourceRoute,
}: {
  text: string;
  title: string;
  sourceKey?: string | null;
  sourceRoute?: string | null;
}) {
  const router = useRouter();
  const voiceProjects = useStore((s) => s.voiceProjects);
  const upsertVoiceProject = useStore((s) => s.upsertVoiceProject);
  const setActiveVoiceProjectId = useStore((s) => s.setActiveVoiceProjectId);

  const existingProject = useMemo(() => {
    if (!sourceKey) return null;
    return (
      voiceProjects.find((project) => project.sourceKey === sourceKey) ?? null
    );
  }, [sourceKey, voiceProjects]);

  if (!text.trim()) return null;

  return (
    <button
      type="button"
      onClick={() => {
        const project =
          existingProject ??
          buildVoiceProjectFromText({
            title,
            text,
            sourceKey: sourceKey ?? undefined,
            sourceRoute: sourceRoute ?? undefined,
          });
        upsertVoiceProject(project);
        setActiveVoiceProjectId(project.id);
        router.push(
          `/resources?view=voice-lab&voiceProject=${encodeURIComponent(project.id)}`,
        );
      }}
      style={{
        padding: "6px 10px",
        borderRadius: "999px",
        border: "1px solid var(--border)",
        background: "rgba(10, 15, 30, 0.58)",
        color: "var(--text)",
        fontSize: "11px",
        cursor: "pointer",
      }}
    >
      {existingProject ? "Open voice project" : "Open in Voice Lab"}
    </button>
  );
}
