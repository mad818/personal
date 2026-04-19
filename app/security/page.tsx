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
import TrustOperationsRail from "@/components/ui/TrustOperationsRail";
import {
  OpsField,
  OpsInspector,
  OpsRail,
  OpsStrip,
  OpsWorkplane,
  ShellBadge,
  ShellPage,
  ShellSegmentedTabs,
  ShellStack,
} from "@/components/ui/shell";
import { useSessionHrefAutoHeal } from "@/hooks/useSessionHrefAutoHeal";
import { useSurfaceFocusScroll } from "@/hooks/useSurfaceFocusScroll";
import { getOpsLayoutDescriptor } from "@/lib/opsLayoutRegistry";
import { useStore } from "@/store/useStore";

type View = "doctrine" | "ai" | "physical";

const VIEWS: Array<{ id: View; label: string }> = [
  { id: "doctrine", label: "Controls" },
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
  const securityLayout = getOpsLayoutDescriptor("security");

  return (
    <ShellPage
      width="wide"
      surface="security"
      eyebrow="Security control surface"
      title="Security controls"
      description="Route, auth, AI, and physical posture."
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
            title="Focused session: controls review"
            description="Controls open first."
          />
        ) : null}

        {focus === "security-ai-surface" ? (
          <SurfaceFocusStrip
            title="Focused session: AI surface review"
            description="AI surface opens first."
          />
        ) : null}

        {focus === "security-physical" ? (
          <SurfaceFocusStrip
            title="Focused session: physical operations"
            description="Physical monitoring opens first."
          />
        ) : null}

        <ShellSegmentedTabs items={VIEWS} active={view} onChange={handleViewChange} />

        {view === "doctrine" && (
          <div id="security-doctrine" style={{ scrollMarginTop: "120px" }}>
            <div className="nexus-surface-chamber-shell">
              <div className="nexus-surface-chamber-shell__body">
                <OpsRail className={`nexus-surface-chamber-shell__support ${securityLayout.railClass}`}>
                  <ShellStack gap="12px">
                    <OpsField
                      title="Control fascia"
                      detail="Route, auth, input, config, and AI-surface coverage"
                      tone="muted"
                      compact
                    >
                      <div className="nexus-shell-copy nexus-shell-copy--compact">
                        Route policy, prompt boundary, protected actions, and hardening stay on one surface.
                      </div>
                    </OpsField>
                    <TrustOperationsRail
                      title={securityLayout.trustLabel}
                      detail="Protected settings, verification, and tool posture stay inline with controls."
                      compact
                    />
                  </ShellStack>
                </OpsRail>
                <OpsWorkplane className={`nexus-surface-chamber-shell__lead ${securityLayout.workplaneClass}`}>
                  <OpsField
                    title="Security controls"
                    detail="Route, auth, input, config, and AI-surface coverage"
                  >
                    <SecurityDoctrineMatrix />
                  </OpsField>
                </OpsWorkplane>
              </div>
            </div>
          </div>
        )}

        {view === "ai" && (
          <div id="security-ai-surface" style={{ scrollMarginTop: "120px" }}>
            <ShellStack>
              <div className="nexus-surface-chamber-shell">
                <div className="nexus-surface-chamber-shell__body">
                  <OpsRail className={`nexus-surface-chamber-shell__support ${securityLayout.railClass}`}>
                    <ShellStack gap="12px">
                    <OpsField title="AI boundary note" detail="Prompt, tool, retrieval, and persistence posture" tone="muted" compact>
                      <div className="nexus-shell-copy nexus-shell-copy--compact">
                        The AI matrix stays beside the control plane.
                        Injection, tool misuse, unsafe retrieval, approval bypass, and persistence poisoning stay explicit.
                      </div>
                      </OpsField>
                      <TrustOperationsRail
                        title={securityLayout.trustLabel}
                        detail="Protected-action readiness stays visible during AI-surface review."
                        compact
                      />
                    </ShellStack>
                  </OpsRail>
                  <OpsWorkplane className={`nexus-surface-chamber-shell__lead ${securityLayout.workplaneClass}`}>
                    <OpsField title="AI surface matrix" detail="AI-specific security scenarios">
                      <SecurityDoctrineMatrix initialSource="ai-surface" />
                    </OpsField>
                  </OpsWorkplane>
                </div>
              </div>
              <div className="nexus-surface-continuity-strip">
                <OpsStrip className={securityLayout.continuityClass}>
                  <OpsField
                    title="AI hardening coverage"
                    detail="Observable hardening stages and current evidence-posture coverage"
                    tone="muted"
                  >
                    <AIHardeningCoveragePanel />
                  </OpsField>
                </OpsStrip>
              </div>
            </ShellStack>
          </div>
        )}

        {view === "physical" && (
          <div id="security-physical" style={{ scrollMarginTop: "120px" }}>
            <ShellStack>
              <div className="nexus-surface-chamber-shell">
                <div className="nexus-surface-chamber-shell__body">
                  <OpsWorkplane className={`nexus-surface-chamber-shell__lead ${securityLayout.workplaneClass}`}>
                    <ShellStack gap="12px">
                      <OpsField
                        title="Live monitoring"
                        detail="Camera coverage and perimeter sweep posture"
                      >
                        <CameraGrid />
                      </OpsField>
                      <OpsField
                        title="Perimeter sweep"
                        detail="Zones, motion vectors, and approach cues"
                        tone="muted"
                      >
                        <PerimeterSweep />
                      </OpsField>
                    </ShellStack>
                  </OpsWorkplane>
                  <OpsRail className={`nexus-surface-chamber-shell__support ${securityLayout.railClass}`}>
                    <ShellStack gap="12px">
                      <OpsField
                        title="Threat posture"
                        detail="Current physical risk and escalation posture"
                        compact
                      >
                        <ThreatLevelIndicator />
                      </OpsField>
                      <OpsField
                        title="Control note"
                        detail="Keep protected actions and monitoring in one desk"
                        tone="muted"
                        compact
                      >
                        <div className="nexus-shell-copy nexus-shell-copy--compact">
                          Physical operations stay control-led.
                          Camera and perimeter lanes stay primary while alerts and protected posture stay embedded.
                        </div>
                      </OpsField>
                      <TrustOperationsRail
                        title={securityLayout.trustLabel}
                        detail="Protected settings, verification posture, and escalation readiness stay beside live monitoring."
                        compact
                      />
                    </ShellStack>
                  </OpsRail>
                </div>
              </div>

              <div className="nexus-surface-continuity-strip">
                <OpsStrip className={securityLayout.continuityClass}>
                  <div className="nexus-surface-chamber-shell__body">
                    <div className="nexus-surface-chamber-shell__lead">
                      <OpsField
                        title="Security alerts"
                        detail="Current event queue and active incident posture"
                      >
                        <SecurityAlerts />
                      </OpsField>
                    </div>
                    <OpsInspector className={`nexus-surface-chamber-shell__support ${securityLayout.inspectorClass}`}>
                      <ShellStack gap="12px">
                        <OpsField
                          title="Alert timeline"
                          detail="Sequence, escalation history, and recent transitions"
                          tone="muted"
                          compact
                        >
                          <AlertTimeline />
                        </OpsField>
                        <OpsField
                          title="Drone panel"
                          detail="Air-adjacent response posture and monitoring continuity"
                          compact
                        >
                          <DronePanel />
                        </OpsField>
                      </ShellStack>
                    </OpsInspector>
                  </div>
                </OpsStrip>
              </div>
            </ShellStack>
          </div>
        )}
      </ShellStack>
    </ShellPage>
  );
}
