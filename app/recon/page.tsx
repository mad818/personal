// ── recon/page ──────────────────────────────────────────────
// RECON tab: free-first OSINT lookup, passive DNS, metadata, and OPSEC.

"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import {
  SectionLabel,
  ShellBadge,
  ShellPage,
  ShellPanel,
  ShellSegmentedTabs,
  ShellStack,
} from "@/components/ui/shell";

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

type View = "osint" | "pdns" | "headers" | "metadata" | "opsec";

const VIEWS: { id: View; label: string }[] = [
  { id: "osint", label: "🔍 OSINT" },
  { id: "pdns", label: "📡 PASSIVE DNS" },
  { id: "headers", label: "🛡 HEADERS" },
  { id: "metadata", label: "📎 METADATA" },
  { id: "opsec", label: "🔒 OPSEC" },
];

export default function ReconPage() {
  const [view, setView] = useState<View>("osint");

  return (
    <ShellPage
      width="wide"
      surface="recon"
      eyebrow="Privacy-first reconnaissance"
      title="RECON"
      description="Free-first OSINT workflows for domains, usernames, headers, metadata, and OPSEC checks without forcing paid connectors."
      actions={
        <>
          <ShellBadge tone="success">Free by default</ShellBadge>
          <ShellBadge tone="muted">BYOK optional</ShellBadge>
        </>
      }
    >
      <ShellStack>
        <ShellSegmentedTabs items={VIEWS} active={view} onChange={setView} minButtonWidth={130} />

        {view === "osint" && (
          <ShellPanel>
            <SectionLabel detail="Domain, IP, email, username, hash">
              OSINT lookup
            </SectionLabel>
            <LazyReconLookup />
          </ShellPanel>
        )}

        {view === "pdns" && (
          <ShellPanel>
            <SectionLabel detail="Historical records and reverse IP context">
              Passive DNS
            </SectionLabel>
            <LazyPassiveDns />
          </ShellPanel>
        )}

        {view === "headers" && (
          <ShellPanel>
            <SectionLabel detail="Security header posture">HTTP headers audit</SectionLabel>
            <LazyHeadersAudit />
          </ShellPanel>
        )}

        {view === "metadata" && (
          <ShellPanel>
            <SectionLabel detail="Local extraction only">Metadata extractor</SectionLabel>
            <LazyMetadataExtractor />
          </ShellPanel>
        )}

        {view === "opsec" && (
          <ShellPanel>
            <SectionLabel detail="Fingerprint and exposure checks">OPSEC panel</SectionLabel>
            <LazyOpsecPanel />
          </ShellPanel>
        )}
      </ShellStack>
    </ShellPage>
  );
}
