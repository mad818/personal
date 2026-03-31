"use client";

// ── CrabMascot.tsx ────────────────────────────────────────────────────────────
// The crab mascot displayed in the left panel's CLAW STATUS section.
// Reacts visually to the current system emotion: colour glow changes,
// animation changes, and a label below shows a plain-English status.
// The crab blinks by switching between its current frame and 'idle' every 600 ms
// — but only while it's in the 'thinking' state to simulate hesitation.

import { useState, useEffect } from "react";
import { Sprite } from "./palette";
import { CRAB } from "./sprites";
import type { Emotion } from "./types";

// ── Label map — one short status string per emotion
const LABEL: Record<Emotion, string> = {
  idle: "💤 Standby",
  thinking: "🤔 Routing",
  happy: "😄 Ready",
  working: "⚡ On it",
  excited: "🎉 Let's go!",
  error: "❌ Error",
  success: "✅ Done!",
};

// ── Glow map — radial background colour per emotion
const GLOW: Record<Emotion, string> = {
  idle: "#4f6ef722",
  thinking: "#f59e0b33",
  happy: "#10b98133",
  working: "#7c3aed33",
  excited: "#f59e0b44",
  error: "#ef444433",
  success: "#10b98144",
};

interface CrabMascotProps {
  emotion: Emotion;
}

export function CrabMascot({ emotion }: CrabMascotProps) {
  // blink toggles every 600 ms — used to flicker between idle and thinking frames
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setBlink((v) => !v), 600);
    return () => clearInterval(id);
  }, [emotion]); // reset interval whenever emotion changes

  // The crab bobs on happy/working/excited; bounces on success; still otherwise
  const bobAnim =
    emotion === "excited" || emotion === "working"
      ? "crabBob .35s ease-in-out infinite alternate"
      : emotion === "success"
        ? "crabBob .25s ease-in-out 4"
        : "none";

  // While thinking, alternate between the thinking frame and idle for a blink effect
  const frame = blink && emotion === "thinking" ? "idle" : emotion;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "4px",
      }}
    >
      {/* Glow container — colour matches emotion */}
      <div
        style={{
          padding: "8px",
          borderRadius: "10px",
          background: GLOW[emotion],
          border: `1px solid ${GLOW[emotion].slice(0, -2)}66`, // slightly more opaque border
          animation: bobAnim,
          transition: "background .3s, border .3s",
        }}
      >
        <Sprite rows={CRAB[frame]} scale={1.3} />
      </div>

      {/* Status label below the crab */}
      <span
        style={{
          fontSize: "8px",
          color: "var(--text3)",
          fontWeight: 700,
          whiteSpace: "nowrap",
        }}
      >
        {LABEL[emotion]}
      </span>
    </div>
  );
}
