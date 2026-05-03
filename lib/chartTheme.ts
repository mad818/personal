// ── HOMEFRONT Chart Theme ────────────────────────────────────────────────────
// Command-shell palette — steel, cyan, amber, and signal tones
// Shared constants for all Recharts + custom SVG visualizations

export const CHART = {
  // Primary palette
  burgundy: "#0f172a",
  rose: "#22d3ee",
  gold: "#f59e0b",
  blush: "#bae6fd",
  bg: "#050b14",

  // Extended data viz colors (harmonious with theme)
  teal: "#2dd4bf",
  cyan: "#22d3ee",
  violet: "#a78bfa",
  amber: "#f59e0b",
  emerald: "#10b981",
  red: "#ef4444",
  sky: "#38bdf8",
  pink: "#ec4899",
  lime: "#84cc16",
  orange: "#f97316",

  // Surfaces
  surf: "#0b1220",
  surf2: "#101826",
  surf3: "#172033",
  border: "#1e293b",
  border2: "#334155",

  // Text
  text: "#e2e8f0",
  text2: "#cbd5e1",
  text3: "#94a3b8",

  // Semantic
  up: "#10b981",
  down: "#ef4444",
  neutral: "#f59e0b",
} as const;

// Series color rotation for multi-line/bar charts
export const SERIES_COLORS = [
  CHART.rose,
  CHART.gold,
  CHART.teal,
  CHART.violet,
  CHART.cyan,
  CHART.amber,
  CHART.emerald,
  CHART.sky,
  CHART.pink,
  CHART.lime,
] as const;

// Recharts common axis/grid/tooltip styles
export const AXIS_STYLE = {
  fontSize: 10,
  fontFamily: "monospace",
  fill: CHART.text3,
};

export const GRID_STYLE = {
  stroke: CHART.border,
  strokeDasharray: "3 3",
};

export const TOOLTIP_STYLE = {
  contentStyle: {
    background: CHART.surf2,
    border: `1px solid ${CHART.border2}`,
    borderRadius: "8px",
    padding: "8px 12px",
    fontSize: "11px",
    fontFamily: "monospace",
    color: CHART.text,
    boxShadow: `0 8px 32px ${CHART.bg}cc`,
  },
  itemStyle: { color: CHART.text2, fontSize: "10px", padding: "1px 0" },
  labelStyle: { color: CHART.text, fontWeight: 700, marginBottom: "4px" },
  cursor: { fill: `${CHART.rose}11` },
};

// Glow filter for SVG charts
export const GLOW_FILTER = `
  <defs>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
    <filter id="glow-sm" x="-10%" y="-10%" width="120%" height="120%">
      <feGaussianBlur stdDeviation="1.5" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
`;

// Animated pulse keyframes (inject once in layout)
export const PULSE_CSS = `
@keyframes nex-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
@keyframes nex-sweep {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
@keyframes nex-glow {
  0%, 100% { box-shadow: 0 0 4px var(--accent); }
  50% { box-shadow: 0 0 16px var(--accent), 0 0 32px rgba(196,72,90,0.3); }
}
@keyframes nex-scan {
  0% { transform: translateY(-100%); }
  100% { transform: translateY(100%); }
}
@keyframes nex-ring {
  0% { stroke-dashoffset: 283; }
  100% { stroke-dashoffset: 0; }
}
@keyframes nex-float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-6px); }
}
@keyframes nex-fade-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
`;
