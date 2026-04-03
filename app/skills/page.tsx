"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import {
  SectionLabel,
  ShellBadge,
  ShellGrid,
  ShellPage,
  ShellPanel,
  ShellSegmentedTabs,
  ShellStack,
} from "@/components/ui/shell";
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
  const searchParams = useSearchParams();
  const view = useStore((s) => s.skillsWorkbenchView);
  const setView = useStore((s) => s.setSkillsWorkbenchView);

  const urlView = useMemo(() => {
    const value = (searchParams?.get("view") ?? "").toLowerCase();
    return value === "forge" ||
      value === "blacksite" ||
      value === "brain" ||
      value === "library"
      ? (value as View)
      : null;
  }, [searchParams]);

  useEffect(() => {
    if (urlView) setView(urlView);
  }, [setView, urlView]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if ((params.get("view") ?? "").toLowerCase() === view) return;
    params.set("view", view);
    router.replace(`/skills?${params.toString()}`);
  }, [router, searchParams, view]);

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
          <ShellBadge tone="accent">Persistence-backed</ShellBadge>
          <ShellBadge tone="muted">Operator-only labs</ShellBadge>
          <ShellBadge tone="success">Scheduler-linked</ShellBadge>
        </>
      }
    >
      <ShellStack>
        <ShellSegmentedTabs items={VIEWS} active={view} onChange={setView} minButtonWidth={154} />

        {view === "forge" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <WorkflowForge />
          </motion.div>
        )}

        {view === "blacksite" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <BlacksiteLab />
          </motion.div>
        )}

        {view === "brain" && (
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
              <SectionLabel detail="Domain relationships and knowledge hubs">
                Knowledge graph
              </SectionLabel>
              <KnowledgeGraphViz />
            </ShellPanel>
          </ShellStack>
        )}

        {view === "library" && (
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
        )}
      </ShellStack>
    </ShellPage>
  );
}
