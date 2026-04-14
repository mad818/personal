"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import SkillLibrary from "@/components/skills/SkillLibrary";
import LearningLog from "@/components/skills/LearningLog";
import SystemBrain from "@/components/skills/SystemBrain";
import KnowledgeBase from "@/components/skills/KnowledgeBase";
import SkillRadarChart from "@/components/skills/SkillRadarChart";
import LearningProgressRing from "@/components/skills/LearningProgressRing";
import KnowledgeGraphViz from "@/components/skills/KnowledgeGraphViz";
import WorkflowForge from "@/components/skills/WorkflowForge";
import BlacksiteLab from "@/components/skills/BlacksiteLab";
import MissionHandoffStrip from "@/components/ui/MissionHandoffStrip";
import OperatorReadinessLane from "@/components/ui/OperatorReadinessLane";
import SurfaceFocusStrip from "@/components/ui/SurfaceFocusStrip";
import {
  SectionLabel,
  ShellBadge,
  ShellButton,
  ShellGrid,
  ShellPage,
  ShellPanel,
  ShellSegmentedTabs,
  ShellStack,
} from "@/components/ui/shell";
import { useSessionHrefAutoHeal } from "@/hooks/useSessionHrefAutoHeal";
import { useSurfaceFocusScroll } from "@/hooks/useSurfaceFocusScroll";
import { useStore } from "@/store/useStore";
import type { LearningEvent } from "@/lib/skillEngine";

type View = "forge" | "blacksite" | "brain" | "library";

const VIEWS: Array<{ id: View; label: string }> = [
  { id: "forge", label: "Workflow Forge" },
  { id: "blacksite", label: "Blacksite Lab" },
  { id: "brain", label: "System Brain" },
  { id: "library", label: "Skill Library" },
];

export default function SkillsPage() {
  const [latestEvent, setLatestEvent] = useState<LearningEvent | null>(null);
  const router = useRouter();
  const { normalizedParams } = useSessionHrefAutoHeal();
  const focus = normalizedParams.get("focus");
  const view = useStore((s) => s.skillsWorkbenchView);
  const setView = useStore((s) => s.setSkillsWorkbenchView);

  const urlView = useMemo(() => {
    const value = (normalizedParams.get("view") ?? "").toLowerCase();
    return value === "forge" ||
      value === "blacksite" ||
      value === "brain" ||
      value === "library"
      ? (value as View)
      : null;
  }, [normalizedParams]);

  const focusView = useMemo(() => {
    if (focus === "skills-forge") return "forge";
    if (focus === "skills-blacksite") return "blacksite";
    if (focus === "skills-brain") return "brain";
    if (focus === "skills-library") return "library";
    return null;
  }, [focus]);

  useEffect(() => {
    const nextView = focusView ?? urlView;
    if (!nextView) return;
    setView(nextView);
  }, [focusView, setView, urlView]);

  const handleViewChange = (nextView: View) => {
    setView(nextView);
    const params = new URLSearchParams(normalizedParams.toString());
    params.set("view", nextView);
    router.replace(`/skills?${params.toString()}`);
  };

  const focusTargetId =
    focus === "skills-forge"
      ? "skills-forge"
      : focus === "skills-blacksite"
        ? "skills-blacksite"
        : focus === "skills-brain"
          ? "skills-brain"
          : focus === "skills-library"
            ? "skills-library"
            : null;

  useSurfaceFocusScroll(focusTargetId);

  const handleNewEvent = useCallback((evt: LearningEvent) => {
    setLatestEvent(evt);
  }, []);

  return (
    <ShellPage
      width="wide"
      surface="hq"
      eyebrow="Assimilation workbench"
      title="WORKFLOW FORGE // BLACKSITE"
      description="Native workflow graphs, operator-only prompt tournaments, and the original intelligence-engine views now live under one command-grade skills surface."
      actions={
        <>
          <ShellBadge tone="muted">Internal surface</ShellBadge>
          <ShellBadge tone="accent">Persistence-backed</ShellBadge>
          <ShellBadge tone="muted">Operator-only labs</ShellBadge>
          <ShellBadge tone="success">Scheduler-linked</ShellBadge>
        </>
      }
    >
      <ShellStack>
        <MissionHandoffStrip
          surface="skills"
          mission={normalizedParams.get("mission")}
          from={normalizedParams.get("from")}
          source={normalizedParams.get("source")}
        />

        {focus === "skills-forge" ? (
          <SurfaceFocusStrip
            title="Focused session: workflow forge"
            description="You landed on SKILLS with Workflow Forge in focus so internal process shaping starts at the primary composition lane."
          />
        ) : null}

        {focus === "skills-blacksite" ? (
          <SurfaceFocusStrip
            title="Focused session: Blacksite Lab"
            description="You landed on SKILLS with Blacksite in focus so adversarial or isolated operator experiments start at the right lab."
          />
        ) : null}

        {focus === "skills-brain" ? (
          <SurfaceFocusStrip
            title="Focused session: system brain"
            description="You landed on SKILLS with the system-brain lane in focus so skill metrics, knowledge hubs, and the improvement queue are visible first."
          />
        ) : null}

        {focus === "skills-library" ? (
          <SurfaceFocusStrip
            title="Focused session: skill library"
            description="You landed on SKILLS with the reusable capability catalog in focus so the library, learning log, and knowledge base start at the right section."
          />
        ) : null}

        <ShellSegmentedTabs
          items={VIEWS}
          active={view}
          onChange={handleViewChange}
          minButtonWidth={154}
        />

        {view === "forge" && (
          <motion.div
            id="skills-forge"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ scrollMarginTop: "120px" }}
          >
            <WorkflowForge />
          </motion.div>
        )}

        {view === "blacksite" && (
          <motion.div
            id="skills-blacksite"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ scrollMarginTop: "120px" }}
          >
            <BlacksiteLab />
          </motion.div>
        )}

        {view === "brain" && (
          <div id="skills-brain" style={{ scrollMarginTop: "120px" }}>
            <ShellStack>
              <ShellGrid columns="minmax(0, 1fr) minmax(0, 1fr)">
                <ShellPanel>
                  <SectionLabel detail="Skill spread and current maturation">
                    Intelligence metrics
                  </SectionLabel>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                      gap: "14px",
                    }}
                  >
                    <SkillRadarChart />
                    <LearningProgressRing />
                  </div>
                </ShellPanel>
                <ShellPanel tone="muted">
                  <SectionLabel detail="System health, hubs, and improvement queue">
                    System brain
                  </SectionLabel>
                  <SystemBrain />
                </ShellPanel>
              </ShellGrid>

              <ShellPanel>
                <SectionLabel detail="Workflow packs, tutor profiles, and repo-bound memory defaults">
                  Guided learning controls
                </SectionLabel>
                <div
                  style={{
                    display: "grid",
                    gap: "12px",
                  }}
                >
                  <p className="nexus-shell-copy nexus-shell-copy--compact">
                    Guided learning now sits beside operator-general research workflows here.
                    Workflow packs stay capability-backed, while repo-bound memory is written under
                    <code> .nexus/project-memory </code>
                    and surfaced back through VAULT instead of a separate scholar product surface.
                  </p>
                  <ShellGrid columns="repeat(auto-fit, minmax(180px, 1fr))" align="start">
                    <ShellPanel tone="muted">
                      <SectionLabel detail="Default teaching lane">Concept tutor</SectionLabel>
                      <p className="nexus-shell-copy nexus-shell-copy--compact">
                        Best for teach/explain/study-plan turns that need one checkpoint, not a long lecture.
                      </p>
                    </ShellPanel>
                    <ShellPanel tone="muted">
                      <SectionLabel detail="Repo-grounded learning">Code tutor</SectionLabel>
                      <p className="nexus-shell-copy nexus-shell-copy--compact">
                        Use when the lesson should stay tied to the active codebase, file ownership, or implementation risk.
                      </p>
                    </ShellPanel>
                    <ShellPanel tone="muted">
                      <SectionLabel detail="Source-backed review">Research tutor</SectionLabel>
                      <p className="nexus-shell-copy nexus-shell-copy--compact">
                        Use when the answer should teach through evidence, comparisons, and review-oriented synthesis.
                      </p>
                    </ShellPanel>
                    <ShellPanel tone="muted">
                      <SectionLabel detail="Research workflow packs">Research analyst</SectionLabel>
                      <p className="nexus-shell-copy nexus-shell-copy--compact">
                        Best for framing the question, opening the right source-review lane, and keeping the mission compact.
                      </p>
                    </ShellPanel>
                    <ShellPanel tone="muted">
                      <SectionLabel detail="Literature and synthesis">Evidence synthesizer</SectionLabel>
                      <p className="nexus-shell-copy nexus-shell-copy--compact">
                        Use when local notes, citations, or evidence cards should reopen a study or review brief instead of spawning duplicates.
                      </p>
                    </ShellPanel>
                    <ShellPanel tone="muted">
                      <SectionLabel detail="Local sample follow-through">Reverse-engineering tutor</SectionLabel>
                      <p className="nexus-shell-copy nexus-shell-copy--compact">
                        Use when guided learning should stay attached to binary triage, IOC hints, and local-only analysis.
                      </p>
                    </ShellPanel>
                    <ShellPanel tone="muted">
                      <SectionLabel detail="XR1 market continuity">Market review loop</SectionLabel>
                      <p className="nexus-shell-copy nexus-shell-copy--compact">
                        Use when Alpha should capture thesis, invalidation, result, and emotional posture as one durable market review instead of a transient note.
                      </p>
                    </ShellPanel>
                    <ShellPanel tone="muted">
                      <SectionLabel detail="XR1 passive-first investigation">OSINT casefile loop</SectionLabel>
                      <p className="nexus-shell-copy nexus-shell-copy--compact">
                        Use when RECON or CYBER work should move through Intake, Collect, Pivot, and Package before the case is filed into VAULT.
                      </p>
                    </ShellPanel>
                    <ShellPanel tone="muted">
                      <SectionLabel detail="XR1 future mobility lane">Radar readiness</SectionLabel>
                      <p className="nexus-shell-copy nexus-shell-copy--compact">
                        Use when Vehicle Lab should preserve capture, preprocess, detect, track, and review notes without implying RF control or flight authority.
                      </p>
                    </ShellPanel>
                  </ShellGrid>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <ShellButton onClick={() => router.push("/vault?focus=vault-memory-project")}>
                      Open project memory
                    </ShellButton>
                    <ShellButton onClick={() => router.push("/vault?focus=vault-memory-research")}>
                      Open research memory
                    </ShellButton>
                    <ShellButton onClick={() => router.push("/vault?focus=vault-memory-study")}>
                      Open study memory
                    </ShellButton>
                    <ShellButton onClick={() => router.push("/resources?view=playbooks&playbook=market-review-loop")}>
                      Open market review playbook
                    </ShellButton>
                    <ShellButton onClick={() => router.push("/resources?view=playbooks&playbook=osint-casefile-loop")}>
                      Open OSINT casefile playbook
                    </ShellButton>
                    <ShellButton onClick={() => router.push("/resources?view=playbooks&playbook=radar-readiness-session")}>
                      Open radar readiness playbook
                    </ShellButton>
                    <ShellButton onClick={() => router.push("/resources?view=study")}>
                      Open study workbench
                    </ShellButton>
                  </div>
                </div>
              </ShellPanel>

              <ShellPanel>
                <SectionLabel detail="Domain relationships and knowledge hubs">
                  Knowledge graph
                </SectionLabel>
                <KnowledgeGraphViz />
              </ShellPanel>

              <ShellPanel tone="muted">
                <SectionLabel detail="Capability, scheduler, and guarded companion posture">
                  Operator readiness
                </SectionLabel>
                <OperatorReadinessLane
                  surfaceId="skills"
                  detail="Keep workflow packs, governance coverage, scheduler posture, memory depth, and guarded companion state visible here without widening SKILLS into another dashboard."
                />
              </ShellPanel>
            </ShellStack>
          </div>
        )}

        {view === "library" && (
          <div id="skills-library" style={{ scrollMarginTop: "120px" }}>
            <ShellStack>
              <ShellGrid columns="minmax(0, 1fr) minmax(320px, 0.95fr)">
                <ShellPanel>
                  <SectionLabel detail="Actionable capability catalog">
                    Skill library
                  </SectionLabel>
                  <SkillLibrary onNewEvent={handleNewEvent} />
                </ShellPanel>
                <ShellPanel tone="muted">
                  <SectionLabel detail="Recent learning signals">Learning log</SectionLabel>
                  <LearningLog newEvent={latestEvent} />
                </ShellPanel>
              </ShellGrid>

              <ShellPanel>
                <SectionLabel detail="Acquired intelligence and reusable notes">
                  Knowledge base
                </SectionLabel>
                <KnowledgeBase />
              </ShellPanel>
            </ShellStack>
          </div>
        )}
      </ShellStack>
    </ShellPage>
  );
}
