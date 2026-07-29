// ── cyber/page ──────────────────────────────────────────────
// CYBER tab: triage, heatmaps, CVEs, OTX, and CISA KEV feeds.

"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  ArticlesLoader,
  CVEsLoader,
  OTXLoader,
} from "@/components/ui/DataLoader";
import MissionHandoffStrip from "@/components/ui/MissionHandoffStrip";
import SurfaceFocusStrip from "@/components/ui/SurfaceFocusStrip";
import {
  OpsField,
  OpsStrip,
  OpsWorkplane,
  ShellBadge,
  ShellPage,
  ShellSegmentedTabs,
  ShellStack,
} from "@/components/ui/shell";
import TrustOperationsRail from "@/components/ui/TrustOperationsRail";
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
import { getOpsLayoutDescriptor } from "@/lib/opsLayoutRegistry";
import { getSurfaceModuleSpec } from "@/lib/surfaceRedesignRegistry";
import { useStore } from "@/store/useStore";

type CyberView =
  | "triage"
  | "vuln-review"
  | "matrix"
  | "cves"
  | "otx"
  | "cisa"
  | "drone";

const CHAMBER_VIEWS: Array<{ id: CyberChamberId; label: string }> = [
  { id: "triage", label: "🧠 TRIAGE" },
  { id: "review", label: "🛡 REVIEW" },
  { id: "matrix", label: "📊 MATRIX" },
  { id: "evidence", label: "⚠️ EVIDENCE" },
  { id: "drone", label: "DRONE OPS" },
];

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
const LazyAiExposureReviewCard = dynamic(
  () => import("@/components/recon/AiExposureReviewCard"),
  { ssr: false },
);
const LazyCyberDeferredChamber = dynamic(
  () => import("@/components/cyber/CyberDeferredChamber"),
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
      [
        "triage",
        "vuln-review",
        "matrix",
        "cves",
        "otx",
        "cisa",
        "drone",
      ] as CyberView[]
    ).includes(v as CyberView)
      ? (v as CyberView)
      : null;
  }, [normalizedParams]);

  const focusView = useMemo(() => {
    if (focus === "cyber-triage") return "triage";
    if (focus === "cyber-vuln-review") return "vuln-review";
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
    const targetView =
      nextView === "evidence"
        ? "cves"
        : nextView === "review"
          ? "vuln-review"
          : nextView;
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
      : focus === "cyber-vuln-review"
        ? "cyber-vuln-review"
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
  const evidenceFeedsSpec = getSurfaceModuleSpec(
    "cyber",
    "evidence-feeds",
    view,
  );
  const physicalOpsSpec = getSurfaceModuleSpec("cyber", "physical-ops");
  const cyberLayout = getOpsLayoutDescriptor("cyber");
  const cyberGovernancePack = getWorkflowPack("cyber-triage");
  const cyberFollowThrough = [
    getAssistantWorkspace("cyber-vuln-review"),
    getAssistantWorkspace("recon-opsec"),
    getAssistantWorkspace("recon-binary"),
    getAssistantWorkspace("vault-compiled-pages"),
  ];

  if (
    !threatBriefSpec ||
    !priorityGridSpec ||
    !evidenceFeedsSpec ||
    !physicalOpsSpec
  ) {
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
      eyebrow="Threat containment board"
      title="Threat desk"
      description="Triage and evidence."
      actions={
        <>
          <ShellBadge tone="accent">Approval-staged triage</ShellBadge>
          <ShellBadge tone="muted">Repair-first posture</ShellBadge>
        </>
      }
    >
      <CVEsLoader />
      <OTXLoader />
      <ArticlesLoader />

      <ShellStack>
        <OpsStrip className="nexus-surface-route-strip">
          <div className="nexus-surface-route-strip__grid">
            <div className="nexus-surface-route-strip__cell">
              <span className="nexus-surface-route-strip__cellLabel">
                Triage queue
              </span>
              <strong className="nexus-surface-route-strip__cellValue">
                {cves.length}
              </strong>
              <span className="nexus-surface-route-strip__cellNote">
                Current vulnerability intake stays visible across every chamber.
              </span>
            </div>
            <div className="nexus-surface-route-strip__cell">
              <span className="nexus-surface-route-strip__cellLabel">
                Evidence source
              </span>
              <strong className="nexus-surface-route-strip__cellValue">
                {evidenceView.toUpperCase()}
              </strong>
              <span className="nexus-surface-route-strip__cellNote">
                CVEs, OTX, and KEV now share one evidence lane instead of three
                peer tabs.
              </span>
            </div>
            <div className="nexus-surface-route-strip__cell">
              <span className="nexus-surface-route-strip__cellLabel">
                Signal pressure
              </span>
              <strong className="nexus-surface-route-strip__cellValue">
                {articles.length}
              </strong>
              <span className="nexus-surface-route-strip__cellNote">
                Threat-intelligence signals stay nearby without taking over the
                first screen.
              </span>
            </div>
            <div className="nexus-surface-route-strip__cell">
              <span className="nexus-surface-route-strip__cellLabel">
                Pulse count
              </span>
              <strong className="nexus-surface-route-strip__cellValue">
                {otxPulses.length}
              </strong>
              <span className="nexus-surface-route-strip__cellNote">
                OTX pulse volume remains visible even when the chamber is
                focused elsewhere.
              </span>
            </div>
          </div>
        </OpsStrip>

        <MissionHandoffStrip
          surface="cyber"
          mission={normalizedParams.get("mission")}
          from={normalizedParams.get("from")}
          source={normalizedParams.get("source")}
        />

        {focus === "cyber-triage" ? (
          <SurfaceFocusStrip
            title="Focused session: cyber triage"
            description="Triage opens first."
          />
        ) : null}

        {focus === "cyber-matrix" ? (
          <SurfaceFocusStrip
            title="Focused session: severity matrix"
            description="Severity posture opens first."
          />
        ) : null}

        {focus === "cyber-vuln-review" ? (
          <SurfaceFocusStrip
            title="Focused session: vulnerability review"
            description="Repair lane opens first."
          />
        ) : null}

        {focus === "cyber-cves" ? (
          <SurfaceFocusStrip
            title="Focused session: CVE feed"
            description="Raw CVEs open first."
          />
        ) : null}

        {focus === "cyber-otx" ? (
          <SurfaceFocusStrip
            title="Focused session: OTX feed"
            description="Threat feed opens first."
          />
        ) : null}

        {focus === "cyber-cisa" ? (
          <SurfaceFocusStrip
            title="Focused session: CISA KEV"
            description="Exploited CVEs open first."
          />
        ) : null}

        {focus === "cyber-drone" ? (
          <SurfaceFocusStrip
            title="Focused session: drone compliance"
            description="Drone compliance opens first."
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
            <OpsWorkplane className={cyberLayout.workplaneClass}>
              <div className="nexus-surface-chamber-shell__body">
                <div className="nexus-surface-chamber-shell__lead">
                  <OpsField
                    title="Priority queue"
                    detail="Action framing for the hottest cyber pressure"
                  >
                    <LazyTriageView />
                  </OpsField>
                </div>
                <div className="nexus-surface-chamber-shell__support">
                  <ShellStack gap="12px">
                    <TrustOperationsRail
                      title={cyberLayout.trustLabel}
                      detail="Step-up, privacy shield, connector, and dangerous-action posture stays inline with containment."
                      compact
                    />
                    <OpsField
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
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "6px",
                          }}
                        >
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
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "6px",
                          }}
                        >
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
                              <span
                                style={{
                                  color: "var(--text3)",
                                  fontSize: "10px",
                                }}
                              >
                                staged
                              </span>
                            </a>
                          ))}
                        </div>
                      </div>
                    </OpsField>
                    <OpsField
                      title="Threat intelligence signals"
                      detail="Signal clustering"
                      tone="muted"
                    >
                      <LazyCyberArticleHeatmap />
                    </OpsField>
                    <OpsField
                      title="AI exposure packs"
                      detail="Passive AI posture review"
                      tone="muted"
                    >
                      <LazyAiExposureReviewCard route="/cyber" />
                    </OpsField>
                    <OpsField
                      title="Caseflow loop"
                      detail="Intake → Collect → Pivot → Package"
                      tone="muted"
                    >
                      <LazyOsintCasefileCard route="/cyber" />
                    </OpsField>
                  </ShellStack>
                </div>
              </div>
            </OpsWorkplane>
          </div>
        )}

        {chamber !== "triage" ? (
          <LazyCyberDeferredChamber
            chamber={chamber}
            evidenceView={evidenceView}
            workplaneClass={cyberLayout.workplaneClass}
            railClass={cyberLayout.railClass}
            onEvidenceViewChange={handleEvidenceViewChange}
          />
        ) : null}
      </ShellStack>
    </ShellPage>
  );
}
