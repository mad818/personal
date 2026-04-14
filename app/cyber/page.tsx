// ── cyber/page ──────────────────────────────────────────────
// CYBER tab: triage, heatmaps, CVEs, OTX, and CISA KEV feeds.

"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { ArticlesLoader, CVEsLoader, OTXLoader } from "@/components/ui/DataLoader";
import MissionHandoffStrip from "@/components/ui/MissionHandoffStrip";
import SurfaceModuleCard from "@/components/ui/SurfaceModuleCard";
import SurfaceModuleSection from "@/components/ui/SurfaceModuleSection";
import SurfaceFocusStrip from "@/components/ui/SurfaceFocusStrip";
import {
  ShellBadge,
  ShellPage,
  ShellSegmentedTabs,
  ShellStack,
} from "@/components/ui/shell";
import { getAssistantWorkspace } from "@/lib/assistantSessionRegistry";
import {
  governanceApprovalLabel,
  governanceRiskLabel,
} from "@/lib/governanceCatalog";
import {
  resolveCyberChamber,
  resolveCyberEvidenceView,
  type CyberChamberId,
} from "@/lib/surfaceCondensationRegistry";
import { getWorkflowPack } from "@/lib/workflowPacks";
import { useSessionHrefAutoHeal } from "@/hooks/useSessionHrefAutoHeal";
import { useSurfaceFocusScroll } from "@/hooks/useSurfaceFocusScroll";
import { getSurfaceModuleSpec } from "@/lib/surfaceRedesignRegistry";
import { useStore } from "@/store/useStore";

type CyberView = "triage" | "matrix" | "cves" | "otx" | "cisa" | "drone";

const CHAMBER_VIEWS: Array<{ id: CyberChamberId; label: string }> = [
  { id: "triage", label: "🧠 TRIAGE" },
  { id: "matrix", label: "📊 MATRIX" },
  { id: "evidence", label: "⚠️ EVIDENCE" },
  { id: "drone", label: "DRONE OPS" },
];

const EVIDENCE_VIEWS: Array<{ id: "cves" | "otx" | "cisa"; label: string }> = [
  { id: "cves", label: "CVEs" },
  { id: "otx", label: "OTX" },
  { id: "cisa", label: "CISA KEV" },
];

const LazyCyberHeatmap = dynamic(
  () => import("@/components/cyber/CyberHeatmap"),
  { ssr: false },
);
const LazyCVEFeed = dynamic(() => import("@/components/cyber/CVEFeed"), {
  ssr: false,
});
const LazyOTXFeed = dynamic(() => import("@/components/cyber/OTXFeed"), {
  ssr: false,
});
const LazyCISAFeed = dynamic(() => import("@/components/cyber/CISAFeed"), {
  ssr: false,
});
const LazyDroneCompliancePanel = dynamic(
  () => import("@/components/cyber/DroneCompliancePanel").then(m => ({ default: m.DroneCompliancePanel })),
  { ssr: false },
);
const LazyTriageView = dynamic(() => import("@/components/cyber/TriageView"), {
  ssr: false,
});
const LazyCyberArticleHeatmap = dynamic(
  () => import("@/components/cyber/CyberArticleHeatmap"),
  { ssr: false },
);
const LazyOsintCasefileCard = dynamic(
  () => import("@/components/recon/OsintCasefileCard"),
  { ssr: false },
);

export default function CyberPage() {
  const router = useRouter();
  const { normalizedParams } = useSessionHrefAutoHeal();
  const focus = normalizedParams.get("focus");
  const view = useStore((s) => s.cyberView) ?? "triage";
  const setView = useStore((s) => s.setCyberView);
  const cves = useStore((s) => s.cves);
  const otxPulses = useStore((s) => s.otxPulses);
  const articles = useStore((s) => s.articles);

  const urlView = useMemo(() => {
    const v = (normalizedParams.get("view") ?? "").toLowerCase();
    return (
      ["triage", "matrix", "cves", "otx", "cisa", "drone"] as CyberView[]
    ).includes(v as CyberView)
      ? (v as CyberView)
      : null;
  }, [normalizedParams]);

  const focusView = useMemo(() => {
    if (focus === "cyber-triage") return "triage";
    if (focus === "cyber-matrix") return "matrix";
    if (focus === "cyber-cves") return "cves";
    if (focus === "cyber-otx") return "otx";
    if (focus === "cyber-cisa") return "cisa";
    if (focus === "cyber-drone") return "drone";
    return null;
  }, [focus]);

  const chamber = useMemo(() => resolveCyberChamber(view), [view]);
  const evidenceView = useMemo(() => resolveCyberEvidenceView(view), [view]);

  useEffect(() => {
    const nextView = focusView ?? urlView;
    if (!nextView) return;
    setView(nextView);
  }, [focusView, setView, urlView]);

  const handleChamberChange = (nextView: CyberChamberId) => {
    const targetView = nextView === "evidence" ? "cves" : nextView;
    setView(targetView);
    const params = new URLSearchParams(normalizedParams.toString());
    params.set("view", targetView);
    router.replace(`/cyber?${params.toString()}`);
  };

  const handleEvidenceViewChange = (nextView: "cves" | "otx" | "cisa") => {
    setView(nextView);
    const params = new URLSearchParams(normalizedParams.toString());
    params.set("view", nextView);
    router.replace(`/cyber?${params.toString()}`);
  };

  const focusTargetId =
    focus === "cyber-triage"
      ? "cyber-triage"
      : focus === "cyber-matrix"
        ? "cyber-matrix"
        : focus === "cyber-cves"
          ? "cyber-cves"
          : focus === "cyber-otx"
            ? "cyber-otx"
            : focus === "cyber-cisa"
              ? "cyber-cisa"
              : focus === "cyber-drone"
                ? "cyber-drone"
                : null;

  useSurfaceFocusScroll(focusTargetId);

  const threatBriefSpec = getSurfaceModuleSpec("cyber", "threat-brief");
  const priorityGridSpec = getSurfaceModuleSpec("cyber", "priority-grid");
  const evidenceFeedsSpec = getSurfaceModuleSpec("cyber", "evidence-feeds", view);
  const physicalOpsSpec = getSurfaceModuleSpec("cyber", "physical-ops");
  const cyberGovernancePack = getWorkflowPack("cyber-triage");
  const cyberFollowThrough = [
    getAssistantWorkspace("recon-opsec"),
    getAssistantWorkspace("recon-binary"),
    getAssistantWorkspace("vault-compiled-pages"),
  ];

  if (!threatBriefSpec || !priorityGridSpec || !evidenceFeedsSpec || !physicalOpsSpec) {
    return null;
  }

  const threatPostureStripSpec = {
    ...threatBriefSpec,
    title: "Threat Posture",
    detail: "Cross-chamber readiness",
  };

  return (
    <ShellPage
      width="wide"
      surface="cyber"
      eyebrow="Containment mesh"
      title="BASTION"
      description="Triage vulnerabilities, correlate threat feeds, and monitor exposed posture inside the Aegis Vector containment lane."
        actions={
          <>
            <ShellBadge tone="accent">Approval-staged triage</ShellBadge>
            <ShellBadge tone="muted">Free-first posture</ShellBadge>
          </>
        }
    >
      <CVEsLoader />
      <OTXLoader />
      <ArticlesLoader />

      <ShellStack>
        <SurfaceModuleCard
          spec={threatPostureStripSpec}
          tone="muted"
          compact
          className="nexus-surface-route-strip"
        >
          <div className="nexus-surface-route-strip__grid">
            <div className="nexus-surface-route-strip__cell">
              <span className="nexus-surface-route-strip__cellLabel">Triage queue</span>
              <strong className="nexus-surface-route-strip__cellValue">
                {cves.length}
              </strong>
              <span className="nexus-surface-route-strip__cellNote">
                Current vulnerability intake stays visible across every chamber.
              </span>
            </div>
            <div className="nexus-surface-route-strip__cell">
              <span className="nexus-surface-route-strip__cellLabel">Evidence source</span>
              <strong className="nexus-surface-route-strip__cellValue">
                {evidenceView.toUpperCase()}
              </strong>
              <span className="nexus-surface-route-strip__cellNote">
                CVEs, OTX, and KEV now share one evidence lane instead of three peer tabs.
              </span>
            </div>
            <div className="nexus-surface-route-strip__cell">
              <span className="nexus-surface-route-strip__cellLabel">Signal pressure</span>
              <strong className="nexus-surface-route-strip__cellValue">
                {articles.length}
              </strong>
              <span className="nexus-surface-route-strip__cellNote">
                Threat-intelligence signals stay nearby without taking over the first screen.
              </span>
            </div>
            <div className="nexus-surface-route-strip__cell">
              <span className="nexus-surface-route-strip__cellLabel">Pulse count</span>
              <strong className="nexus-surface-route-strip__cellValue">
                {otxPulses.length}
              </strong>
              <span className="nexus-surface-route-strip__cellNote">
                OTX pulse volume remains visible even when the chamber is focused elsewhere.
              </span>
            </div>
          </div>
        </SurfaceModuleCard>

        <MissionHandoffStrip
          surface="cyber"
          mission={normalizedParams.get("mission")}
          from={normalizedParams.get("from")}
          source={normalizedParams.get("source")}
        />

        {focus === "cyber-triage" ? (
          <SurfaceFocusStrip
            title="Focused session: cyber triage"
            description="You landed on CYBER with the triage lane in focus so prioritized action framing comes before raw feed browsing."
          />
        ) : null}

        {focus === "cyber-matrix" ? (
          <SurfaceFocusStrip
            title="Focused session: severity matrix"
            description="You landed on CYBER with the severity matrix in focus so correlation between CVE and OTX posture is visible immediately."
          />
        ) : null}

        {focus === "cyber-cves" ? (
          <SurfaceFocusStrip
            title="Focused session: CVE feed"
            description="You landed on CYBER with the raw CVE lane in focus so source-level vulnerability review can start without extra navigation."
          />
        ) : null}

        {focus === "cyber-otx" ? (
          <SurfaceFocusStrip
            title="Focused session: OTX feed"
            description="You landed on CYBER with the OTX pulse lane in focus so threat-intel feed review starts on the right panel."
          />
        ) : null}

        {focus === "cyber-cisa" ? (
          <SurfaceFocusStrip
            title="Focused session: CISA KEV"
            description="You landed on CYBER with the KEV lane in focus so exploited-vulnerability review is visible first."
          />
        ) : null}

        {focus === "cyber-drone" ? (
          <SurfaceFocusStrip
            title="Focused session: drone compliance"
            description="You landed on CYBER with the drone-compliance lane in focus so FAA and operational review starts at the correct panel."
          />
        ) : null}

        <ShellSegmentedTabs
          items={CHAMBER_VIEWS}
          active={chamber}
          onChange={handleChamberChange}
          minButtonWidth={120}
        />

        {chamber === "triage" && (
          <div id="cyber-triage" style={{ scrollMarginTop: "120px" }}>
            <SurfaceModuleCard spec={threatBriefSpec} tone="hero">
              <div className="nexus-surface-chamber-shell__body">
                <div className="nexus-surface-chamber-shell__lead">
                  <SurfaceModuleSection title="Priority queue" detail="Action framing for the hottest cyber pressure">
                    <LazyTriageView />
                  </SurfaceModuleSection>
                </div>
                <div className="nexus-surface-chamber-shell__support">
                  <ShellStack gap="12px">
                    <SurfaceModuleSection
                      title="Governed baseline"
                      detail="cyber-triage pack"
                      tone="muted"
                    >
                      <div
                        style={{
                          display: "grid",
                          gap: "10px",
                        }}
                      >
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                          <ShellBadge tone="accent">
                            {governanceRiskLabel(cyberGovernancePack.riskTier)}
                          </ShellBadge>
                          <ShellBadge tone="muted">
                            {governanceApprovalLabel(cyberGovernancePack)}
                          </ShellBadge>
                          <ShellBadge tone="muted">
                            {cyberGovernancePack.title}
                          </ShellBadge>
                        </div>
                        <p className="nexus-shell-copy nexus-shell-copy--compact">
                          {cyberGovernancePack.summary}
                        </p>
                        <p className="nexus-shell-copy nexus-shell-copy--compact">
                          {cyberGovernancePack.nextMove}
                        </p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                          {cyberGovernancePack.domainTags.map((tag) => (
                            <ShellBadge key={tag} tone="muted">
                              {tag}
                            </ShellBadge>
                          ))}
                        </div>
                        <div style={{ display: "grid", gap: "8px" }}>
                          {cyberFollowThrough.map((workspace) => (
                            <a
                              key={workspace.href}
                              href={workspace.href}
                              className="nexus-shell-button"
                              style={{
                                minHeight: "36px",
                                padding: "8px 12px",
                                justifyContent: "space-between",
                                gap: "10px",
                                textDecoration: "none",
                              }}
                            >
                              <span>{workspace.label}</span>
                              <span style={{ color: "var(--text3)", fontSize: "10px" }}>
                                staged
                              </span>
                            </a>
                          ))}
                        </div>
                      </div>
                    </SurfaceModuleSection>
                    <SurfaceModuleSection
                      title="Threat intelligence signals"
                      detail="Signal clustering"
                      tone="muted"
                    >
                      <LazyCyberArticleHeatmap />
                    </SurfaceModuleSection>
                    <SurfaceModuleSection
                      title="Caseflow loop"
                      detail="Intake → Collect → Pivot → Package"
                      tone="muted"
                    >
                      <LazyOsintCasefileCard route="/cyber" />
                    </SurfaceModuleSection>
                  </ShellStack>
                </div>
              </div>
            </SurfaceModuleCard>
          </div>
        )}

        {chamber === "matrix" && (
          <div id="cyber-matrix" style={{ scrollMarginTop: "120px" }}>
            <SurfaceModuleCard spec={priorityGridSpec}>
              <SurfaceModuleSection title="Severity matrix" detail="Severity correlation across CVE and OTX">
                <LazyCyberHeatmap />
              </SurfaceModuleSection>
            </SurfaceModuleCard>
          </div>
        )}

        {chamber === "evidence" && (
          <div
            id={evidenceView === "otx" ? "cyber-otx" : evidenceView === "cisa" ? "cyber-cisa" : "cyber-cves"}
            style={{ scrollMarginTop: "120px" }}
          >
            <SurfaceModuleCard spec={evidenceFeedsSpec}>
              <div className="nexus-surface-subtabs">
                <ShellSegmentedTabs
                  items={EVIDENCE_VIEWS}
                  active={evidenceView}
                  onChange={handleEvidenceViewChange}
                  minButtonWidth={110}
                />
                {evidenceView === "cves" ? (
                  <SurfaceModuleSection title="CVE feed" detail="Raw NVD feed">
                    <LazyCVEFeed />
                  </SurfaceModuleSection>
                ) : null}
                {evidenceView === "otx" ? (
                  <SurfaceModuleSection title="OTX feed" detail="AlienVault pulses">
                    <LazyOTXFeed />
                  </SurfaceModuleSection>
                ) : null}
                {evidenceView === "cisa" ? (
                  <SurfaceModuleSection title="CISA KEV" detail="Known exploited vulnerabilities">
                    <LazyCISAFeed />
                  </SurfaceModuleSection>
                ) : null}
              </div>
            </SurfaceModuleCard>
          </div>
        )}

        {chamber === "drone" && (
          <div id="cyber-drone" style={{ scrollMarginTop: "120px" }}>
            <SurfaceModuleCard spec={physicalOpsSpec} tone="muted">
              <SurfaceModuleSection
                title="Drone compliance check"
                detail="FAA, state, local, airspace, and parallel compliance review"
                tone="muted"
              >
                <LazyDroneCompliancePanel />
              </SurfaceModuleSection>
            </SurfaceModuleCard>
          </div>
        )}
      </ShellStack>
    </ShellPage>
  );
}
