"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import MissionHandoffStrip from "@/components/ui/MissionHandoffStrip";
import OperatorReadinessLane from "@/components/ui/OperatorReadinessLane";
import SurfaceFocusStrip from "@/components/ui/SurfaceFocusStrip";
import TrustOperationsRail from "@/components/ui/TrustOperationsRail";
import {
  OpsField,
  OpsInspector,
  OpsRail,
  OpsStrip,
  OpsWorkplane,
  ShellBadge,
  ShellButton,
  ShellPage,
  ShellSegmentedTabs,
  ShellStack,
} from "@/components/ui/shell";
import { useSessionHrefAutoHeal } from "@/hooks/useSessionHrefAutoHeal";
import { useSurfaceFocusScroll } from "@/hooks/useSurfaceFocusScroll";
import { getOpsLayoutDescriptor } from "@/lib/opsLayoutRegistry";
import { useStore } from "@/store/useStore";
import type { LearningEvent } from "@/lib/skillEngine";

const AgencyRoleLibrary = dynamic(
  () => import("@/components/skills/AgencyRoleLibrary"),
  { ssr: false },
);
const BlacksiteLab = dynamic(() => import("@/components/skills/BlacksiteLab"), {
  ssr: false,
});
const KnowledgeBase = dynamic(
  () => import("@/components/skills/KnowledgeBase"),
  { ssr: false },
);
const KnowledgeGraphViz = dynamic(
  () => import("@/components/skills/KnowledgeGraphViz"),
  { ssr: false },
);
const LearningLog = dynamic(() => import("@/components/skills/LearningLog"), {
  ssr: false,
});
const LearningProgressRing = dynamic(
  () => import("@/components/skills/LearningProgressRing"),
  { ssr: false },
);
const SkillLibrary = dynamic(() => import("@/components/skills/SkillLibrary"), {
  ssr: false,
});
const SkillRadarChart = dynamic(
  () => import("@/components/skills/SkillRadarChart"),
  { ssr: false },
);
const SystemBrain = dynamic(() => import("@/components/skills/SystemBrain"), {
  ssr: false,
});
const WorkflowForge = dynamic(
  () => import("@/components/skills/WorkflowForge"),
  { ssr: false },
);

type View = "forge" | "blacksite" | "brain" | "library";

const VIEWS: Array<{ id: View; label: string }> = [
  { id: "forge", label: "Workflow Forge" },
  { id: "blacksite", label: "Blacksite Lab" },
  { id: "brain", label: "System Brain" },
  { id: "library", label: "Skill Library" },
];

const TUTOR_LANES = [
  {
    eyebrow: "Default teaching lane",
    title: "Concept tutor",
    summary:
      "Best for teach, explain, and study-plan turns that need one checkpoint instead of a long lecture.",
  },
  {
    eyebrow: "Repo-grounded learning",
    title: "Code tutor",
    summary:
      "Use when the lesson should stay tied to the active codebase, file ownership, or implementation risk.",
  },
  {
    eyebrow: "Source-backed review",
    title: "Research tutor",
    summary:
      "Use when the answer should teach through evidence, comparisons, and review-oriented synthesis.",
  },
  {
    eyebrow: "Research workflow packs",
    title: "Research analyst",
    summary:
      "Best for framing the question, opening the right source-review lane, and keeping the mission compact.",
  },
  {
    eyebrow: "Literature and synthesis",
    title: "Evidence synthesizer",
    summary:
      "Use when local notes, citations, or evidence cards should reopen a study or review brief instead of spawning duplicates.",
  },
  {
    eyebrow: "Local sample follow-through",
    title: "Reverse-engineering tutor",
    summary:
      "Use when guided learning should stay attached to binary triage, IOC hints, and local-only analysis.",
  },
];

const WORKFLOW_PACKS = [
  {
    eyebrow: "DR1 multi-source synthesis lane",
    title: "Deep research briefing",
    summary:
      "Use when NOVA should run the bounded deep-research engine for a full report and durable VAULT filing instead of a lighter one-off search pass.",
  },
  {
    eyebrow: "XR1 market continuity",
    title: "Market review loop",
    summary:
      "Use when Alpha should capture thesis, invalidation, result, and repeat or avoid lessons as one durable review.",
  },
  {
    eyebrow: "XR1 passive-first investigation",
    title: "OSINT casefile loop",
    summary:
      "Use when RECON or CYBER work should move through Intake, Collect, Pivot, and Package before filing into VAULT.",
  },
  {
    eyebrow: "RI1 metadata-only assessment",
    title: "Repo intel briefing",
    summary:
      "Use when RECON should assess a public GitHub dependency, competitor, or reference library through metadata and a compact ORBIT handoff.",
  },
  {
    eyebrow: "VX1 defensive code lane",
    title: "Vulnerability review loop",
    summary:
      "Use when CYBER should review one local code path with graph, ownership, security, and exact repair-lane context before filing a durable brief.",
  },
  {
    eyebrow: "VX1 local audio lane",
    title: "Voice Lab local",
    summary:
      "Use when Resources should stage dictation, browser speech fallback, and optional runtime-powered voice projects without pushing audio assets into repo state.",
  },
  {
    eyebrow: "XR1 future mobility lane",
    title: "Radar readiness",
    summary:
      "Use when Vehicle Lab should preserve capture, preprocess, detect, track, and review notes without implying RF control or flight authority.",
  },
];

const MEMORY_ACTIONS = [
  { label: "Project memory", href: "/vault?focus=vault-memory-project" },
  { label: "Research memory", href: "/vault?focus=vault-memory-research" },
  { label: "Study memory", href: "/vault?focus=vault-memory-study" },
];

const PLAYBOOK_ACTIONS = [
  { label: "Deep research", href: "/resources?view=playbooks&playbook=deep-research-briefing" },
  { label: "Market review", href: "/resources?view=playbooks&playbook=market-review-loop" },
  { label: "OSINT casefile", href: "/resources?view=playbooks&playbook=osint-casefile-loop" },
  { label: "Repo intel", href: "/resources?view=playbooks&playbook=repo-intel-briefing" },
  { label: "Vulnerability review", href: "/resources?view=playbooks&playbook=vulnerability-review-loop" },
  { label: "Voice Lab", href: "/resources?view=playbooks&playbook=voice-lab-local" },
  { label: "Radar readiness", href: "/resources?view=playbooks&playbook=radar-readiness-session" },
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
  const skillsLayout = getOpsLayoutDescriptor("skills");

  const handleNewEvent = useCallback((evt: LearningEvent) => {
    setLatestEvent(evt);
  }, []);

  return (
    <ShellPage
      width="wide"
      surface="skills"
      eyebrow="Skills and workflow labs"
      title="Workflow labs"
      description="Workflow packs, lab runs, and memory on one lab desk."
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
            description="Forge opens first."
          />
        ) : null}

        {focus === "skills-blacksite" ? (
          <SurfaceFocusStrip
            title="Focused session: Blacksite Lab"
            description="Blacksite opens first."
          />
        ) : null}

        {focus === "skills-brain" ? (
          <SurfaceFocusStrip
            title="Focused session: system brain"
            description="System brain opens first."
          />
        ) : null}

        {focus === "skills-library" ? (
          <SurfaceFocusStrip
            title="Focused session: skill library"
            description="Capability library opens first."
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
              <div className="nexus-surface-chamber-shell">
                <div className="nexus-surface-chamber-shell__body">
                  <OpsWorkplane className={`nexus-surface-chamber-shell__lead ${skillsLayout.workplaneClass}`}>
                    <ShellStack gap="12px">
                      <OpsField title="Intelligence metrics" detail="Skill spread and current maturation">
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
                      </OpsField>
                      <OpsField title="Knowledge graph" detail="Domain relationships and reusable knowledge hubs" tone="muted">
                        <KnowledgeGraphViz />
                      </OpsField>
                    </ShellStack>
                  </OpsWorkplane>
                  <OpsRail className={`nexus-surface-chamber-shell__support ${skillsLayout.railClass}`}>
                    <ShellStack gap="12px">
                      <OpsField title="System brain" detail="System health, hubs, and improvement queue" tone="muted" compact>
                        <SystemBrain />
                      </OpsField>
                      <TrustOperationsRail
                        title={skillsLayout.trustLabel}
                        detail="Protected edits, governance posture, and lab privilege stay beside the lane."
                        compact
                      />
                      <OpsField
                        title="Operator readiness"
                        detail="Capability, scheduler, and guarded companion posture"
                        tone="muted"
                        compact
                      >
                        <OperatorReadinessLane
                          surfaceId="skills"
                          detail="Workflow packs, scheduler posture, memory depth, and guarded companion state stay visible here."
                        />
                      </OpsField>
                    </ShellStack>
                  </OpsRail>
                </div>
              </div>

              <div className="nexus-surface-continuity-strip">
                <OpsStrip className={skillsLayout.continuityClass}>
                  <div className="nexus-surface-chamber-shell__body">
                    <div className="nexus-surface-chamber-shell__lead">
                      <ShellStack gap="12px">
                        <OpsField
                          title="Tutor lanes"
                          detail="Default teaching and review profiles"
                          tone="muted"
                        >
                          <div className="nexus-ops-brief-list" aria-label="Tutor lanes">
                            {TUTOR_LANES.map((lane) => (
                              <article key={lane.title} className="nexus-ops-brief-item">
                                <span className="nexus-ops-brief-item__eyebrow">{lane.eyebrow}</span>
                                <span className="nexus-ops-brief-item__title">{lane.title}</span>
                                <p className="nexus-ops-brief-item__summary">{lane.summary}</p>
                              </article>
                            ))}
                          </div>
                        </OpsField>
                        <OpsField
                          title="Workflow packs"
                          detail="Durable loops that reopen exact lanes"
                        >
                          <div className="nexus-ops-brief-list" aria-label="Workflow packs">
                            {WORKFLOW_PACKS.map((lane) => (
                              <article key={lane.title} className="nexus-ops-brief-item">
                                <span className="nexus-ops-brief-item__eyebrow">{lane.eyebrow}</span>
                                <span className="nexus-ops-brief-item__title">{lane.title}</span>
                                <p className="nexus-ops-brief-item__summary">{lane.summary}</p>
                              </article>
                            ))}
                          </div>
                        </OpsField>
                      </ShellStack>
                    </div>
                    <OpsInspector className={`nexus-surface-chamber-shell__support ${skillsLayout.inspectorClass}`}>
                      <ShellStack gap="12px">
                        <OpsField
                          title="Memory recalls"
                          detail="Repo-bound study and research defaults"
                          tone="muted"
                          compact
                        >
                          <p className="nexus-shell-copy nexus-shell-copy--compact">
                            Guided learning stays assistant-first here. Repo-bound memory writes under
                            <code> .nexus/project-memory </code>
                            and reopens through VAULT.
                          </p>
                          <div className="nexus-ops-action-cluster">
                            {MEMORY_ACTIONS.map((action) => (
                              <ShellButton key={action.href} onClick={() => router.push(action.href)}>
                                {action.label}
                              </ShellButton>
                            ))}
                          </div>
                        </OpsField>
                        <OpsField
                          title="Playbook launches"
                          detail="Open the strongest reusable lane without browsing"
                          compact
                        >
                          <div className="nexus-ops-action-cluster">
                            {PLAYBOOK_ACTIONS.map((action) => (
                              <ShellButton key={action.href} onClick={() => router.push(action.href)}>
                                {action.label}
                              </ShellButton>
                            ))}
                          </div>
                        </OpsField>
                        <OpsField
                          title="Exact workbench"
                          detail="Jump straight into the active study lane"
                          tone="muted"
                          compact
                        >
                          <div className="nexus-ops-action-cluster">
                            <ShellButton onClick={() => router.push("/resources?view=study")}>
                              Open study workbench
                            </ShellButton>
                          </div>
                        </OpsField>
                      </ShellStack>
                    </OpsInspector>
                  </div>
                </OpsStrip>
              </div>
            </ShellStack>
          </div>
        )}

        {view === "library" && (
          <div id="skills-library" style={{ scrollMarginTop: "120px" }}>
            <ShellStack>
              <div className="nexus-surface-chamber-shell">
                <div className="nexus-surface-chamber-shell__body">
                  <OpsWorkplane className={`nexus-surface-chamber-shell__lead ${skillsLayout.workplaneClass}`}>
                    <ShellStack gap="12px">
                      <OpsField title="Skill library" detail="Actionable capability catalog">
                        <SkillLibrary onNewEvent={handleNewEvent} />
                      </OpsField>
                      <OpsField title="Agency role library" detail="Curated specialist role packs">
                        <AgencyRoleLibrary />
                      </OpsField>
                    </ShellStack>
                  </OpsWorkplane>
                  <OpsRail className={`nexus-surface-chamber-shell__support ${skillsLayout.railClass}`}>
                    <ShellStack gap="12px">
                      <OpsField title="Learning log" detail="Recent learning signals" tone="muted" compact>
                        <LearningLog newEvent={latestEvent} />
                      </OpsField>
                      <TrustOperationsRail
                        title={skillsLayout.trustLabel}
                        detail="Workflow provenance and protected-action posture stay adjacent to the reusable capability catalog."
                        compact
                      />
                    </ShellStack>
                  </OpsRail>
                </div>
              </div>

              <div className="nexus-surface-continuity-strip">
                <OpsStrip className={skillsLayout.continuityClass}>
                  <OpsField title="Knowledge base" detail="Acquired intelligence and reusable notes" tone="muted">
                    <KnowledgeBase />
                  </OpsField>
                </OpsStrip>
              </div>
            </ShellStack>
          </div>
        )}
      </ShellStack>
    </ShellPage>
  );
}
