// ── components/cyber/CVEFeed ───────────────────────────────
// National Vulnerability Database feed with search and severity filters.

"use client";

import { memo } from "react";
import { useStore } from "@/store/useStore";

import type { CVE } from "@/hooks/useCVEs";

const SEV_COLOR: Record<string, string> = {
  CRITICAL: "#ef4444",
  HIGH: "#f59e0b",
  MEDIUM: "#818cf8",
  LOW: "#10b981",
  NONE: "#6b7280",
};

// ── Kill chain stage detection (exploitation-course pattern) ──────────────────
type KillChainStage =
  | "Reconnaissance"
  | "Initial Access"
  | "Execution"
  | "Privilege Escalation"
  | "Lateral Movement"
  | "Persistence"
  | "Exfiltration"
  | "Denial of Service";

const STAGE_PATTERNS: [KillChainStage, RegExp][] = [
  [
    "Denial of Service",
    /denial.of.service|dos\b|resource exhaustion|memory leak|crash|hang|infinite loop/i,
  ],
  [
    "Exfiltration",
    /data leak|exfiltrat|sensitive.*data|credential.*leak|password.*expos/i,
  ],
  ["Persistence", /backdoor|persist|cron|startup|registry|scheduled task/i],
  [
    "Lateral Movement",
    /ssrf|server-side request|open redirect|credential|token hijack|session fixat/i,
  ],
  [
    "Privilege Escalation",
    /privilege escalat|elevation|local privilege|escalat.*privil|\broot\b|arbitrary.*admin/i,
  ],
  [
    "Execution",
    /remote code exec|command injection|arbitrary code|eval.*inject|shell.*inject/i,
  ],
  [
    "Initial Access",
    /authentication bypass|unauthenticated|sql injection|xss|cross-site|file upload|deserialization|buffer overflow/i,
  ],
  [
    "Reconnaissance",
    /information disclosure|path traversal|directory listing|enumerat|version disclosure/i,
  ],
];

const STAGE_COLOR: Record<KillChainStage, string> = {
  Reconnaissance: "#818cf8",
  "Initial Access": "#ef4444",
  Execution: "#dc2626",
  "Privilege Escalation": "#f97316",
  "Lateral Movement": "#f59e0b",
  Persistence: "#a78bfa",
  Exfiltration: "#ec4899",
  "Denial of Service": "#6b7280",
};

function detectStage(description: string): KillChainStage | null {
  for (const [stage, re] of STAGE_PATTERNS) {
    if (re.test(description)) return stage;
  }
  return null;
}

function KillChainBadge({ stage }: { stage: KillChainStage }) {
  const col = STAGE_COLOR[stage];
  return (
    <span
      style={{
        fontSize: "9px",
        fontWeight: 700,
        padding: "1px 6px",
        borderRadius: "4px",
        background: `${col}22`,
        color: col,
        whiteSpace: "nowrap",
      }}
    >
      ⚡ {stage}
    </span>
  );
}

/** CVSS score bar: 0–10 scale, colour shifts from green → amber → red */
function CVSSBar({ score, severity }: { score: number; severity: string }) {
  const pct = Math.min(100, (score / 10) * 100);
  const col = SEV_COLOR[severity] ?? "#6b7280";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        marginTop: "6px",
      }}
    >
      <span
        style={{
          fontSize: "9px",
          color: "var(--text3)",
          fontWeight: 700,
          minWidth: "28px",
        }}
      >
        CVSS
      </span>
      <div
        style={{
          flex: 1,
          height: "4px",
          background: "var(--surf3)",
          borderRadius: "2px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: col,
            borderRadius: "2px",
            transition: "width .4s",
          }}
        />
      </div>
      <span
        style={{
          fontSize: "10px",
          fontWeight: 700,
          fontFamily: "monospace",
          color: col,
          minWidth: "22px",
          textAlign: "right",
        }}
      >
        {score.toFixed(1)}
      </span>
    </div>
  );
}

export default function CVEFeed() {
  const cves = useStore((s) => s.cves) as CVE[];
  const cvesLoaded = useStore((s) => s.cvesLoaded);
  const cveFetchError = useStore((s) => s.cveFetchError);

  if (cveFetchError && !cves.length) {
    return (
      <div
        style={{
          padding: "40px",
          textAlign: "center",
          color: "var(--text3)",
          fontSize: "13px",
        }}
      >
        <div style={{ fontSize: "32px", marginBottom: "10px" }}>🔒</div>
        <div style={{ color: "var(--flo)", marginBottom: "8px" }}>
          {cveFetchError}
        </div>
        <div style={{ fontSize: "11px", color: "var(--text3)" }}>
          Check network access or add an NVD API key in Settings, then refresh
          CYBER.
        </div>
      </div>
    );
  }

  if (!cves.length && !cvesLoaded)
    return (
      <div
        style={{
          padding: "60px",
          textAlign: "center",
          color: "var(--text3)",
          fontSize: "13px",
        }}
      >
        <div style={{ fontSize: "32px", marginBottom: "10px" }}>🔒</div>
        <div>Fetching CVEs from NVD…</div>
        <div
          style={{ fontSize: "11px", marginTop: "6px", color: "var(--text3)" }}
        >
          Free tier takes ~30–45s. Add an NVD API key in Settings to speed this
          up.
        </div>
      </div>
    );

  if (!cves.length && cvesLoaded)
    return (
      <div
        style={{
          padding: "60px",
          textAlign: "center",
          color: "var(--text3)",
          fontSize: "13px",
        }}
      >
        <div style={{ fontSize: "32px", marginBottom: "10px" }}>🔒</div>
        NVD returned no results — try refreshing. Add an NVD API key in Settings
        for better rate limits.
      </div>
    );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {cveFetchError ? (
        <div
          role="alert"
          style={{ fontSize: "11px", color: "var(--flo)", lineHeight: 1.5 }}
        >
          {cveFetchError}
        </div>
      ) : null}
      {cves.map((c) => (
        <CVECard key={c.id} cve={c} />
      ))}
    </div>
  );
}

/** Memoized individual CVE card — only re-renders when its specific CVE object changes. */
const CVECard = memo(function CVECard({ cve: c }: { cve: CVE }) {
  const stage = detectStage(c.description ?? "");
  return (
    <a
      href={c.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "block",
        background: "var(--surf2)",
        border: "1px solid var(--border)",
        borderRadius: "10px",
        padding: "12px 14px",
        textDecoration: "none",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "6px",
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontSize: "11.5px",
            fontWeight: 800,
            fontFamily: "monospace",
            color: "var(--accent)",
          }}
        >
          {c.id}
        </span>
        <span
          style={{
            fontSize: "10px",
            fontWeight: 700,
            padding: "1px 7px",
            borderRadius: "8px",
            background: `${SEV_COLOR[c.severity] ?? "#6b7280"}22`,
            color: SEV_COLOR[c.severity] ?? "var(--text3)",
          }}
        >
          {c.severity} {c.score ? `· ${c.score}` : ""}
        </span>
        {stage && <KillChainBadge stage={stage} />}
        <span
          style={{
            fontSize: "10px",
            color: "var(--text3)",
            marginLeft: "auto",
          }}
        >
          {c.published ? new Date(c.published).toLocaleDateString() : ""}
        </span>
      </div>
      <div
        style={{ fontSize: "12.5px", color: "var(--text2)", lineHeight: 1.5 }}
      >
        {c.description?.slice(0, 200)}
        {(c.description?.length ?? 0) > 200 ? "…" : ""}
      </div>
      {c.score > 0 && <CVSSBar score={c.score} severity={c.severity} />}
    </a>
  );
});
