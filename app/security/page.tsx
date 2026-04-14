"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import CameraGrid from "@/components/security/CameraGrid";
import SecurityAlerts from "@/components/security/SecurityAlerts";
import DronePanel from "@/components/security/DronePanel";
import ThreatLevelIndicator from "@/components/security/ThreatLevelIndicator";
import PerimeterSweep from "@/components/security/PerimeterSweep";
import AlertTimeline from "@/components/security/AlertTimeline";
import SecurityDoctrineMatrix from "@/components/security/SecurityDoctrineMatrix";
import AIHardeningCoveragePanel from "@/components/security/AIHardeningCoveragePanel";
import MissionHandoffStrip from "@/components/ui/MissionHandoffStrip";
import SurfaceFocusStrip from "@/components/ui/SurfaceFocusStrip";
import {
  SectionLabel,
  ShellBadge,
  ShellGrid,
  ShellPage,
  ShellPanel,
  ShellSegmentedTabs,
  ShellStack,
} from "@/components/ui/shell";
import { useSessionHrefAutoHeal } from "@/hooks/useSessionHrefAutoHeal";
import { useSurfaceFocusScroll } from "@/hooks/useSurfaceFocusScroll";
import { useStore } from "@/store/useStore";

type View = "doctrine" | "ai" | "physical";

const VIEWS: Array<{ id: View; label: string }> = [
  { id: "doctrine", label: "Doctrine" },
  { id: "ai", label: "AI Surface" },
  { id: "physical", label: "Physical Ops" },
];

export default function SecurityPage() {
  const router = useRouter();
  const { normalizedParams } = useSessionHrefAutoHeal();
  const focus = normalizedParams.get("focus");
  const view = useStore((s) => s.securityWorkbenchView);
  const setView = useStore((s) => s.setSecurityWorkbenchView);

  const urlView = useMemo(() => {
    const value = (normalizedParams.get("view") ?? "").toLowerCase();
    return value === "doctrine" || value === "ai" || value === "physical"
      ? (value as View)
      : null;
  }, [normalizedParams]);

  const focusView = useMemo(() => {
    if (focus === "security-doctrine") return "doctrine";
    if (focus === "security-ai-surface") return "ai";
    if (focus === "security-physical") return "physical";
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
    router.replace(`/security?${params.toString()}`);
  };

  const focusTargetId =
    focus === "security-doctrine"
      ? "security-doctrine"
      : focus === "security-ai-surface"
        ? "security-ai-surface"
        : focus === "security-physical"
          ? "security-physical"
          : null;

  useSurfaceFocusScroll(focusTargetId);

  return (
    <ShellPage
      width="wide"
      surface="cyber"
      eyebrow="Scenario-indexed hardening deck"
      title="BASTION"
      description="Security doctrine now sits beside physical monitoring so route, auth, SSRF, prompt, and tool risks stay visible as first-class operator work."
      actions={
        <>
          <ShellBadge tone="muted">Beta workbench</ShellBadge>
          <ShellBadge tone="accent">WSTG v4.2 pinned</ShellBadge>
          <ShellBadge tone="muted">AI risks tracked separately</ShellBadge>
          <ShellBadge tone="success">Physical ops preserved</ShellBadge>
        </>
      }
    >
      <ShellStack>
        <MissionHandoffStrip
          surface="security"
          mission={normalizedParams.get("mission")}
          from={normalizedParams.get("from")}
          source={normalizedParams.get("source")}
        />

        {focus === "security-doctrine" ? (
          <SurfaceFocusStrip
            title="Focused session: doctrine review"
            description="You landed on SECURITY with doctrine in focus so route, auth, input, config, and AI-surface coverage lead the review."
          />
        ) : null}

        {focus === "security-ai-surface" ? (
          <SurfaceFocusStrip
            title="Focused session: AI surface review"
            description="You landed on SECURITY with the AI surface in focus so prompt, tool, retrieval, and persistence risks are visible before wider doctrine browsing."
          />
        ) : null}

        {focus === "security-physical" ? (
          <SurfaceFocusStrip
            title="Focused session: physical operations"
            description="You landed on SECURITY with physical monitoring in focus so camera, perimeter, alert, and drone-adjacent posture starts at the right panel."
          />
        ) : null}

        <ShellSegmentedTabs items={VIEWS} active={view} onChange={handleViewChange} />

        {view === "doctrine" && (
          <div id="security-doctrine" style={{ scrollMarginTop: "120px" }}>
            <ShellPanel>
              <SectionLabel detail="Route, auth, input, config, and AI-surface coverage">
                Security doctrine
              </SectionLabel>
              <SecurityDoctrineMatrix />
            </ShellPanel>
          </div>
        )}

        {view === "ai" && (
          <div id="security-ai-surface" style={{ scrollMarginTop: "120px" }}>
            <ShellStack>
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
              <ShellPanel>
                <SectionLabel detail="Observable hardening stages and current evidence-posture coverage">
                  AI hardening coverage
                </SectionLabel>
                <AIHardeningCoveragePanel />
              </ShellPanel>
            </ShellStack>
          </div>
        )}

        {view === "physical" && (
          <div id="security-physical" style={{ scrollMarginTop: "120px" }}>
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
          </div>
        )}
      </ShellStack>
    </ShellPage>
  );
}
