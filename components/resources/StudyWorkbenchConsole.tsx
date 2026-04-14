"use client";

import { useRouter } from "next/navigation";
import SurfaceModuleCard from "@/components/ui/SurfaceModuleCard";
import { ShellGrid, ShellStack } from "@/components/ui/shell";
import type { SurfaceModuleSpec } from "@/lib/surfaceRedesignRegistry";

function buildStudySpec(
  id: string,
  title: string,
  detail: string,
  summary: string,
): SurfaceModuleSpec {
  return {
    id,
    title,
    detail,
    summary,
    role: "workspace",
  };
}

const STUDY_ACTIONS = [
  {
    id: "study-frame",
    title: "Frame the question",
    detail: "Start with the right workflow pack",
    summary:
      "Use the System Brain when the job is to pick the right tutor or research profile, bound the mission, and keep the next move to one strongest continuation.",
    href: "/skills?view=brain&focus=skills-brain",
    label: "Open System Brain",
  },
  {
    id: "study-sources",
    title: "Review sources",
    detail: "Use the research compartment first",
    summary:
      "Open research memory when you want source-backed notes, literature lanes, and evidence posture before widening into synthesis or writing.",
    href: "/vault?focus=vault-memory-research",
    label: "Open research memory",
  },
  {
    id: "study-synthesis",
    title: "Synthesize evidence",
    detail: "Turn sources into one compact throughline",
    summary:
      "Use study memory when the next move is to build a synthesis, checkpoint, or review loop without spawning a separate scholar dashboard.",
    href: "/vault?focus=vault-memory-study",
    label: "Open study memory",
  },
  {
    id: "study-workspace",
    title: "Open the exact study workspace",
    detail: "Launch the assistant-first workbench",
    summary:
      "Use the study workbench when you want the assistant to stage the right research or tutoring lane without manually bouncing between broad reference consoles.",
    href: "/resources?view=study",
    label: "Open study workbench",
  },
];

export default function StudyWorkbenchConsole() {
  const router = useRouter();

  return (
    <ShellStack>
      <p className="nexus-shell-copy nexus-shell-copy--compact">
        Guided learning and research stay assistant-first here: frame the question, review
        sources, synthesize evidence, then open the exact workspace without creating a separate
        scholar surface.
      </p>
      <ShellGrid columns="repeat(auto-fit, minmax(220px, 1fr))" align="start">
        {STUDY_ACTIONS.map((action) => (
          <SurfaceModuleCard
            key={action.id}
            spec={buildStudySpec(
              action.id,
              action.title,
              action.detail,
              action.summary,
            )}
            tone="muted"
            compact
            onPrimaryAction={() => router.push(action.href)}
            primaryActionLabel={action.label}
          />
        ))}
      </ShellGrid>
    </ShellStack>
  );
}
