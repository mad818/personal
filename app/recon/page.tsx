// ── recon/page ──────────────────────────────────────────────
// RECON tab: free-first OSINT lookup, passive DNS, metadata, and OPSEC.

"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  OpsField,
  OpsRail,
  OpsStrip,
  OpsWorkplane,
  ShellBadge,
  ShellPage,
  ShellSegmentedTabs,
  ShellStack,
} from "@/components/ui/shell";
import SurfaceFocusStrip from "@/components/ui/SurfaceFocusStrip";
import TrustOperationsRail from "@/components/ui/TrustOperationsRail";
import { useSessionHrefAutoHeal } from "@/hooks/useSessionHrefAutoHeal";
import { useSurfaceFocusScroll } from "@/hooks/useSurfaceFocusScroll";
import { getOpsLayoutDescriptor } from "@/lib/opsLayoutRegistry";
import { getSurfaceModuleSpec } from "@/lib/surfaceRedesignRegistry";

const LazyReconLookup = dynamic(
  () => import("@/components/recon/ReconLookup"),
  { ssr: false },
);
const LazyPassiveDns = dynamic(
  () => import("@/components/recon/PassiveDnsPanel"),
  { ssr: false },
);
const LazyOpsecPanel = dynamic(() => import("@/components/recon/OpsecPanel"), {
  ssr: false,
});
const LazyHeadersAudit = dynamic(
  () => import("@/components/recon/HeadersAudit"),
  { ssr: false },
);
const LazyMetadataExtractor = dynamic(
  () => import("@/components/recon/MetadataExtractor"),
  { ssr: false },
);
const LazyBinaryTriagePanel = dynamic(
  () => import("@/components/recon/BinaryTriagePanel"),
  { ssr: false },
);
const LazyBrowserOpsReadinessCard = dynamic(
  () => import("@/components/recon/BrowserOpsReadinessCard"),
  { ssr: false },
);
const LazyOsintCasefileCard = dynamic(
  () => import("@/components/recon/OsintCasefileCard"),
  { ssr: false },
);
const LazyRepoIntelPanel = dynamic(
  () => import("@/components/recon/RepoIntelPanel"),
  { ssr: false },
);
const LazyIdeaLinkIntakePanel = dynamic(
  () => import("@/components/recon/IdeaLinkIntakePanel"),
  { ssr: false },
);
const LazyAiExposureReviewCard = dynamic(
  () => import("@/components/recon/AiExposureReviewCard"),
  { ssr: false },
);
const LazyGeocodingPlaygroundCard = dynamic(
  () => import("@/components/recon/GeocodingPlaygroundCard"),
  { ssr: false },
);

type View = "osint" | "pdns" | "headers" | "metadata" | "binary" | "opsec";

const VIEWS: { id: View; label: string }[] = [
  { id: "osint", label: "🔍 OSINT" },
  { id: "pdns", label: "📡 PASSIVE DNS" },
  { id: "headers", label: "🛡 HEADERS" },
  { id: "metadata", label: "📎 METADATA" },
  { id: "binary", label: "🧬 BINARY" },
  { id: "opsec", label: "🔒 OPSEC" },
];

const TARGET_BRIEF_COPY: Record<View, string> = {
  osint:
    "Start broad with passive target lookup before narrowing into infrastructure or artifact-specific recon.",
  pdns: "Use passive DNS when the target is known and historical infrastructure context will change the next move.",
  headers:
    "Use headers audit when web-surface posture matters more than broad discovery.",
  metadata:
    "Use metadata extraction when local files or artifacts can yield context without widening network collection.",
  binary:
    "Stay local-first while preparing reverse-engineering follow-through, then promote durable findings into VAULT only when useful.",
  opsec:
    "Check operator exposure and fingerprint posture before expanding collection if trust boundaries look weak.",
};

export default function ReconPage() {
  const router = useRouter();
  const { normalizedParams } = useSessionHrefAutoHeal();
  const [view, setView] = useState<View>("osint");
  const focus = normalizedParams.get("focus");

  const urlView = useMemo(() => {
    const next = (normalizedParams.get("view") ?? "").toLowerCase();
    return next === "osint" ||
      next === "pdns" ||
      next === "headers" ||
      next === "metadata" ||
      next === "binary" ||
      next === "opsec"
      ? (next as View)
      : null;
  }, [normalizedParams]);

  useEffect(() => {
    if (!urlView) return;
    setView(urlView);
  }, [urlView]);

  const handleViewChange = (nextView: View) => {
    setView(nextView);
    const params = new URLSearchParams(normalizedParams.toString());
    params.set("view", nextView);
    router.replace(`/recon?${params.toString()}`);
  };

  const focusTargetId =
    focus === "recon-lookup"
      ? "recon-lookup"
      : focus === "recon-repo-intel"
        ? "recon-repo-intel"
        : focus === "recon-opsec"
          ? "recon-opsec"
          : focus === "recon-headers"
            ? "recon-headers"
            : focus === "recon-binary"
              ? "recon-binary"
              : null;

  useSurfaceFocusScroll(focusTargetId);

  const targetBriefSpec = getSurfaceModuleSpec("recon", "target-brief");
  const collectionWorkbenchSpec = getSurfaceModuleSpec(
    "recon",
    "collection-workbench",
    view,
  );
  const binaryAnalysisSpec = getSurfaceModuleSpec("recon", "binary-analysis");
  const operatorSafetySpec = getSurfaceModuleSpec("recon", "operator-safety");
  const reconLayout = getOpsLayoutDescriptor("recon");

  if (
    !targetBriefSpec ||
    !collectionWorkbenchSpec ||
    !binaryAnalysisSpec ||
    !operatorSafetySpec
  ) {
    return null;
  }

  return (
    <ShellPage
      width="wide"
      surface="recon"
      eyebrow="Collection sweep"
      title="Collection desk"
      description="OSINT and triage."
      actions={
        <>
          <ShellBadge tone="success">Free by default</ShellBadge>
          <ShellBadge tone="muted">Passive-first tooling</ShellBadge>
        </>
      }
    >
      <ShellStack>
        {focus === "recon-lookup" ? (
          <SurfaceFocusStrip
            title="Focused session: OSINT lookup"
            description="Lookup opens first."
          />
        ) : null}

        {focus === "recon-repo-intel" ? (
          <SurfaceFocusStrip
            title="Focused session: repo intel"
            description="Repo intel opens first."
          />
        ) : null}

        {focus === "recon-opsec" ? (
          <SurfaceFocusStrip
            title="Focused session: OPSEC checks"
            description="OPSEC posture opens first."
          />
        ) : null}

        {focus === "recon-headers" ? (
          <SurfaceFocusStrip
            title="Focused session: headers audit"
            description="Headers findings open first."
          />
        ) : null}

        {focus === "recon-binary" ? (
          <SurfaceFocusStrip
            title="Focused session: binary triage"
            description="Binary triage opens first."
          />
        ) : null}

        <ShellSegmentedTabs
          items={VIEWS}
          active={view}
          onChange={handleViewChange}
          minButtonWidth={130}
        />

        <OpsStrip className="nexus-surface-route-strip">
          <div className="nexus-shell-copy nexus-shell-copy--compact">
            {TARGET_BRIEF_COPY[view]}
          </div>
          <div style={{ marginTop: "14px" }}>
            <LazyBrowserOpsReadinessCard />
          </div>
          <div style={{ marginTop: "14px" }}>
            <OpsField
              title="Caseflow loop"
              detail="Intake → Collect → Pivot → Package"
              tone="muted"
              compact
            >
              <LazyOsintCasefileCard route="/recon" />
            </OpsField>
          </div>
        </OpsStrip>

        {view === "osint" && (
          <div id="recon-lookup" style={{ scrollMarginTop: "120px" }}>
            <div className="nexus-surface-chamber-shell">
              <div className="nexus-surface-chamber-shell__body">
                <OpsWorkplane
                  className={`nexus-surface-chamber-shell__lead ${reconLayout.workplaneClass}`}
                >
                  <OpsField
                    title="OSINT lookup"
                    detail="Domain, IP, email, username, and hash"
                  >
                    <LazyReconLookup />
                  </OpsField>
                </OpsWorkplane>
                <OpsRail
                  className={`nexus-surface-chamber-shell__support ${reconLayout.railClass}`}
                >
                  <TrustOperationsRail
                    title={reconLayout.trustLabel}
                    detail="Connector posture, step-up state, and protected-action cues stay in the collection lane."
                    compact
                  />
                  <OpsField
                    title="AI exposure packs"
                    detail="Passive AI posture review"
                    tone="muted"
                    compact
                  >
                    <LazyAiExposureReviewCard route="/recon" />
                  </OpsField>
                  <details className="nexus-surface-disclosure">
                    <summary>Open repo intel</summary>
                    <div className="nexus-surface-disclosure__body">
                      <OpsField
                        id="recon-repo-intel"
                        title="Repo intel"
                        detail="Public GitHub metadata only"
                        compact
                      >
                        <LazyRepoIntelPanel />
                      </OpsField>
                    </div>
                  </details>
                  <details className="nexus-surface-disclosure">
                    <summary>Open idea link intake</summary>
                    <div className="nexus-surface-disclosure__body">
                      <OpsField
                        title="Idea link intake"
                        detail="Register GitHub/X links for assimilation triage"
                        tone="muted"
                        compact
                      >
                        <LazyIdeaLinkIntakePanel />
                      </OpsField>
                    </div>
                  </details>
                  <details className="nexus-surface-disclosure">
                    <summary>Open geocoding tools</summary>
                    <div className="nexus-surface-disclosure__body">
                      <OpsField
                        title="Coordinate lookup"
                        detail="Bounded place search and reverse geocoding"
                        tone="muted"
                        compact
                      >
                        <LazyGeocodingPlaygroundCard />
                      </OpsField>
                    </div>
                  </details>
                </OpsRail>
              </div>
            </div>
          </div>
        )}

        {view === "pdns" && (
          <OpsWorkplane className={reconLayout.workplaneClass}>
            <OpsField
              title="Passive DNS"
              detail="Historical records and reverse-IP context"
            >
              <LazyPassiveDns />
            </OpsField>
          </OpsWorkplane>
        )}

        {view === "headers" && (
          <div id="recon-headers" style={{ scrollMarginTop: "120px" }}>
            <OpsWorkplane className={reconLayout.workplaneClass}>
              <OpsField
                title="HTTP headers audit"
                detail="Security header posture"
              >
                <LazyHeadersAudit />
              </OpsField>
            </OpsWorkplane>
          </div>
        )}

        {view === "metadata" && (
          <OpsWorkplane className={reconLayout.workplaneClass}>
            <OpsField title="Metadata extractor" detail="Local extraction only">
              <LazyMetadataExtractor />
            </OpsField>
          </OpsWorkplane>
        )}

        {view === "binary" && (
          <div id="recon-binary" style={{ scrollMarginTop: "120px" }}>
            <OpsWorkplane className={reconLayout.workplaneClass}>
              <OpsField
                title="Binary triage"
                detail="Local-only reverse-engineering prep"
              >
                <LazyBinaryTriagePanel />
              </OpsField>
            </OpsWorkplane>
          </div>
        )}

        {view === "opsec" && (
          <div id="recon-opsec" style={{ scrollMarginTop: "120px" }}>
            <OpsRail className={reconLayout.railClass}>
              <OpsField
                title="OPSEC panel"
                detail="Fingerprint and exposure checks"
                tone="muted"
              >
                <LazyOpsecPanel />
              </OpsField>
            </OpsRail>
          </div>
        )}
      </ShellStack>
    </ShellPage>
  );
}
