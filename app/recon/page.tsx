// ── recon/page ──────────────────────────────────────────────
// RECON tab: free-first OSINT lookup, passive DNS, metadata, and OPSEC.

"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import SurfaceModuleCard from "@/components/ui/SurfaceModuleCard";
import SurfaceModuleSection from "@/components/ui/SurfaceModuleSection";
import {
  ShellBadge,
  ShellPage,
  ShellSegmentedTabs,
  ShellStack,
} from "@/components/ui/shell";
import SurfaceFocusStrip from "@/components/ui/SurfaceFocusStrip";
import { useSessionHrefAutoHeal } from "@/hooks/useSessionHrefAutoHeal";
import { useSurfaceFocusScroll } from "@/hooks/useSurfaceFocusScroll";
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
  pdns:
    "Use passive DNS when the target is known and historical infrastructure context will change the next move.",
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
      : focus === "recon-opsec"
        ? "recon-opsec"
        : focus === "recon-headers"
          ? "recon-headers"
          : focus === "recon-binary"
            ? "recon-binary"
          : null;

  useSurfaceFocusScroll(focusTargetId);

  const targetBriefSpec = getSurfaceModuleSpec("recon", "target-brief");
  const collectionWorkbenchSpec = getSurfaceModuleSpec("recon", "collection-workbench", view);
  const binaryAnalysisSpec = getSurfaceModuleSpec("recon", "binary-analysis");
  const operatorSafetySpec = getSurfaceModuleSpec("recon", "operator-safety");

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
      eyebrow="Triangulation sweep"
      title="PARALLAX"
      description="Free-first reconnaissance for domains, usernames, headers, metadata, and OPSEC checks without forcing paid connectors."
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
            description="You landed on RECON with the OSINT lookup lane in focus so boundary posture, degraded handling, and target-led investigation can start immediately."
          />
        ) : null}

        {focus === "recon-opsec" ? (
          <SurfaceFocusStrip
            title="Focused session: OPSEC checks"
            description="You landed on RECON with the OPSEC lane in focus so Tor posture, exposure checks, and trust boundaries are visible before wider triage."
          />
        ) : null}

        {focus === "recon-headers" ? (
          <SurfaceFocusStrip
            title="Focused session: headers audit"
            description="You landed on RECON with the headers audit lane in focus so retained local results, rerun posture, and security-header findings are easier to inspect."
          />
        ) : null}

        {focus === "recon-binary" ? (
          <SurfaceFocusStrip
            title="Focused session: binary triage"
            description="You landed on RECON with local binary triage in focus so reverse-engineering prep, hashes, strings, and IOC hints are available before deeper tooling."
          />
        ) : null}

        <ShellSegmentedTabs
          items={VIEWS}
          active={view}
          onChange={handleViewChange}
          minButtonWidth={130}
        />

        <SurfaceModuleCard spec={targetBriefSpec} tone="muted" compact>
          <div className="nexus-shell-copy nexus-shell-copy--compact">
            {TARGET_BRIEF_COPY[view]}
          </div>
          <div style={{ marginTop: "14px" }}>
            <LazyBrowserOpsReadinessCard />
          </div>
          <div style={{ marginTop: "14px" }}>
            <SurfaceModuleSection
              title="Caseflow loop"
              detail="Intake → Collect → Pivot → Package"
              tone="muted"
              compact
            >
              <LazyOsintCasefileCard route="/recon" />
            </SurfaceModuleSection>
          </div>
        </SurfaceModuleCard>

        {view === "osint" && (
          <div id="recon-lookup" style={{ scrollMarginTop: "120px" }}>
            <SurfaceModuleCard spec={collectionWorkbenchSpec} tone="hero">
              <SurfaceModuleSection title="OSINT lookup" detail="Domain, IP, email, username, and hash">
                <LazyReconLookup />
              </SurfaceModuleSection>
            </SurfaceModuleCard>
          </div>
        )}

        {view === "pdns" && (
          <SurfaceModuleCard spec={collectionWorkbenchSpec}>
            <SurfaceModuleSection title="Passive DNS" detail="Historical records and reverse-IP context">
              <LazyPassiveDns />
            </SurfaceModuleSection>
          </SurfaceModuleCard>
        )}

        {view === "headers" && (
          <div id="recon-headers" style={{ scrollMarginTop: "120px" }}>
            <SurfaceModuleCard spec={collectionWorkbenchSpec}>
              <SurfaceModuleSection title="HTTP headers audit" detail="Security header posture">
                <LazyHeadersAudit />
              </SurfaceModuleSection>
            </SurfaceModuleCard>
          </div>
        )}

        {view === "metadata" && (
          <SurfaceModuleCard spec={collectionWorkbenchSpec}>
            <SurfaceModuleSection title="Metadata extractor" detail="Local extraction only">
              <LazyMetadataExtractor />
            </SurfaceModuleSection>
          </SurfaceModuleCard>
        )}

        {view === "binary" && (
          <div id="recon-binary" style={{ scrollMarginTop: "120px" }}>
            <SurfaceModuleCard spec={binaryAnalysisSpec} tone="hero">
              <SurfaceModuleSection title="Binary triage" detail="Local-only reverse-engineering prep">
                <LazyBinaryTriagePanel />
              </SurfaceModuleSection>
            </SurfaceModuleCard>
          </div>
        )}

        {view === "opsec" && (
          <div id="recon-opsec" style={{ scrollMarginTop: "120px" }}>
            <SurfaceModuleCard spec={operatorSafetySpec} tone="muted">
              <SurfaceModuleSection title="OPSEC panel" detail="Fingerprint and exposure checks" tone="muted">
                <LazyOpsecPanel />
              </SurfaceModuleSection>
            </SurfaceModuleCard>
          </div>
        )}
      </ShellStack>
    </ShellPage>
  );
}
