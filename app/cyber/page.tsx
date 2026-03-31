// ── cyber/page ──────────────────────────────────────────────
// CYBER tab: CVEs, OTX threat intel, CISA advisories, attack vectors.

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { CVEsLoader, OTXLoader } from "@/components/ui/DataLoader";
import { useStore } from "@/store/useStore";

type CyberView = "triage" | "matrix" | "cves" | "otx" | "cisa";
const VIEWS: Array<{ id: CyberView; label: string }> = [
  { id: "triage", label: "🧠 TRIAGE" },
  { id: "matrix", label: "📊 MATRIX" },
  { id: "cves", label: "⚠️ CVES" },
  { id: "otx", label: "🛰 OTX" },
  { id: "cisa", label: "🏛 CISA KEV" },
];

// Lazy-load heavy panels so only active view mounts.
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

function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: "8px" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          width: "100%",
          background: "var(--surf2)",
          border: "1px solid var(--border)",
          borderRadius: open ? "8px 8px 0 0" : "8px",
          padding: "9px 14px",
          cursor: "pointer",
          textAlign: "left",
          transition: "border-radius .15s",
        }}
      >
        <span
          style={{
            fontSize: "9px",
            color: "var(--text3)",
            transition: "transform .15s",
            display: "inline-block",
            transform: open ? "rotate(90deg)" : "none",
          }}
        >
          ▶
        </span>
        <span
          style={{
            fontSize: "11px",
            fontWeight: 700,
            color: "var(--text3)",
            letterSpacing: ".08em",
            textTransform: "uppercase",
          }}
        >
          {title}
        </span>
      </button>
      {open && (
        <div
          style={{
            padding: "16px",
            background: "var(--surf2)",
            border: "1px solid var(--border)",
            borderTop: "none",
            borderRadius: "0 0 8px 8px",
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

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
    <div
      style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "18px 16px 80px",
        position: "relative",
        zIndex: 5,
      }}
    >
      <CVEsLoader />
      <OTXLoader />

      <div style={{ fontSize: "18px", fontWeight: 900 }}>🔒 CYBER</div>
      <div
        style={{
          fontSize: "12px",
          color: "var(--text2)",
          marginTop: "2px",
          marginBottom: "20px",
        }}
      >
        CVE vulnerabilities · CISA KEV catalog · OTX threat pulses · Adversary
        intelligence
      </div>

      {/* ── Sub-tabs ── */}
      <div
        style={{
          display: "flex",
          gap: "4px",
          marginBottom: "16px",
          background: "var(--surf2)",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          padding: "3px",
          flexWrap: "wrap",
          position: "relative",
          zIndex: 2001,
          pointerEvents: "auto",
        }}
      >
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            onPointerDown={() => setView(v.id)}
            style={{
              flex: "1 1 140px",
              padding: "6px 8px",
              borderRadius: "6px",
              border: "none",
              cursor: "pointer",
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "0.3px",
              transition: "all .15s",
              background: view === v.id ? "var(--accent)" : "transparent",
              color: view === v.id ? "#fff" : "var(--text2)",
              minWidth: 120,
            }}
            aria-pressed={view === v.id}
          >
            {v.label}
          </button>
        ))}
      </div>
      {view === "triage" && (
        <div>
          <LazyTriageView />
          <div style={{ marginTop: "24px" }}>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "var(--text3)",
                letterSpacing: ".08em",
                textTransform: "uppercase",
                marginBottom: "12px",
              }}
            >
              Threat Intelligence Signals
            </div>
            <LazyCyberArticleHeatmap />
          </div>
        </div>
      )}

      {view === "matrix" && (
        <div style={{ marginBottom: "24px" }}>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: "var(--text3)",
              letterSpacing: ".08em",
              textTransform: "uppercase",
              marginBottom: "12px",
            }}
          >
            CVE + OTX Severity Matrix
          </div>
          <LazyCyberHeatmap />
        </div>
      )}

      {view === "cves" && (
        <CollapsibleSection
          title="NVD Vulnerabilities (Raw CVE Feed)"
          defaultOpen
        >
          <LazyCVEFeed />
        </CollapsibleSection>
      )}

      {view === "otx" && (
        <CollapsibleSection title="AlienVault OTX — Threat Pulses" defaultOpen>
          <LazyOTXFeed />
        </CollapsibleSection>
      )}

      {view === "cisa" && (
        <CollapsibleSection
          title="CISA Known Exploited Vulnerabilities (KEV)"
          defaultOpen
        >
          <LazyCISAFeed />
        </CollapsibleSection>
      )}
    </div>
  );
}
