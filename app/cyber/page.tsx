// ── cyber/page ──────────────────────────────────────────────
// CYBER tab: triage, heatmaps, CVEs, OTX, and CISA KEV feeds.

"use client";

import { useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { CVEsLoader, OTXLoader } from "@/components/ui/DataLoader";
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

type CyberView = "triage" | "matrix" | "cves" | "otx" | "cisa";
const VIEWS: Array<{ id: CyberView; label: string }> = [
  { id: "triage", label: "🧠 TRIAGE" },
  { id: "matrix", label: "📊 MATRIX" },
  { id: "cves", label: "⚠️ CVES" },
  { id: "otx", label: "🛰 OTX" },
  { id: "cisa", label: "🏛 CISA KEV" },
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
const LazyTriageView = dynamic(() => import("@/components/cyber/TriageView"), {
  ssr: false,
});
const LazyCyberArticleHeatmap = dynamic(
  () => import("@/components/cyber/CyberArticleHeatmap"),
  { ssr: false },
);

export default function CyberPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const view = useStore((s) => s.cyberView) ?? "triage";
  const setView = useStore((s) => s.setCyberView);

  const urlView = useMemo(() => {
    const v = (searchParams?.get("view") ?? "").toLowerCase();
    return (
      ["triage", "matrix", "cves", "otx", "cisa"] as CyberView[]
    ).includes(v as CyberView)
      ? (v as CyberView)
      : null;
  }, [searchParams]);

  useEffect(() => {
    if (!urlView) return;
    setView(urlView);
  }, [urlView, setView]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if ((params.get("view") ?? "").toLowerCase() === view) return;
    params.set("view", view);
    router.replace(`/cyber?${params.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  return (
    <ShellPage
      width="wide"
      eyebrow="Threat monitoring"
      title="CYBER"
      description="Triage vulnerabilities, correlate threat feeds, and monitor exposed posture with cleaner operational hierarchy."
      actions={
        <>
          <ShellBadge tone="accent">Read-only intelligence</ShellBadge>
          <ShellBadge tone="muted">OTX optional</ShellBadge>
        </>
      }
    >
      <CVEsLoader />
      <OTXLoader />

      <ShellStack>
        <ShellSegmentedTabs items={VIEWS} active={view} onChange={setView} minButtonWidth={120} />

        {view === "triage" && (
          <ShellGrid columns="minmax(0, 1.1fr) minmax(320px, 0.9fr)" align="start">
            <ShellPanel>
              <SectionLabel detail="Priority queue and action framing">Triage view</SectionLabel>
              <LazyTriageView />
            </ShellPanel>
            <ShellPanel tone="muted">
              <SectionLabel detail="Signal clustering">Threat intelligence signals</SectionLabel>
              <LazyCyberArticleHeatmap />
            </ShellPanel>
          </ShellGrid>
        )}

        {view === "matrix" && (
          <ShellPanel>
            <SectionLabel detail="Severity correlation across CVE and OTX">
              Severity matrix
            </SectionLabel>
            <LazyCyberHeatmap />
          </ShellPanel>
        )}

        {view === "cves" && (
          <ShellPanel>
            <SectionLabel detail="Raw NVD feed">CVE feed</SectionLabel>
            <LazyCVEFeed />
          </ShellPanel>
        )}

        {view === "otx" && (
          <ShellPanel>
            <SectionLabel detail="AlienVault pulses">OTX feed</SectionLabel>
            <LazyOTXFeed />
          </ShellPanel>
        )}

        {view === "cisa" && (
          <ShellPanel>
            <SectionLabel detail="Known exploited vulnerabilities">CISA KEV</SectionLabel>
            <LazyCISAFeed />
          </ShellPanel>
        )}
      </ShellStack>
    </ShellPage>
  );
}
