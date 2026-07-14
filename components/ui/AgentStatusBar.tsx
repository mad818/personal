"use client";

// ── components/ui/AgentStatusBar.tsx ─────────────────────────────────────────
// Persistent floating agent bar — bottom-right of every page.
// Crab reacts to live threat level. Agent rotates based on current route.
// Commentary is template-driven from store data.

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useStore } from "@/store/useStore";
import ClientStyleMount from "@/components/ui/ClientStyleMount";
import { normalizeSurfaceHref } from "@/lib/releaseMatrix";

// ── Pixel palette ─────────────────────────────────────────────────────────────
const P: Record<string, string> = {
  " ": "",
  _: "",
  s: "#e8c49a",
  S: "#c09060",
  e: "#1a1a2e",
  d: "#050607",
  h: "#2c1810",
  H: "#5a3520",
  n: "#1e3a5f",
  N: "#0f1e35",
  t: "#f0f0f0",
  k: "#c0392b",
  p: "#6b2fa0",
  o: "#3d1a5e",
  q: "#1a1a1a",
  r: "#9b2020",
  R: "#c0392b",
  w: "#f5f5f5",
  W: "#c8c8c8",
  l: "#87ceeb",
  c: "#d04020",
  C: "#8a2010",
  y: "#f0c060",
  g: "#10b981",
  x: "#ef4444",
  // CIPHER — teal
  z: "#14b8a6",
  Z: "#0f766e",
  v: "#042f2e",
  // FLUX — gold/amber
  F: "#f59e0b",
  f: "#b45309",
  B: "#292524",
};

const PX = 3;
const AGENT_STATUS_BAR_ANIMATIONS_CSS = `
  @keyframes miniCrabBob {
    from { transform: translateY(0) }
    to   { transform: translateY(-3px) }
  }
  @keyframes miniAgentBob {
    from { transform: translateY(0) }
    to   { transform: translateY(-2px) }
  }
  @keyframes bubbleIn {
    from { opacity: 0; transform: translateY(6px) scale(.96) }
    to   { opacity: 1; transform: translateY(0) scale(1) }
  }
`;

function Sprite({ rows, scale = 1 }: { rows: string[]; scale?: number }) {
  const ps = PX * scale;
  const W = (rows[0]?.length ?? 0) * ps;
  const H = rows.length * ps;
  return (
    <svg
      width={W}
      height={H}
      style={{ imageRendering: "pixelated", display: "block" }}
    >
      {rows.flatMap((row, y) =>
        row
          .split("")
          .map((ch, x) =>
            P[ch] ? (
              <rect
                key={`${x}-${y}`}
                x={x * ps}
                y={y * ps}
                width={ps}
                height={ps}
                fill={P[ch]}
              />
            ) : null,
          ),
      )}
    </svg>
  );
}

// ── Character frames ──────────────────────────────────────────────────────────
const JANSKY_F = [
  [
    " hhhhhh  ",
    " hssssh  ",
    " hseseh  ",
    " hssssh  ",
    "  sssss  ",
    "  ntktn  ",
    " nnnknnn ",
    " nnnknnn ",
    " nnn nn  ",
    " nnn nn  ",
    "  n   n  ",
    "  N   N  ",
    "  d   d  ",
    "         ",
  ],
  [
    " hhhhhh  ",
    " hssssh  ",
    " hseseh  ",
    " hssssh  ",
    "  sssss  ",
    "  ntktn  ",
    " nnnknnn ",
    " nnnknnn ",
    "  nn  n  ",
    "  nn  n  ",
    "  n   n  ",
    "  N   N  ",
    "   d  d  ",
    "         ",
  ],
];
const ORBIT_F = [
  [
    " qpppq   ",
    " qpsspq  ",
    " qpsespq ",
    " qpsssp  ",
    "  pppppp ",
    "pppppppp ",
    "pppppppp ",
    " ppp pp  ",
    " ppp pp  ",
    "  pp pp  ",
    "  o   o  ",
    "  o   o  ",
    "  d   d  ",
    "         ",
  ],
  [
    " qpppq   ",
    " qpsspq  ",
    " qpsespq ",
    " qpsssp  ",
    "  pppppp ",
    "pppppppp ",
    "pppp ppp ",
    "pppp pp  ",
    " ppp pp  ",
    "  pp pp  ",
    "  o   o  ",
    "  o   o  ",
    "  d   d  ",
    "         ",
  ],
];
const NOVA_F = [
  [
    "  rrrrr  ",
    " rrssrr  ",
    " rsleslr ",
    " rssssr  ",
    "  sssss  ",
    "  wwwww  ",
    " wwwwwww ",
    " wwwwwww ",
    " ww  ww  ",
    " ww  ww  ",
    "  w   w  ",
    "  W   W  ",
    "  d   d  ",
    "         ",
  ],
  [
    "  rrrrr  ",
    " rrssrr  ",
    " rsleslr ",
    " rssssr  ",
    "  sssss  ",
    "  wwwww  ",
    " wwwwwww ",
    " wwwwwww ",
    "  ww  ww ",
    " ww  ww  ",
    "  w   w  ",
    "  W   W  ",
    "   d  d  ",
    "         ",
  ],
];
const CIPHER_F = [
  [
    " qzzzzq  ",
    " qzsszzq ",
    " qvvvvsq ",
    " qzsssz  ",
    "  sssss  ",
    "  zZzzz  ",
    " zZzZzzz ",
    " zzZzzzz ",
    " zz  zz  ",
    " zz  zz  ",
    "  z   z  ",
    "  Z   Z  ",
    "  d   d  ",
    "         ",
  ],
  [
    " qzzzzq  ",
    " qzsszzq ",
    " qvvvvsq ",
    " qzsssz  ",
    "  sssss  ",
    "  zZzzz  ",
    " zZzZzzz ",
    " zzZzzzz ",
    "  zz zz  ",
    "  zz zz  ",
    "  z   z  ",
    "  Z   Z  ",
    "   d d   ",
    "         ",
  ],
];
const FLUX_F = [
  [
    "  BBBBB  ",
    " BssssBB ",
    " BsesssB ",
    "  BssssB ",
    "  sssss  ",
    "  FfFFF  ",
    " FFFfFFF ",
    " FFFfFFF ",
    " FF  FF  ",
    " FF  FF  ",
    "  F   F  ",
    "  f   f  ",
    "  d   d  ",
    "         ",
  ],
  [
    "  BBBBB  ",
    " BssssBB ",
    " BsesssB ",
    "  BssssB ",
    "  sssss  ",
    "  FfFFF  ",
    " FFFfFFF ",
    " FFFfFFF ",
    "  FF FF  ",
    "  FF FF  ",
    "  F   F  ",
    "  f   f  ",
    "   d d   ",
    "         ",
  ],
];

// ── Crab sprites ──────────────────────────────────────────────────────────────
const CRAB: Record<string, string[]> = {
  idle: [
    "   cccccc   ",
    "  cccccccc  ",
    " cccyeyccc  ",
    "cccccccccccc",
    "ccCccccccCcc",
    " cccccccccc ",
    "  cc  cc  c ",
    "  c   cc   c",
  ],
  thinking: [
    "c  cccccc   ",
    "cc cccccccc ",
    " cccyeyccc  ",
    "cccccccccccc",
    "ccCccccccCcc",
    " cccccccccc ",
    "  cc  cc    ",
    "   c  cc    ",
  ],
  happy: [
    "c   cccccc c",
    " c cccccc c ",
    "  ccyeyccc  ",
    " cccccccccc ",
    "ccCcgggcgCcc",
    " cccccccccc ",
    "  cc  cc  c ",
    " c c  cc c  ",
  ],
  working: [
    "   cccccc   ",
    "  cccccccc  ",
    "cccyeyccccc ",
    "cccccccccccc",
    "cCccccccccCc",
    " cccccccccc ",
    "cc  cc  cc  ",
    "cc  cc  cc  ",
  ],
  excited: [
    "c  cccccc  c",
    " c cccccc c ",
    "  ccyRyccc  ",
    " cccccccccc ",
    "ccCccgcccCcc",
    " gccccccccg ",
    "  cc  cc    ",
    " c c  cc c  ",
  ],
  error: [
    "   xxxxxx   ",
    "  cccccccc  ",
    " cccxexxcc  ",
    "xxccccccccxx",
    "ccCccccccCcc",
    " cccccccccc ",
    "  cc  cc  c ",
    "  c   cc   c",
  ],
  success: [
    "g  cccccc  g",
    " g cccccc g ",
    "  ccgegccc  ",
    "ccccggggcccc",
    "ccCcggggcCcc",
    " gccccccccg ",
    "  cc  cc  c ",
    " g c  cc g  ",
  ],
};

type Emotion =
  | "idle"
  | "thinking"
  | "happy"
  | "working"
  | "excited"
  | "error"
  | "success";

// ── Route → agent map ─────────────────────────────────────────────────────────
const ROUTE_AGENT: Record<
  string,
  { name: string; color: string; frames: string[][] }
> = {
  "/hq": { name: "JANSKY", color: "#4f6ef7", frames: JANSKY_F },
  "/command": { name: "JANSKY", color: "#4f6ef7", frames: JANSKY_F },
  "/labs/signals": { name: "NOVA", color: "#10b981", frames: NOVA_F },
  "/alpha": { name: "FLUX", color: "#f59e0b", frames: FLUX_F },
  "/labs/ops": { name: "NOVA", color: "#10b981", frames: NOVA_F },
  "/intel": { name: "FLUX", color: "#f59e0b", frames: FLUX_F },
  "/cyber": { name: "CIPHER", color: "#14b8a6", frames: CIPHER_F },
  "/labs/security": { name: "CIPHER", color: "#14b8a6", frames: CIPHER_F },
  "/internal/skills": { name: "ORBIT", color: "#7c3aed", frames: ORBIT_F },
  "/internal/vehicle": { name: "CIPHER", color: "#14b8a6", frames: CIPHER_F },
  "/internal/iot": { name: "NOVA", color: "#10b981", frames: NOVA_F },
  "/vault": { name: "JANSKY", color: "#4f6ef7", frames: JANSKY_F },
};

// ── Commentary templates per route ───────────────────────────────────────────
function buildComment(
  route: string,
  articleCount: number,
  priceCount: number,
  cveCount: number,
  threatLevel: Emotion,
  worldRisk: number,
): string {
  if (threatLevel === "error") return "Data feed offline. Check API keys.";
  if (threatLevel === "working") return "Scanning feeds…";

  const snippets: Record<string, string[]> = {
    "/hq": [
      `${articleCount} articles ingested. Ready.`,
      `Monitoring ${priceCount} assets.`,
      `All systems nominal.`,
    ],
    "/command": [
      `${worldRisk} global risk markers live.`,
      `Monitoring ${priceCount} market signals.`,
      `Operator surface stable.`,
    ],
    "/labs/signals": [
      `${articleCount} signals active. Scanning for anomalies.`,
      `Feed volume: ${articleCount} items. Topic map live.`,
      `Watch for bias clusters.`,
    ],
    "/alpha": [
      `${priceCount} assets in scanner.`,
      `Momentum signals loaded.`,
      `Buy-bot armed. Awaiting trigger.`,
    ],
    "/labs/ops": [
      `${worldRisk} high-risk conflict events.`,
      worldRisk > 5
        ? "Elevated geopolitical tension detected."
        : "Threat posture: stable.",
      `GDELT feed active.`,
    ],
    "/intel": [
      `Polymarket odds loaded.`,
      `Porter, VRIO, BCG ready.`,
      `Running scenario analysis.`,
    ],
    "/cyber": [
      `${cveCount} CVEs indexed. CIPHER on watch.`,
      cveCount > 50
        ? "High patch volume — critical tier needs review."
        : "CVE queue nominal.",
      `OTX threat pulses active. No anomalies.`,
    ],
    "/labs/security": [
      `Perimeter telemetry aligned.`,
      `Security beta surface active.`,
      `Camera and drone posture nominal.`,
    ],
    "/internal/skills": [
      `Learning graph ready.`,
      `Skill workbench internal only.`,
      `Memory surfaces stable.`,
    ],
    "/vault": [
      `Saved articles loaded.`,
      `OSINT archive ready.`,
      `Reviewing saved intelligence.`,
    ],
  };

  const base = route.startsWith("/") ? route : "/hq";
  const pool = snippets[base] ?? snippets["/hq"];
  // rotate comment every 30 s using epoch
  const idx = Math.floor(Date.now() / 30000) % pool.length;
  return pool[idx];
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AgentStatusBar() {
  const pathname = usePathname();
  const articles = useStore((s) => s.articles);
  const prices = useStore((s) => s.prices);
  const cves = useStore(
    (s) => (s as unknown as { cves?: unknown[] }).cves ?? [],
  );
  const worldRisk = useStore((s) => s.worldRisk);

  const [frame, setFrame] = useState(0);
  const [emotion, setEmotion] = useState<Emotion>("idle");
  const [comment, setComment] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [visible, setVisible] = useState(false);
  const mountTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animate on mount with slight delay to avoid hydration flash
  useEffect(() => {
    mountTimer.current = setTimeout(() => setVisible(true), 800);
    return () => {
      if (mountTimer.current) clearTimeout(mountTimer.current);
    };
  }, []);

  // Sprite bob animation
  useEffect(() => {
    const id = setInterval(() => setFrame((f) => (f + 1) % 2), 900);
    return () => clearInterval(id);
  }, []);

  // Crab emotion driven by threat level
  useEffect(() => {
    const criticalCves = Array.isArray(cves)
      ? cves.filter((c: unknown) => {
          const cv = c as { severity?: string };
          return cv.severity === "CRITICAL";
        }).length
      : 0;

    if (worldRisk > 8 || criticalCves > 10) setEmotion("excited");
    else if (worldRisk > 4 || criticalCves > 4) setEmotion("thinking");
    else if (articles.length > 0) setEmotion("happy");
    else setEmotion("idle");
  }, [worldRisk, cves, articles.length]);

  // Rotate comment every 30 s
  useEffect(() => {
    const refresh = () =>
      setComment(
        buildComment(
          normalizeSurfaceHref(pathname),
          articles.length,
          Object.keys(prices).length,
          Array.isArray(cves) ? cves.length : 0,
          emotion,
          worldRisk,
        ),
      );
    refresh();
    const id = setInterval(refresh, 30000);
    return () => clearInterval(id);
  }, [pathname, articles.length, prices, cves, emotion, worldRisk]);

  const route = normalizeSurfaceHref(pathname);
  const agentCfg = ROUTE_AGENT[route] ?? ROUTE_AGENT["/hq"];

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "16px",
        right: "16px",
        zIndex: 200,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: "6px",
        pointerEvents: "none",
      }}
    >
      {/* Comment bubble — appears when expanded */}
      {expanded && (
        <div
          style={{
            background: "var(--surf)",
            border: `1px solid ${agentCfg.color}44`,
            borderRadius: "10px",
            padding: "10px 12px",
            maxWidth: "220px",
            fontSize: "11px",
            color: "var(--text2)",
            lineHeight: 1.5,
            boxShadow: `0 4px 20px rgba(0,0,0,.5)`,
            pointerEvents: "auto",
            animation: "bubbleIn .18s ease",
          }}
        >
          <span
            style={{ color: agentCfg.color, fontWeight: 800, fontSize: "10px" }}
          >
            {agentCfg.name}
          </span>
          <br />
          {comment}
        </div>
      )}

      {/* Agent + crab widget */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-label={`${expanded ? "Hide" : "Show"} ${agentCfg.name} status message`}
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: "4px",
          background: "var(--surf)",
          border: `1px solid ${agentCfg.color}33`,
          borderRadius: "12px",
          padding: "8px 10px",
          cursor: "pointer",
          pointerEvents: "auto",
          boxShadow: `0 4px 24px rgba(0,0,0,.45), 0 0 12px ${agentCfg.color}22`,
          transition: "box-shadow .2s",
          userSelect: "none",
          color: "inherit",
          font: "inherit",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.boxShadow =
            `0 4px 28px rgba(0,0,0,.55), 0 0 18px ${agentCfg.color}44`;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.boxShadow =
            `0 4px 24px rgba(0,0,0,.45), 0 0 12px ${agentCfg.color}22`;
        }}
      >
        {/* Crab */}
        <div
          style={{
            animation:
              emotion === "working" || emotion === "excited"
                ? "miniCrabBob .6s ease-in-out infinite alternate"
                : "none",
          }}
        >
          <Sprite rows={CRAB[emotion]} scale={0.75} />
        </div>

        {/* Agent sprite */}
        <div
          style={{
            animation: "miniAgentBob 1.8s ease-in-out infinite alternate",
          }}
        >
          <Sprite rows={agentCfg.frames[frame]} scale={0.75} />
        </div>

        {/* Status dot */}
        <div
          style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: agentCfg.color,
            boxShadow: `0 0 6px ${agentCfg.color}`,
            alignSelf: "center",
            marginLeft: "2px",
            flexShrink: 0,
          }}
        />
      </button>

      <ClientStyleMount
        id="agent-status-bar-animations"
        cssText={AGENT_STATUS_BAR_ANIMATIONS_CSS}
      />
    </div>
  );
}
