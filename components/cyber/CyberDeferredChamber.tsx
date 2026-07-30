"use client";

import dynamic from "next/dynamic";
import {
  OpsField,
  OpsRail,
  OpsWorkplane,
  ShellSegmentedTabs,
} from "@/components/ui/shell";
import type { CyberChamberId } from "@/lib/surfaceCondensationRegistry";

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
  () =>
    import("@/components/cyber/DroneCompliancePanel").then((module) => ({
      default: module.DroneCompliancePanel,
    })),
  { ssr: false },
);
const LazyVulnerabilityReviewWorkbench = dynamic(
  () => import("@/components/cyber/VulnerabilityReviewWorkbench"),
  { ssr: false },
);

type EvidenceView = "cves" | "otx" | "cisa";

const EVIDENCE_VIEWS: Array<{ id: EvidenceView; label: string }> = [
  { id: "cves", label: "CVEs" },
  { id: "otx", label: "OTX" },
  { id: "cisa", label: "CISA KEV" },
];

interface CyberDeferredChamberProps {
  chamber: Exclude<CyberChamberId, "triage">;
  evidenceView: EvidenceView;
  workplaneClass: string;
  railClass: string;
  onEvidenceViewChange: (view: EvidenceView) => void;
}

export default function CyberDeferredChamber({
  chamber,
  evidenceView,
  workplaneClass,
  railClass,
  onEvidenceViewChange,
}: CyberDeferredChamberProps) {
  if (chamber === "matrix") {
    return (
      <div id="cyber-matrix" style={{ scrollMarginTop: "120px" }}>
        <OpsWorkplane className={workplaneClass}>
          <OpsField
            title="Severity matrix"
            detail="Severity correlation across CVE and OTX"
          >
            <LazyCyberHeatmap />
          </OpsField>
        </OpsWorkplane>
      </div>
    );
  }

  if (chamber === "review") {
    return (
      <div id="cyber-vuln-review" style={{ scrollMarginTop: "120px" }}>
        <OpsRail className={railClass}>
          <OpsField
            title="Vulnerability review"
            detail="Local code context, static security heuristics, and one exact repair lane"
            tone="muted"
          >
            <LazyVulnerabilityReviewWorkbench />
          </OpsField>
        </OpsRail>
      </div>
    );
  }

  if (chamber === "evidence") {
    return (
      <div
        id={
          evidenceView === "otx"
            ? "cyber-otx"
            : evidenceView === "cisa"
              ? "cyber-cisa"
              : "cyber-cves"
        }
        style={{ scrollMarginTop: "120px" }}
      >
        <OpsWorkplane className={workplaneClass}>
          <div className="nexus-surface-subtabs">
            <ShellSegmentedTabs
              items={EVIDENCE_VIEWS}
              active={evidenceView}
              onChange={onEvidenceViewChange}
              minButtonWidth={110}
            />
            {evidenceView === "cves" ? (
              <OpsField title="CVE feed" detail="Raw NVD feed">
                <LazyCVEFeed />
              </OpsField>
            ) : null}
            {evidenceView === "otx" ? (
              <OpsField title="OTX feed" detail="AlienVault pulses">
                <LazyOTXFeed />
              </OpsField>
            ) : null}
            {evidenceView === "cisa" ? (
              <OpsField
                title="CISA KEV"
                detail="Known exploited vulnerabilities"
              >
                <LazyCISAFeed />
              </OpsField>
            ) : null}
          </div>
        </OpsWorkplane>
      </div>
    );
  }

  return (
    <div id="cyber-drone" style={{ scrollMarginTop: "120px" }}>
      <OpsRail className={railClass}>
        <OpsField
          title="Drone compliance check"
          detail="FAA, state, local, airspace, and parallel compliance review"
          tone="muted"
        >
          <LazyDroneCompliancePanel />
        </OpsField>
      </OpsRail>
    </div>
  );
}
