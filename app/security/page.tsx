"use client";

import { useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import CameraGrid from "@/components/security/CameraGrid";
import SecurityAlerts from "@/components/security/SecurityAlerts";
import DronePanel from "@/components/security/DronePanel";
import ThreatLevelIndicator from "@/components/security/ThreatLevelIndicator";
import PerimeterSweep from "@/components/security/PerimeterSweep";
import AlertTimeline from "@/components/security/AlertTimeline";
import SecurityDoctrineMatrix from "@/components/security/SecurityDoctrineMatrix";
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

type View = "doctrine" | "ai" | "physical";

const VIEWS: Array<{ id: View; label: string }> = [
  { id: "doctrine", label: "Doctrine" },
  { id: "ai", label: "AI Surface" },
  { id: "physical", label: "Physical Ops" },
];

export default function SecurityPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = useStore((s) => s.securityWorkbenchView);
  const setView = useStore((s) => s.setSecurityWorkbenchView);

  const urlView = useMemo(() => {
    const value = (searchParams?.get("view") ?? "").toLowerCase();
    return value === "doctrine" || value === "ai" || value === "physical"
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
    router.replace(`/security?${params.toString()}`);
  }, [router, searchParams, view]);

  return (
    <ShellPage
      width="wide"
      surface="cyber"
      eyebrow="Scenario-indexed hardening deck"
      title="BASTION"
      description="Security doctrine now sits beside physical monitoring so route, auth, SSRF, prompt, and tool risks stay visible as first-class operator work."
      actions={
        <>
          <ShellBadge tone="accent">WSTG v4.2 pinned</ShellBadge>
          <ShellBadge tone="muted">AI risks tracked separately</ShellBadge>
          <ShellBadge tone="success">Physical ops preserved</ShellBadge>
        </>
      }
    >
      <ShellStack>
        <ShellSegmentedTabs items={VIEWS} active={view} onChange={setView} />

        {view === "doctrine" && (
          <ShellPanel>
            <SectionLabel detail="Route, auth, input, config, and AI-surface coverage">
              Security doctrine
            </SectionLabel>
            <SecurityDoctrineMatrix />
          </ShellPanel>
        )}

        {view === "ai" && (
          <ShellGrid columns="minmax(280px, 0.32fr) minmax(0, 0.68fr)" align="start">
            <ShellPanel tone="muted">
              <SectionLabel>AI boundary note</SectionLabel>
              <div className="nexus-shell-copy nexus-shell-copy--compact">
                The AI surface matrix is tracked beside WSTG instead of being hidden in notes.
                Prompt injection, tool misuse, unsafe retrieval, approval bypass, and persistence
                poisoning are all explicit doctrine items now, while Blacksite remains the isolated
                operator-only arena for adversarial tournaments.
              </div>
            </ShellPanel>
            <ShellPanel>
              <SectionLabel detail="AI-specific security scenarios">AI surface matrix</SectionLabel>
              <SecurityDoctrineMatrix initialSource="ai-surface" />
            </ShellPanel>
          </ShellGrid>
        )}

        {view === "physical" && (
          <ShellStack>
            <ThreatLevelIndicator />
            <ShellGrid columns="minmax(0, 1fr) minmax(0, 1fr)" align="start">
              <ShellStack>
                <ShellPanel>
                  <SectionLabel>Camera grid</SectionLabel>
                  <CameraGrid />
                </ShellPanel>
                <ShellPanel tone="muted">
                  <SectionLabel>Perimeter sweep</SectionLabel>
                  <PerimeterSweep />
                </ShellPanel>
              </ShellStack>
              <ShellStack>
                <ShellPanel>
                  <SectionLabel>Security alerts</SectionLabel>
                  <SecurityAlerts />
                </ShellPanel>
                <ShellPanel tone="muted">
                  <SectionLabel>Alert timeline</SectionLabel>
                  <AlertTimeline />
                </ShellPanel>
                <ShellPanel>
                  <SectionLabel>Drone panel</SectionLabel>
                  <DronePanel />
                </ShellPanel>
              </ShellStack>
            </ShellGrid>
          </ShellStack>
        )}
      </ShellStack>
    </ShellPage>
  );
}
