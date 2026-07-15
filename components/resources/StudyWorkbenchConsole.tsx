"use client";

import { useRouter } from "next/navigation";
import {
  OpsField,
  OpsStrip,
  ShellButton,
  ShellStack,
} from "@/components/ui/shell";

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
    <ShellStack gap="14px">
      <OpsStrip>
        <OpsField
          title="Study lane"
          detail="Assistant-first research flow"
          tone="muted"
          compact
        >
          <p className="nexus-shell-copy nexus-shell-copy--compact">
            Guided learning and research stay assistant-first here: frame the
            question, review sources, synthesize evidence, then open the exact
            workspace without creating a separate scholar surface.
          </p>
        </OpsField>
      </OpsStrip>
      <div className="nexus-ops-brief-list" aria-label="Study actions">
        {STUDY_ACTIONS.map((action) => (
          <article key={action.id} className="nexus-ops-brief-item">
            <span className="nexus-ops-brief-item__eyebrow">
              {action.detail}
            </span>
            <span className="nexus-ops-brief-item__title">{action.title}</span>
            <p className="nexus-ops-brief-item__summary">{action.summary}</p>
            <div className="nexus-ops-action-cluster">
              <ShellButton onClick={() => router.push(action.href)}>
                {action.label}
              </ShellButton>
            </div>
          </article>
        ))}
      </div>
    </ShellStack>
  );
}
