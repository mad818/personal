// ── components/recon/OpsecPanel ─────────────────────────────
// Browser OPSEC check: HTTPS context, fingerprint entropy, WebRTC leak, Tor.
// WebRTC contacts Google STUN. Tor status stays unknown without a safe client proxy.

"use client";

import { useState, useCallback } from "react";

interface Check {
  id: string;
  label: string;
  result: "idle" | "checking" | "ok" | "warn" | "unknown";
  note: string;
}

interface WebRtcProbeResult {
  verified: boolean;
  leakIp: string | null;
}

function calcEntropy(): number {
  let bits = 0;
  try {
    bits += Math.log2(screen.width * screen.height + 1);
    bits += Math.log2(screen.colorDepth + 1);
    bits += Math.log2(Math.abs(new Date().getTimezoneOffset()) + 1);
    bits +=
      Math.log2(
        (
          (navigator.languages as string[] | undefined) ?? [
            navigator.language ?? "",
          ]
        ).length + 1,
      ) + 2;
    bits += 2;
    bits += Math.log2((navigator.hardwareConcurrency ?? 1) + 1);
    // deviceMemory is not in the standard TS lib but is a real browser property
    bits += Math.log2(
      ((navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 1) +
        1,
    );
    bits += Math.log2((navigator.userAgent ?? "").length + 1) * 0.6;
  } catch (_) {}
  return bits;
}

function probeWebRTC(): Promise<WebRtcProbeResult> {
  return new Promise((resolve) => {
    try {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      const found = new Set<string>();
      let resolved = false;
      const cleanup = () => {
        try {
          pc.close();
        } catch (_) {}
      };
      pc.createDataChannel("");
      pc.createOffer()
        .then((o) => pc.setLocalDescription(o))
        .catch(() => {
          resolved = true;
          cleanup();
          resolve({ verified: false, leakIp: null });
        });
      pc.onicecandidate = (e) => {
        if (!e?.candidate) {
          if (!resolved) {
            resolved = true;
            cleanup();
            resolve({
              verified: true,
              leakIp: found.size > 0 ? Array.from(found)[0] : null,
            });
          }
          return;
        }
        const m = /(\d+\.\d+\.\d+\.\d+)/.exec(e.candidate.candidate ?? "");
        if (m) found.add(m[1]);
      };
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          cleanup();
          resolve({
            verified: found.size > 0,
            leakIp: found.size > 0 ? Array.from(found)[0] : null,
          });
        }
      }, 3000);
    } catch (_) {
      resolve({ verified: false, leakIp: null });
    }
  });
}

const INIT_CHECKS: Check[] = [
  { id: "https", label: "HTTPS context", result: "idle", note: "" },
  { id: "fp", label: "Fingerprint entropy", result: "idle", note: "" },
  { id: "webrtc", label: "WebRTC IP leak", result: "idle", note: "" },
  { id: "tor", label: "Tor / exit node", result: "idle", note: "" },
];

function DotIcon({ result }: { result: Check["result"] }) {
  const col =
    result === "ok"
      ? "#10b981"
      : result === "warn"
        ? "#ef4444"
        : result === "unknown"
          ? "#7ba7d4"
        : result === "checking"
          ? "#f59e0b"
          : "var(--text3)";
  return (
    <span
      style={{
        display: "inline-block",
        width: "8px",
        height: "8px",
        borderRadius: "50%",
        background: col,
        boxShadow: result !== "idle" ? `0 0 6px ${col}` : "none",
        flexShrink: 0,
        marginTop: "1px",
      }}
    />
  );
}

export default function OpsecPanel() {
  const [checks, setChecks] = useState<Check[]>(INIT_CHECKS);
  const [score, setScore] = useState<number | null>(null);
  const [running, setRunning] = useState(false);

  const updateCheck = useCallback((id: string, patch: Partial<Check>) => {
    setChecks((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    );
  }, []);

  async function runCheck() {
    setRunning(true);
    setScore(null);
    setChecks(INIT_CHECKS.map((c) => ({ ...c, result: "checking" })));

    let s = 0;

    // 1 — HTTPS (30 pts)
    const isHttps =
      location.protocol === "https:" || location.hostname === "localhost";
    updateCheck("https", {
      result: isHttps ? "ok" : "warn",
      note: isHttps
        ? "Served over HTTPS"
        : "Not on HTTPS — keys exposed to network",
    });
    if (isHttps) s += 30;

    // 2 — Fingerprint entropy (30 pts)
    const entropy = calcEntropy();
    const lowEnt = entropy < 12;
    updateCheck("fp", {
      result: lowEnt ? "ok" : "warn",
      note: `Entropy ≈ ${entropy.toFixed(1)} bits${lowEnt ? " (low — good)" : " (high — more fingerprintable)"}`,
    });
    if (lowEnt) s += 30;

    // 3 — WebRTC (20 pts)
    const webRtcProbe = await probeWebRTC();
    updateCheck("webrtc", {
      result: !webRtcProbe.verified
        ? "unknown"
        : webRtcProbe.leakIp
          ? "warn"
          : "ok",
      note: !webRtcProbe.verified
        ? "WebRTC status unknown — the STUN probe did not complete"
        : webRtcProbe.leakIp
          ? `Leaks local IP: ${webRtcProbe.leakIp}`
          : "No WebRTC IP leak detected",
    });
    if (webRtcProbe.verified && !webRtcProbe.leakIp) s += 20;

    // 4 — Tor (informational; excluded from the score)
    updateCheck("tor", {
      result: "unknown",
      note: "Tor status not queried — Nexus does not send your browser IP to Tor Project",
    });

    setScore(Math.round((s / 80) * 100));
    setRunning(false);
  }

  const label =
    score === null
      ? "—"
      : score >= 90
        ? "Strong OPSEC"
        : score >= 60
          ? "Moderate OPSEC"
          : score >= 30
            ? "Weak OPSEC"
            : "Poor OPSEC";

  const scoreCol =
    score === null
      ? "var(--text3)"
      : score >= 90
        ? "#10b981"
        : score >= 60
          ? "#f59e0b"
          : "#ef4444";

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "12px",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "12px",
              fontWeight: 700,
              color: "var(--text)",
              fontFamily: "monospace",
            }}
          >
            OPSEC Score:{" "}
            <span style={{ color: scoreCol, fontSize: "18px" }}>
              {score ?? "—"}
            </span>
            {score !== null && (
              <span
                style={{
                  fontSize: "11px",
                  color: "var(--text3)",
                  marginLeft: "6px",
                }}
              >
                {label}
              </span>
            )}
          </div>
          <div
            style={{
              fontSize: "10px",
              color: "var(--text3)",
              marginTop: "2px",
            }}
          >
            Runs in this browser. WebRTC contacts Google STUN; Tor status is not sent to Tor Project.
          </div>
        </div>
        <button
          onClick={() => void runCheck()}
          disabled={running}
          style={{
            padding: "7px 16px",
            borderRadius: "8px",
            border: "none",
            background: running ? "var(--surf3)" : "var(--accent)",
            color: "#fff",
            fontWeight: 700,
            fontSize: "12px",
            cursor: running ? "not-allowed" : "pointer",
          }}
        >
          {running ? "Checking…" : "🔒 Run OPSEC Check"}
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {checks.map((c) => (
          <div
            key={c.id}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              background: "var(--surf2)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "10px 12px",
            }}
          >
            <DotIcon result={c.result} />
            <div>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "var(--text)",
                }}
              >
                {c.label}
              </div>
              {c.note && (
                <div
                  style={{
                    fontSize: "11px",
                    color: "var(--text3)",
                    marginTop: "2px",
                  }}
                >
                  {c.note}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
