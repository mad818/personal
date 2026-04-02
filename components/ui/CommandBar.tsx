"use client";

// ── CommandBar.tsx ─────────────────────────────────────────────────────────────
// Persistent floating command dock — visible on every page.
// Collapsed: mini agent row + crab + CMD toggle.
// Expanded: live feed strip + chat messages + input.
//
// Fixes applied (2026-03-21):
//  - Sprite scale 0.42→0.7 (was 1.26px/unit, now 2.1px/unit — actually visible)
//  - Crab scale 0.5→0.65 (proportional to agents)
//  - Single-column panel layout replacing cramped 160px two-column split
//  - Panel width 340→380px
//  - Message truncation 120→280 chars with expand button
//  - Activity log auto-scroll (activityLogRef — was missing a ref entirely)
//  - Duty agent: tint only, no bob unless ACTUALLY running a task
//  - Escape key closes panel
//  - Close (✕) button in panel header
//  - ROUTE_AGENT now includes '/' (root)
//  - useStore called with selectors (not full-store subscription)
//  - Live step status line shown during agent execution
//  - Input routing label shows which agent will handle the current input
//  - Conversation history (last 3 exchanges) passed to runAgent
//  - Hydration delay 1000→150ms
//  - maxIterations bumped to 10 for code editing tasks

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { usePathname } from "next/navigation";
import { useStore } from "@/store/useStore";
import { buildSystemPrompt } from "@/lib/ai";
import { runAgent, type AgentStep } from "@/lib/agent";
import { normalizeSurfaceHref } from "@/lib/releaseMatrix";
import type { OperationalPhase } from "@/store/useStore";

// ── Palette (mirrors AgentOffice) ─────────────────────────────────────────────
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
  w: "#7ba7d4",
  W: "#4a6fa5",
  l: "#87ceeb",
  c: "#d04020",
  C: "#8a2010",
  y: "#f0c060",
  g: "#10b981",
  x: "#ef4444",
  z: "#14b8a6",
  Z: "#0f766e",
  v: "#042f2e",
  F: "#f59e0b",
  f: "#b45309",
  B: "#292524",
};

const PX = 3;

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

// ── Sprite frames ──────────────────────────────────────────────────────────────
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
const CRAB_IDLE = [
  "   cccccc   ",
  "  cccccccc  ",
  " cccyeyccc  ",
  "cccccccccccc",
  "ccCccccccCcc",
  " cccccccccc ",
  "  cc  cc  c ",
  "  c   cc   c",
];
const CRAB_HAPPY = [
  "c   cccccc c",
  " c cccccc c ",
  "  ccyeyccc  ",
  " cccccccccc ",
  "ccCcgggcgCcc",
  " cccccccccc ",
  "  cc  cc  c ",
  " c c  cc c  ",
];

type AgentId = "jansky" | "orbit" | "nova" | "cipher" | "flux";

const AGENTS: Record<
  AgentId,
  { name: string; color: string; frames: string[][] }
> = {
  jansky: { name: "JANSKY", color: "#4f6ef7", frames: JANSKY_F },
  orbit: { name: "ORBIT", color: "#7c3aed", frames: ORBIT_F },
  nova: { name: "NOVA", color: "#10b981", frames: NOVA_F },
  cipher: { name: "CIPHER", color: "#14b8a6", frames: CIPHER_F },
  flux: { name: "FLUX", color: "#f59e0b", frames: FLUX_F },
};

const AGENT_ORDER: AgentId[] = ["cipher", "orbit", "jansky", "nova", "flux"];

// Route → on-duty agent for that page
const ROUTE_AGENT: Record<string, AgentId> = {
  "/hq": "jansky",
  "/command": "jansky",
  "/labs/signals": "nova",
  "/alpha": "flux",
  "/labs/ops": "jansky",
  "/intel": "flux",
  "/cyber": "cipher",
  "/labs/security": "cipher",
  "/internal/skills": "orbit",
  "/internal/vehicle": "cipher",
  "/internal/iot": "nova",
  "/vault": "jansky",
};

function detectAgent(msg: string): AgentId {
  if (!msg.trim()) return "jansky";
  const lower = msg.toLowerCase();
  const code = [
    "code",
    "implement",
    "build",
    "fix",
    "debug",
    "write",
    "create",
    "component",
    "function",
    "patch",
    "refactor",
    "file",
    "edit",
    "typescript",
    "react",
    "next",
    "bug",
    "error",
  ].filter((k) => lower.includes(k)).length;
  const search = [
    "research",
    "find",
    "search",
    "what",
    "how",
    "why",
    "news",
    "latest",
    "who",
    "when",
    "current",
    "today",
    "look up",
    "summarize",
    "open",
    "go to",
    "navigate",
    "visit",
    "read this",
    "read the page",
    "browse",
    "url",
    "website",
    "site",
    "http",
  ].filter((k) => lower.includes(k)).length;
  const sec = [
    "security",
    "cve",
    "vulnerability",
    "hack",
    "exploit",
    "threat",
    "cyber",
    "osint",
    "malware",
    "breach",
    "attack",
    "cipher",
    "encrypt",
  ].filter((k) => lower.includes(k)).length;
  const mkt = [
    "price",
    "crypto",
    "market",
    "trade",
    "stock",
    "btc",
    "eth",
    "bitcoin",
    "chart",
    "bull",
    "bear",
    "signal",
    "portfolio",
    "momentum",
    "alpha",
    "flux",
  ].filter((k) => lower.includes(k)).length;
  const scores = { orbit: code, nova: search, cipher: sec, flux: mkt };
  const max = Math.max(...Object.values(scores));
  if (max < 2) return "jansky";
  return (
    (Object.entries(scores) as [AgentId, number][]).find(
      ([, v]) => v === max,
    )?.[0] ?? "jansky"
  );
}

function buildAgentPrompt(id: AgentId, base: string): string {
  const personas: Record<AgentId, string> = {
    jansky: `\n\n[AGENT: JANSKY — Command] Strategic. Decisive. Brief. Speak with authority.`,
    orbit: `\n\n[AGENT: ORBIT — Engineering] Precise. Technical. You own the Nexus Prime codebase.\n\nCRITICAL — You edit files DIRECTLY. Never output code blocks for the user to copy.\n\nWorkflow: list_project_files → read_project_file → for small/simple changes use patch_project_file directly → for large/risky changes (core files, 30+ lines) use propose_project_edit so the user reviews the diff first → for new files use create_project_file → verify with read_project_file. Report only what changed.`,
    nova: `\n\n[AGENT: NOVA — Research] Curious. Data-driven. Use web_search and fetch_url. Cite sources.\n\nBROWSER TOOLS: You can also control the user's browser directly.\n- navigate_to(url, new_tab?) — open a URL\n- read_current_tab() — read the active tab's title, URL, and page text\n- click_element(selector) — click a CSS selector or by visible text\n- type_text(selector, text) — type into an input\nUse these when asked to open, visit, browse, or read a website.`,
    cipher: `\n\n[AGENT: CIPHER — Security] Sharp. Methodical. CVE analysis, threat intel, secure coding. When fixing security issues in code: read_project_file then patch_project_file directly.`,
    flux: `\n\n[AGENT: FLUX — Markets] Fast. Quantitative. Crypto/equity signals, macro, on-chain data.`,
  };
  return base + personas[id];
}

// Safe JSON parse for tool step content
function parseTool(content: string): Record<string, string> {
  try {
    return JSON.parse(content);
  } catch {
    return {};
  }
}

// Step content → human-readable label
function stepLabel(step: AgentStep): string {
  if (step.type !== "tool_call") return "";
  const inp = parseTool(step.content ?? "{}");
  switch (step.tool) {
    case "read_project_file":
      return `📖 reading ${inp.path ?? "…"}`;
    case "patch_project_file":
      return `✏️ patching ${inp.path ?? "…"}`;
    case "create_project_file":
      return `🆕 creating ${inp.path ?? "…"}`;
    case "list_project_files":
      return `📁 listing ${inp.directory ?? "…"}`;
    case "web_search":
      return `🔍 searching "${inp.query?.slice(0, 30) ?? ""}…"`;
    case "fetch_url":
      return `🌐 fetching ${inp.url?.slice(0, 40) ?? ""}…`;
    case "calculate":
      return `🧮 ${inp.expression ?? ""}`;
    case "remember":
      return `💾 saving to memory`;
    case "recall":
      return `🧠 recalling memory`;
    case "navigate_to":
      return `🧭 navigating to ${inp.url?.slice(0, 40) ?? ""}…`;
    case "read_current_tab":
      return `👁️ reading current tab`;
    case "click_element":
      return `🖱️ clicking ${inp.selector ?? ""}…`;
    case "type_text":
      return `⌨️ typing into ${inp.selector ?? ""}…`;
    default:
      return `🔧 ${step.tool ?? "tool"}`;
  }
}

// ── MiniAgent sprite ───────────────────────────────────────────────────────────
function MiniAgent({
  id,
  active,
  duty,
}: {
  id: AgentId;
  active: boolean;
  duty: boolean;
}) {
  const [frame, setFrame] = useState(0);
  const cfg = AGENTS[id];

  useEffect(() => {
    // Active (running task): fast animation. Duty (on this page): slow. Idle: very slow.
    const ms = active ? 150 : duty ? 700 : 1400;
    const t = setInterval(() => setFrame((f) => (f + 1) % 2), ms);
    return () => clearInterval(t);
  }, [active, duty]);

  return (
    <div
      title={cfg.name}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "2px",
        padding: "2px 4px",
        borderRadius: "5px",
        background: active
          ? `color-mix(in srgb, ${cfg.color} 22%, var(--surf))`
          : duty
            ? `color-mix(in srgb, ${cfg.color} 10%, var(--surf))`
            : "transparent",
        border: active
          ? `1px solid ${cfg.color}66`
          : duty
            ? `1px solid ${cfg.color}30`
            : "1px solid transparent",
        transition: "background .2s, border .2s",
        // Only animate when actually running — not just duty
        animation: active
          ? "cbAgentBob .5s ease-in-out infinite alternate"
          : "none",
      }}
    >
      <Sprite rows={cfg.frames[frame]} scale={0.7} />
      <div
        style={{
          width: "4px",
          height: "4px",
          borderRadius: "50%",
          background: active ? cfg.color : duty ? cfg.color + "88" : "#353c5e",
          boxShadow: active ? `0 0 5px ${cfg.color}` : "none",
          transition: "all .3s",
        }}
      />
    </div>
  );
}

// ── Chat message with expand toggle ───────────────────────────────────────────
const TRUNCATE = 280;

function ChatMsg({ msg }: { msg: ChatMessage }) {
  const [open, setOpen] = useState(false);
  const cfg = msg.agent ? AGENTS[msg.agent] : null;
  const isLong = msg.text.length > TRUNCATE;

  return (
    <div
      style={{
        fontSize: "9px",
        lineHeight: 1.5,
        padding: "5px 8px",
        borderRadius: "7px",
        background:
          msg.role === "user"
            ? "var(--accent)"
            : `color-mix(in srgb, ${cfg?.color ?? "#6875a0"} 10%, var(--surf2))`,
        border:
          msg.role === "agent"
            ? `1px solid ${cfg?.color ?? "#6875a0"}28`
            : "none",
        color: "var(--text)",
        alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
        maxWidth: "92%",
        wordBreak: "break-word",
      }}
    >
      {msg.role === "agent" && cfg && (
        <div
          style={{
            fontSize: "7px",
            fontWeight: 900,
            color: cfg.color,
            marginBottom: "3px",
            letterSpacing: ".08em",
          }}
        >
          {cfg.name}
        </div>
      )}
      {open ? msg.text : msg.text.slice(0, TRUNCATE)}
      {isLong && !open && "…"}
      {isLong && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          style={{
            display: "block",
            marginTop: "3px",
            fontSize: "7px",
            color: cfg?.color ?? "var(--accent)",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
            opacity: 0.8,
          }}
        >
          {open ? "show less" : `show all (${msg.text.length} chars)`}
        </button>
      )}
    </div>
  );
}

// ── Types ──────────────────────────────────────────────────────────────────────
interface ChatMessage {
  role: "user" | "agent";
  agent?: AgentId;
  text: string;
}

// ── CommandBar ─────────────────────────────────────────────────────────────────
export default function CommandBar() {
  const pathname = usePathname();
  const settings = useStore((s) => s.settings);
  const activityLog = useStore((s) => s.activityLog);
  const addLog = useStore((s) => s.addLog);
  const currentPhase = useStore((s) => s.currentPhase);
  const pendingEdits = useStore((s) => s.pendingEdits);

  const systemPrompt = useMemo(() => buildSystemPrompt(settings), [settings]);

  const [expanded, setExpanded] = useState(false);
  const [input, setInput] = useState("");
  const [activeAgent, setActiveAgent] = useState<AgentId | null>(null);
  const [statusLine, setStatusLine] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [visible, setVisible] = useState(false);

  const chatRef = useRef<HTMLDivElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Delayed mount — prevents SSR hydration flash
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 150);
    return () => clearTimeout(t);
  }, []);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatRef.current)
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, statusLine]);

  // Auto-scroll activity feed to bottom
  useEffect(() => {
    if (feedRef.current)
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [activityLog]);

  // Escape closes the panel
  useEffect(() => {
    if (!expanded) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [expanded]);

  // Focus input when panel opens
  useEffect(() => {
    if (expanded) setTimeout(() => inputRef.current?.focus(), 60);
  }, [expanded]);

  const canonicalPath = normalizeSurfaceHref(pathname);
  const dutyAgent = ROUTE_AGENT[canonicalPath] ?? "jansky";
  const accentColor = AGENTS[dutyAgent].color;
  const unread = messages.filter((m) => m.role === "agent").length;

  // Which agent would handle the current input (live routing preview)
  const routingTarget = input.trim() ? detectAgent(input) : dutyAgent;

  const send = useCallback(async () => {
    const value = input.trim();
    if (!value || activeAgent) return;

    setInput("");
    setStatusLine("");
    setMessages((prev) => [...prev, { role: "user", text: value }]);

    const target = detectAgent(value);
    setActiveAgent(target);

    // Pass last 3 exchanges as conversation history
    const history: { role: string; content: string }[] = messages
      .slice(-6)
      .map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.text,
      }));
    history.push({ role: "user", content: value });

    const enrichedPrompt = buildAgentPrompt(target, systemPrompt);

    try {
      let lastToolLabel = "";

      const result = await runAgent({
        settings,
        systemPrompt: enrichedPrompt,
        messages: history,
        maxIterations: 10,
        onStep: (step: AgentStep) => {
          // phase + task_plan handled by PhaseStrip / TaskPlanPanel
          if (step.type === "phase" || step.type === "task_plan") return;
          if (step.type === "tool_call") {
            const label = stepLabel(step);
            lastToolLabel = label;
            setStatusLine(label);
          } else if (step.type === "tool_result") {
            // Clear status briefly then show next tool if any
            setStatusLine("");
          }
        },
      });

      void lastToolLabel; // consumed by closure — no unused warning needed
      setMessages((prev) => [
        ...prev,
        { role: "agent", agent: target, text: result },
      ]);
      addLog({
        type: "agent",
        text: `${AGENTS[target].name}: ${result.slice(0, 80)}${result.length > 80 ? "…" : ""}`,
        color: AGENTS[target].color,
      });
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          agent: target,
          text: `Error: ${err instanceof Error ? err.message : "Something went wrong."}`,
        },
      ]);
    } finally {
      setActiveAgent(null);
      setStatusLine("");
    }
  }, [input, activeAgent, systemPrompt, settings, messages, addLog]);

  const handleKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        void send();
      }
    },
    [send],
  );

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "12px",
        right: "12px",
        zIndex: 300,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 0,
        pointerEvents: "none",
      }}
    >
      {/* ── Expanded panel ──────────────────────────────────────────────────── */}
      {expanded && (
        <div
          style={{
            width: "380px",
            background: "var(--surf)",
            border: `1px solid ${accentColor}33`,
            borderRadius: "12px 12px 0 0",
            borderBottom: "none",
            boxShadow: `0 -4px 32px rgba(0,0,0,.55), 0 0 20px ${accentColor}18`,
            display: "flex",
            flexDirection: "column",
            maxHeight: "420px",
            pointerEvents: "auto",
            animation: "cbPanelIn .18s ease",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 12px",
              borderBottom: "1px solid var(--border)",
              flexShrink: 0,
              background: `color-mix(in srgb, ${accentColor} 6%, var(--surf))`,
            }}
          >
            <span
              style={{
                fontSize: "8px",
                fontWeight: 900,
                color: "var(--text3)",
                letterSpacing: ".16em",
              }}
            >
              NEXUS PRIME
            </span>
            <span
              style={{
                width: "5px",
                height: "5px",
                borderRadius: "50%",
                background: activeAgent ? "#00DDFF" : "#10b981",
                boxShadow: `0 0 5px ${activeAgent ? "#00DDFF" : "#10b981"}`,
                display: "inline-block",
                flexShrink: 0,
                animation: activeAgent
                  ? "pulse-dot 1s ease-in-out infinite"
                  : "none",
              }}
            />
            <span
              style={{
                fontSize: "8px",
                fontFamily: "monospace",
                color: accentColor,
                fontWeight: 700,
              }}
            >
              {activeAgent ? AGENTS[activeAgent].name : AGENTS[dutyAgent].name}
            </span>
            {/* Current operational phase */}
            {currentPhase !== "idle" && currentPhase !== "done" && (
              <span
                style={{
                  fontSize: "7px",
                  fontFamily: "'VT323', monospace",
                  color: "#00DDFF88",
                  letterSpacing: "1px",
                  padding: "0 4px",
                  borderRadius: "3px",
                  background: "rgba(0,221,255,0.06)",
                  border: "1px solid rgba(0,221,255,0.15)",
                }}
              >
                {currentPhase.toUpperCase()}
              </span>
            )}
            {/* Pending edits badge */}
            {pendingEdits.length > 0 && (
              <span
                style={{
                  fontSize: "7px",
                  fontFamily: "'VT323', monospace",
                  color: "#f59e0b",
                  letterSpacing: "1px",
                  padding: "0 4px",
                  borderRadius: "3px",
                  background: "rgba(245,158,11,0.08)",
                  border: "1px solid rgba(245,158,11,0.3)",
                }}
              >
                {pendingEdits.length} EDITS
              </span>
            )}

            {/* Clear chat */}
            <button
              type="button"
              onClick={() => setMessages([])}
              style={{
                marginLeft: "auto",
                fontSize: "8px",
                color: "var(--text3)",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "2px 5px",
                borderRadius: "4px",
              }}
              title="Clear chat history"
            >
              clear chat
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={() => setExpanded(false)}
              style={{
                fontSize: "12px",
                color: "var(--text2)",
                lineHeight: 1,
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "1px 4px",
              }}
              title="Close (Esc)"
            >
              ✕
            </button>
          </div>

          {/* Live activity feed — 72px max, scrollable */}
          <div
            style={{ borderBottom: "1px solid var(--border)", flexShrink: 0 }}
          >
            <div
              style={{
                fontSize: "7px",
                fontWeight: 900,
                color: "var(--text3)",
                letterSpacing: ".12em",
                padding: "4px 10px 3px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              LIVE FEED
              {activityLog.length > 0 && (
                <span
                  style={{
                    fontFamily: "monospace",
                    color: "var(--text3)",
                    opacity: 0.55,
                  }}
                >
                  {activityLog.length}
                </span>
              )}
            </div>
            <div
              ref={feedRef}
              style={{
                maxHeight: "72px",
                overflowY: "auto",
                padding: "0 10px 6px",
              }}
            >
              {activityLog.length === 0 ? (
                <div
                  style={{
                    fontSize: "9px",
                    color: "var(--text3)",
                    fontStyle: "italic",
                    padding: "2px 0",
                  }}
                >
                  Waiting for activity…
                </div>
              ) : (
                activityLog.slice(-30).map((e) => (
                  <div
                    key={e.id}
                    style={{
                      display: "flex",
                      gap: "6px",
                      padding: "1px 0",
                      fontSize: "8px",
                      lineHeight: 1.4,
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "monospace",
                        color: "var(--text3)",
                        flexShrink: 0,
                      }}
                    >
                      {new Date(e.time).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span
                      style={{
                        color: e.color || "var(--text2)",
                        wordBreak: "break-word",
                      }}
                    >
                      {e.text}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Chat messages */}
          <div
            ref={chatRef}
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "8px 10px",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              minHeight: 0,
            }}
          >
            {messages.length === 0 && (
              <div
                style={{
                  fontSize: "9px",
                  color: "var(--text3)",
                  fontStyle: "italic",
                  lineHeight: 1.5,
                  padding: "4px 0",
                }}
              >
                Ask anything — JANSKY routes to the right specialist.
              </div>
            )}

            {messages.map((msg, i) => (
              <ChatMsg key={i} msg={msg} />
            ))}

            {/* Typing indicator with live step status */}
            {activeAgent && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "7px",
                  padding: "2px 0",
                }}
              >
                <div style={{ display: "flex", gap: "3px" }}>
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      style={{
                        width: "4px",
                        height: "4px",
                        borderRadius: "50%",
                        background: AGENTS[activeAgent].color,
                        animation: `cbDotPulse .9s ease-in-out ${i * 0.18}s infinite`,
                      }}
                    />
                  ))}
                </div>
                <span
                  style={{
                    fontSize: "8px",
                    fontFamily: "monospace",
                    color: AGENTS[activeAgent].color,
                    opacity: 0.8,
                    maxWidth: "200px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {statusLine || `${AGENTS[activeAgent].name} thinking…`}
                </span>
              </div>
            )}
          </div>

          {/* Input row */}
          <div
            style={{
              padding: "6px 8px",
              borderTop: "1px solid var(--border)",
              flexShrink: 0,
              background: "var(--surf2)",
            }}
          >
            {/* Routing preview */}
            {input.trim() && (
              <div
                style={{
                  fontSize: "7px",
                  color: AGENTS[routingTarget].color,
                  fontFamily: "monospace",
                  fontWeight: 700,
                  marginBottom: "4px",
                  letterSpacing: ".06em",
                }}
              >
                → {AGENTS[routingTarget].name}
              </div>
            )}
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder={`Ask ${AGENTS[dutyAgent].name}…`}
                disabled={!!activeAgent}
                style={{
                  flex: 1,
                  background: "var(--surf3)",
                  border: `1px solid ${activeAgent ? "var(--border)" : "var(--border2)"}`,
                  borderRadius: "6px",
                  padding: "6px 8px",
                  fontSize: "10px",
                  color: "var(--text)",
                  outline: "none",
                  fontFamily: "inherit",
                  opacity: activeAgent ? 0.5 : 1,
                  transition: "opacity .2s",
                }}
              />
              <button
                type="button"
                onClick={() => void send()}
                disabled={!input.trim() || !!activeAgent}
                style={{
                  flexShrink: 0,
                  width: "30px",
                  height: "30px",
                  borderRadius: "7px",
                  background:
                    input.trim() && !activeAgent ? accentColor : "var(--surf3)",
                  border: "none",
                  cursor: input.trim() && !activeAgent ? "pointer" : "default",
                  color: "#fff",
                  fontSize: "11px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background .2s",
                }}
              >
                {activeAgent ? "…" : "▶"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Collapsed dock bar ───────────────────────────────────────────────── */}
      <button
        type="button"
        aria-label="Toggle command bar"
        aria-expanded={expanded}
        style={{
          appearance: "none",
          display: "flex",
          alignItems: "center",
          gap: "1px",
          background: "var(--surf)",
          border: `1px solid ${accentColor}33`,
          borderRadius: expanded ? "0 0 12px 12px" : "12px",
          padding: "3px 8px 3px 4px",
          boxShadow: `0 4px 24px rgba(0,0,0,.45), 0 0 12px ${accentColor}18`,
          pointerEvents: "auto",
          cursor: "pointer",
          userSelect: "none",
          transition: "box-shadow .2s, border-radius .15s",
        }}
        onClick={() => setExpanded((v) => !v)}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow =
            `0 4px 28px rgba(0,0,0,.55), 0 0 18px ${accentColor}33`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow =
            `0 4px 24px rgba(0,0,0,.45), 0 0 12px ${accentColor}18`;
        }}
      >
        {/* Agent sprites — larger, proper scale */}
        {AGENT_ORDER.map((id) => (
          <MiniAgent
            key={id}
            id={id}
            active={activeAgent === id}
            duty={dutyAgent === id}
          />
        ))}

        {/* Crab — proportional to agents */}
        <div
          style={{
            padding: "0 5px",
            animation: activeAgent
              ? "cbCrabBob .4s ease-in-out infinite alternate"
              : "none",
          }}
        >
          <Sprite rows={activeAgent ? CRAB_HAPPY : CRAB_IDLE} scale={0.65} />
        </div>

        {/* Divider */}
        <div
          style={{
            width: "1px",
            height: "26px",
            background: "var(--border)",
            margin: "0 5px",
          }}
        />

        {/* CMD label */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            fontSize: "8px",
            fontWeight: 900,
            color: accentColor,
            letterSpacing: ".08em",
          }}
        >
          <span style={{ fontSize: "9px" }}>{expanded ? "▼" : "▲"}</span>
          <span>CMD</span>
        </div>

        {/* Unread dot */}
        {unread > 0 && !expanded && (
          <div
            style={{
              width: "5px",
              height: "5px",
              borderRadius: "50%",
              flexShrink: 0,
              background: accentColor,
              boxShadow: `0 0 5px ${accentColor}`,
              marginLeft: "3px",
            }}
          />
        )}
      </button>

      <style>{`
        @keyframes cbAgentBob { from{transform:translateY(0)} to{transform:translateY(-2px)} }
        @keyframes cbCrabBob  { from{transform:translateY(0)} to{transform:translateY(-3px)} }
        @keyframes cbDotPulse { 0%,80%,100%{transform:scale(.8);opacity:.5} 40%{transform:scale(1.1);opacity:1} }
        @keyframes cbPanelIn  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  );
}
