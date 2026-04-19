import type { CSSProperties } from "react";

const ROOT_STYLE: CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 0,
  pointerEvents: "none",
  overflow: "hidden",
};

const FOCUS_STYLE: CSSProperties = {
  position: "absolute",
  inset: 0,
  background:
    "radial-gradient(ellipse 80% 60% at 50% 32%, color-mix(in srgb, var(--accent) 6%, transparent) 0%, transparent 70%)",
};

const DRIFT_STYLE: CSSProperties = {
  position: "absolute",
  inset: "-10%",
  width: "120%",
  height: "120%",
  background:
    "linear-gradient(135deg, color-mix(in srgb, var(--accent) 4%, transparent) 0%, transparent 50%, color-mix(in srgb, var(--accent2) 3%, transparent) 100%)",
  animation: "nexus-ambient-drift 24s var(--ease-standard) infinite",
  willChange: "transform",
};

const GRID_SVG =
  'url("data:image/svg+xml;utf8,' +
  "<svg xmlns=%27http://www.w3.org/2000/svg%27 width=%2740%27 height=%2740%27>" +
  "<path d=%27M0 0H40M0 0V40%27 stroke=%27%23293247%27 stroke-width=%271%27 fill=%27none%27/>" +
  '</svg>")';

const GRID_STYLE: CSSProperties = {
  position: "absolute",
  inset: 0,
  backgroundImage: GRID_SVG,
  backgroundRepeat: "repeat",
  opacity: 0.04,
};

const VEIL_STYLE: CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "var(--bg)",
  opacity: "calc(var(--nexus-atmosphere-veil-opacity))",
};

export default function AtmosphereLayer() {
  return (
    <div
      aria-hidden="true"
      className="nexus-landing-atmosphere"
      style={ROOT_STYLE}
    >
      <div className="nexus-landing-atmosphere__focus" style={FOCUS_STYLE} />
      <div className="nexus-landing-atmosphere__drift" style={DRIFT_STYLE} />
      <div className="nexus-landing-atmosphere__grid" style={GRID_STYLE} />
      <div className="nexus-landing-atmosphere__veil" style={VEIL_STYLE} />
    </div>
  );
}
